# MyComicStory — Architecture & Status Summary
*Stand: 1. Mai 2026 (Abend)*

## Overview

A web app that generates personalized comic books from user stories and family photos.
Users describe moments (e.g. "vacation in Tunisia with grandparents"), upload a family photo,
and the app generates a full comic book with consistent characters, speech bubbles, and a cover.

---

## Architecture

```
User (Browser / Vercel Frontend)
    ↓ Upload photo → /api/upload (Next.js API Route)
Supabase Storage (bucket: comic-panels)
    ↓ Returns persistent URL

User starts generation
    ↓ POST /api/comic/structure + /ending (parallel)
Railway Backend (Node.js Orchestrator)
    ↓ GPT-4.1: 1 call per story moment → page structure
    ↓ GPT-4.1: character extraction from story text
    ↓ GPT-4.1 Vision: photo analysis → who is in the photo?
    ↓ Characters with visual_anchors → Supabase character_ref_image table

    ↓ POST /api/comic/cover (sequential — must finish before pages)
    ↓ images.edit() with user photo → cover image
    ↓ Cover URL → Supabase

    ↓ POST /api/comic/page × N (batches of 3, parallel)
    ↓ Cover as reference (for characters in photo)
    ↓ User photo as style reference (for grandparents not in photo)
    ↓ Pages → Supabase last_page_image table
```

---

## Tech Stack

| Component | Technology | Purpose |
|---|---|---|
| Frontend | Next.js 15 / Vercel | Wizard, Preview, Speech bubbles |
| Backend | Node.js / Railway | Orchestration, prompts, API calls |
| Image generation | gpt-image-2 | Cover + comic pages |
| Text/Structure | GPT-4.1 | Story structure, character extraction |
| Storage | Supabase Storage | Photos, generated images |
| Database | Supabase PostgreSQL | character_ref_image, last_page_image |

---

## Prompt Strategy

```
COMIC_STYLE (Konstante, überall genutzt):
"EUROPEAN BANDE DESSINÉE ILLUSTRATION — Franco-Belgian comic book style,
similar to Blacksad or Bastien Vivès.
Bold clean ink outlines, flat cel-shaded colors.
STRICT PROHIBITION: NOT manga. NOT anime. NOT photorealistic.
Every page IDENTICAL in style."

+ MOOD_MOD (per comicStyle: action / emotional / humor)
+ visual_anchors (per Charakter, aus Foto analysiert oder aus Story generiert)
+ outfit context (aus page.location auf Englisch erkannt)
+ panel descriptions (aus Story-Momenten, 1 GPT-Call pro Moment)
+ "ONLY SHOW CHARACTERS PRESENT IN THIS SCENE" (Fix 1. Mai)
```

---

## Key Design Decisions

### 1. One GPT call per story moment
Instead of asking GPT to generate all 7 pages at once (which caused mixing/skipping moments),
each moment gets its own GPT-4.1 call. This guarantees exactly one page per moment.

### 2. Photo analysis: who is in the photo?
GPT-4.1 Vision analyzes the uploaded family photo and determines which characters are visible
based on age and count. Characters IN the photo get visual_anchors from the photo.
Characters NOT in the photo (e.g. grandparents) get visual_anchors generated from the story description.

### 3. Reference image strategy per page
- Characters all in photo → use **cover** as images.edit() reference (consistent comic style)
- Page contains characters NOT in photo → use **user photo** as style-only reference
  (prompt explicitly says: "use photo for style only, draw characters from descriptions")
- Safety block (e.g. child falling) → retry with user photo as style reference
- All fallbacks → retry once after 20s on rate limit (429)

### 4. Cover generation
Cover uses images.edit() with user photo → faces recognizable but slightly photorealistic.
This is an intentional trade-off: realistic faces vs. pure comic style.
All subsequent pages use the cover as reference → consistent style across pages.

### 5. Supabase as memory
- `character_ref_image`: stores visual_anchors + cover_url + inPhoto flag per character
- `last_page_image`: stores each generated page with ref_source
- On regeneration: if visual_anchors missing from store → loaded from Supabase
- Supabase Storage: user photos stored as persistent URLs (no base64 in API calls)

---

## Open Challenges

### 1. Stil-Inkonsistenz
- **Cover**: `images.edit()` mit User-Foto → leicht fotorealistisch
- **Seiten mit Foto-Charakteren**: Cover als Referenz → guter Comic-Stil
- **Opa/Oma-Seiten**: User-Foto als Stil-Referenz (`user-photo-style`) → manchmal aquarellverwaschen
- **Safety-Block-Seiten** (z.B. Fußball/Jubel): Fallback auf `generate-only` → manchmal Manga-Stil
- **Fix deployed (1. Mai):** `COMIC_STYLE` mit `STRICT PROHIBITION: NOT manga. NOT anime.` + Bande Dessinée Referenz
- **Nächste Eskalation wenn nötig:** Style-Master-Panel (siehe BACKLOG.md)

### 2. Charakter-Konsistenz
- Papa/Mama sehen auf verschiedenen Seiten unterschiedlich aus
- `images.edit()` interpretiert Referenzbild bei jedem Call leicht anders
- Keine mathematische Gesichts-Konsistenz (kein face embedding implementiert)
- `visual_anchors` helfen aber garantieren keine Pixel-Konsistenz
- **Teilweise gelöst:** Supabase lädt `visual_anchors` bei Regenerierung nach

### 3. Geschwindigkeit
- ~12 Minuten für 7 Seiten
- OpenAI Tier 1: max 5 Images/Minute, 1 concurrent request
- Cover ist sequenziell → blockiert Seiten-Start
- Würde sich bei Tier 2 ($50+ geladen) deutlich verbessern (5 IPM → 50 IPM)

### 4. Kleidung
- `detectOutfitContext()` funktioniert für Beach/Airport/Garden/Home
- Kein Gedächtnis über Seiten hinweg (kein `outfit_state` in Supabase)
- Charaktere tragen manchmal gleiche Kleidung in verschiedenen Kontexten

---

## Supabase Schema

```sql
-- Character references (visual descriptions + cover URL)
CREATE TABLE character_ref_image (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  character_name TEXT NOT NULL,
  character_age INT,
  visual_anchor TEXT,
  cover_url TEXT,
  in_photo BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Generated pages with quality tracking
CREATE TABLE last_page_image (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  page_number INT NOT NULL,
  image_url TEXT NOT NULL,
  characters_present TEXT[],
  quality_score INT DEFAULT 0,
  ref_source TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id, page_number)
);
```

---

## What Works Well

- Alle 7 Story-Momente werden zu separaten Seiten ✅
- Opa/Oma erscheinen korrekt (aus Story-Beschreibung generiert) ✅
- Cover zeigt alle 6 Charaktere inkl. Großeltern ✅
- Sprechblasen: hinzufügen, löschen, ziehen, skalieren, Sprecher editieren ✅
- Supabase: Fotos, Cover, Seiten, visual_anchors gespeichert ✅
- Retry bei Rate Limit (429) ✅
- visual_anchors aus Supabase bei Regenerierung ✅
- Outfit-Kontext-Erkennung (Beach/Airport/Garden/Home) ✅
- Seitentitel über dem Bild (nicht im Bild) ✅
- Einheitliches 2:3 Format über alle Seiten ✅
- Opa/Oma erscheinen nicht mehr beim Abflug (Fix 1. Mai) ✅
- Anti-Manga: STRICT PROHIBITION in COMIC_STYLE (Fix 1. Mai) ✅

---

## Next Steps (Priorisiert)

1. **Test-Run** — Tunesien-Comic neu generieren, Grillen/Fußball-Stil prüfen
2. **Style-Master-Panel** — wenn Manga-Problem nach Test noch besteht (siehe BACKLOG.md)
3. **"Neu illustrieren" mit Freitextfeld** — User kann konkrete Änderungen angeben (siehe BACKLOG.md)
4. **outfit_state Tabelle** — Kleidung pro Charakter pro Kontext über Seiten merken
5. **Quality Score** — GPT-4o Vision Check nach jeder Seite, Retry wenn Score < 70
6. **UI/UX Redesign** — Ruhigerer Wizard (weniger Emojis, mehr Weißraum)
7. **OpenAI Tier 2** — $50+ laden für schnellere Generierung (5 IPM → 50 IPM)
