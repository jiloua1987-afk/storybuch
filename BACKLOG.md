# Product Backlog — MyComicStory
*Stand: 1. Mai 2026*

---

## 🗂️ Übersicht

| # | Thema | Prio | Aufwand | Status |
|---|-------|------|---------|--------|
| 1 | Test-Run: Anti-Manga + Opa/Oma-Fix | 🔴 Kritisch | 30 Min | ⏳ Offen |
| 2 | Quality Score + Auto-Retry | 🔴 Hoch (vor Launch) | 3-4h | ⏳ Offen |
| 3 | Canonical Character Sheet | 🔴 Hoch | 1 Tag | ⏳ Offen |
| 4 | Style-Master-Panel (Fallback) | 🟡 Mittel | 2-3h | ⏳ Warten auf Tier 2 |
| 5 | Cover als Stil-Referenz für Opa/Oma-Seiten | 🟡 Mittel | 1h | ⏳ Offen |
| 6 | Luca-Größenanker | 🔴 Hoch | 30 Min | ⏳ Offen |
| 7 | "Neu illustrieren" mit Freitextfeld | 🟡 Mittel | 3-4h | ⏳ Offen |
| 8 | Outfit-State (Supabase) | 🟡 Mittel | 2-3 Tage | ⏳ Offen |
| 9 | Supabase Unique-Constraint Fix | 🟡 Mittel | 30 Min | ⏳ Offen |
| 10 | UI/UX Redesign Wizard | 🟢 Niedrig | 1-2 Tage | ⏳ Warten auf Qualität |
| 11 | OpenAI Tier 2 | 🟢 Niedrig | 5 Min | ⏳ Offen |
| — | gpt-image-2 Upgrade | — | — | ✅ Done |

---

## 🔴 Als nächstes

### 1. Test-Run — Anti-Manga + Opa/Oma-Fix prüfen
**Status:** ⏳ Deployed, noch nicht getestet
**Aufwand:** 30 Min (Comic generieren + bewerten)

Tunesien-Geschichte neu generieren und prüfen:
- [ ] Opa/Oma erscheinen NICHT beim Abflug Frankfurt
- [ ] Grillen-Seite (Moment #4) im Bande-Dessinée-Stil, kein Manga
- [ ] Fußball-Seite (Moment #5) konsistenter Stil

**Wenn Grillen/Fußball immer noch Manga → weiter zu #3 (Character Sheet) oder #4 (Style-Master)**

---

### 2. Quality Score + Auto-Retry ⚠️ vor Launch
**Status:** ⏳ Offen
**Aufwand:** 3-4 Stunden
**Datei:** `backend-railway/src/routes/comic.js`

**Warum vor Launch:** Manga-Stil-Ausreißer passieren zufällig. Ohne Auto-Retry landen schlechte Seiten beim Kunden.

**Lösung:** Nach jeder Seiten-Generierung ein schneller Vision-Check:

```javascript
// ~$0.005 pro Seite, ~3s zusätzlich
const check = await openai.chat.completions.create({
  model: "gpt-4.1",
  messages: [{ role: "user", content: [
    { type: "image_url", image_url: { url: rawUrl, detail: "low" } },
    { type: "text", text: `Is this image in European Bande Dessinée / graphic novel style
    (like Blacksad, Tintin, Bastien Vivès)?
    Or does it look like manga / anime / Studio Ghibli / photorealistic?
    Answer with ONE word: "ok" or "wrong"` }
  ]}],
  max_tokens: 5,
});
const styleOk = check.choices[0].message.content?.toLowerCase().includes("ok");

if (!styleOk) {
  console.log(`  → Style check failed, retrying with stronger prompt`);
  // Retry mit expliziterem Anti-Manga-Prompt
  // Wenn Cover-Referenz geblockt war → User-Foto als Fallback
}
```

**Kosten:** ~$0.005 pro Seite (GPT-4.1 Vision, low detail)

---

### 3. Canonical Character Sheet — größter Hebel für Stil-Konsistenz
**Status:** ⏳ Offen
**Aufwand:** 1 Tag
**Datei:** `backend-railway/src/routes/comic.js` — neue `/character-sheet` Route

**Analyse (GPT-4, bewertet von Kiro):**

GPT beschreibt den entscheidenden Architektur-Shift:

> "Nicht Cover als Style Anchor + User Photo als Identity Anchor.
> Sondern: Ein einziges kanonisches Style+Identity Anchor System."

Die aktuelle Pipeline:
```
User Photo → Cover → Seiten
```
Problem: Cover ist gleichzeitig Marketing-Artwork UND Stilanker. Das ist zu viel für ein Bild.
Cover ist ein Ausgabe-Artefakt, kein Produktions-Asset.

Die neue Pipeline:
```
User Photo → Character Sheet → Cover → Seiten
```

**Was das Character Sheet ist:**
- Internes Produktions-Asset, nie dem User gezeigt
- Alle Charaktere frontal / 3/4-Ansicht auf neutralem Hintergrund
- Gleiche Stilwelt, gleiche Line-Qualität, gleiche Farbpalette
- Neutrale Posen — kein Storytelling, nur Charakter-Definition
- Wie ein echtes Character Design Sheet aus Animation/Comics

**Warum das funktioniert:**
- Foto beantwortet: *Wer sind diese Menschen?*
- Character Sheet beantwortet: *Wie sehen diese Menschen in diesem Comic aus?*
- Cover + Seiten referenzieren nur noch das Sheet — nicht mehr das Foto direkt
- Eliminiert laut GPT ~70% der Stil-Drift

**Kiro-Bewertung:**
Das ist konzeptuell die stärkste Lösung. Wichtiger Unterschied zum alten Character-Sheet-Versuch (der scheiterte): Damals wurde das Sheet ohne User-Foto generiert. Jetzt: User Photo → Sheet (mit Foto als Input). Das Modell hat dann echte Gesichtsmerkmale als Basis.

**Risiko:** `images.edit()` könnte das Sheet als "zu editierendes Bild" behandeln statt als Stil-Referenz. Muss getestet werden.

**Implementierung:**
```javascript
// Neue Route: POST /api/comic/character-sheet
// Input: characters (visual_anchors), userPhoto
// Output: characterSheetUrl (in Supabase gespeichert)

const sheetPrompt = `${COMIC_STYLE}

CHARACTER REFERENCE SHEET — internal production asset, never shown to users.
Draw ALL these characters as clean comic book character designs:
${charDesc}

Layout: each character shown TWICE — front view and 3/4 view.
Neutral poses, no action, no background (white or light grey).
Same ink weight, same color palette, same face stylization for ALL characters.
This is a style bible — every character must look like they belong to the same comic.
NO text, NO labels, NO speech bubbles.`;

const sheet = await openai.images.edit({
  model: "gpt-image-2",
  image: userPhotoFile,   // ← User-Foto als Identity-Input
  prompt: sheetPrompt,
  size: "1024x1536",
  quality: "high",
});
// → In Supabase speichern als character_sheet_url
```

**Danach:** Cover und alle Seiten nutzen `characterSheetUrl` statt `coverImageUrl` als primäre Referenz.

---

### 4. Style-Master-Panel ⚠️ erst ab Tier 2 sinnvoll
**Status:** ⏳ Warten auf OpenAI Tier 2
**Aufwand:** 2-3 Stunden

**Warum Tier 2:** `images.generate()` dauert auf Tier 1 **60-80 Sekunden**. Das Frontend startet Cover und Seiten nach ~15s — Style-Master ist dann noch nicht fertig und wird nie genutzt. Bei Tier 2 (~5-10s) funktioniert die Pipeline.

**Lesson Learned:** Getestet am 1. Mai 2026 — gescheitert an Tier 1 Geschwindigkeit. Konzept ist richtig, Timing ist das Problem. Commit `252550b` → revertiert.

---

### 5. Cover als Stil-Referenz auch für Opa/Oma-Seiten
**Status:** ⏳ Offen — Quick Fix, 1 Stunde
**Datei:** `backend-railway/src/routes/comic.js`

Aktuell: Seiten mit Opa/Oma (`hasCharNotInPhoto = true`) → `user-photo-style` oder `generate-only` → Manga-Risiko.

**Fix:** Cover für alle Seiten als Referenz, mit explizitem Prompt-Hinweis:
```javascript
// Für Opa/Oma-Seiten:
refNote = `${COMIC_STYLE}
Match the art style of this cover image exactly.
IMPORTANT: Some characters in this scene are NOT visible in the reference image.
Draw them ONLY from their text descriptions — do NOT copy or invent faces from the reference.
Characters NOT in reference: ${charsNotInPhoto.map(c => c.name).join(", ")}.
\n\n`;
```

**Risiko:** gpt-image-2 könnte Opa/Oma-Gesichter aus dem Cover "erfinden" (Papa-Gesicht auf Opa).
**Vorteil:** Stil ist garantiert konsistent, kein Manga-Risiko.

---

## 🟡 Nächste Priorität (nach Qualität stabil)

### 6. Luca-Größenanker — Quick Win
**Status:** ⏳ Offen — sofort umsetzbar
**Aufwand:** 30 Minuten
**Datei:** `backend-railway/src/routes/comic.js` — `/structure` Route, Character-Extraktion

**Problem:** Luca (3 Jahre) wirkt auf manchen Seiten älter als auf anderen. Kleine Kinder sind für Bildmodelle schwer konsistent zu halten.

**Lösung:** Im Character-Extraktion-Prompt und in den `visual_anchors` explizit einen relativen Größenanker setzen:

```javascript
// Im charPromise System-Prompt ergänzen:
"For very young children (under 5): add their approximate height and size relative 
to other characters. Example: 'toddler, approximately 90cm tall, visibly smaller 
than his 8-year-old sister — size ratio is critical to maintain across all panels'"
```

Das gibt dem Modell einen relativen Anker statt nur "3 Jahre alt".

---

### 7. "Neu illustrieren" mit Freitextfeld
**Status:** ⏳ Offen
**Aufwand:** 3-4 Stunden
**Dateien:** `Step5Preview.tsx`, `PanelView.tsx`, `comic.js`

**Problem:** "Neu illustrieren" generiert zufällig neu — User kann nicht sagen was er anders will.

**Lösung:**
```typescript
// Beim Klick auf "Neu illustrieren" → kleines Textfeld erscheint
<textarea placeholder="Was soll anders sein? z.B. 'Opa mehr im Vordergrund'" />

// Backend: reillustrationNote ans Ende des Prompts
if (reillustrationNote) {
  prompt += `\n\nUSER CORRECTION: ${reillustrationNote}. Apply this change while keeping all other elements identical.`;
}
```

**UX:** Feld ist optional. Leer = wie bisher. Deutsch wird direkt an GPT übergeben.

---

### 8. Outfit-State (Supabase)
**Status:** ⏳ Offen
**Aufwand:** 2-3 Tage
**Dateien:** Supabase Schema + `comic.js`

**Problem:** Charaktere tragen manchmal gleiche Kleidung in verschiedenen Kontexten.
`detectOutfitContext()` funktioniert, aber kein Gedächtnis über Seiten hinweg.

**Lösung:**
```sql
CREATE TABLE outfit_state (
  project_id TEXT NOT NULL,
  character_name TEXT NOT NULL,
  page_number INT NOT NULL,
  context TEXT,           -- 'beach', 'home', 'airport', 'garden'
  outfit_description TEXT, -- "blue swim shorts, white t-shirt"
  PRIMARY KEY (project_id, character_name, page_number)
);
```

```javascript
// Vor jeder Seite: Outfit aus letzter Seite laden
const lastOutfit = await getLastOutfit(projectId, charName);
if (lastOutfit?.context === currentContext) {
  // Gleicher Kontext → gleiches Outfit erzwingen
  prompt += `${charName} wears: ${lastOutfit.outfit_description}. Keep this exact outfit.`;
}
```

---

### 9. Supabase Unique-Constraint Fix
**Status:** ⏳ Offen — Quick Fix, 30 Min
**Datei:** Supabase SQL Editor

**Problem:** `saveCharacterRefs` macht `upsert` mit `onConflict: "project_id,character_name"` — aber dieser Unique-Constraint fehlt in der Tabelle `character_ref_image`. Führt zu Fehler in den Logs, `visual_anchors` werden nicht korrekt gespeichert/aktualisiert.

**Fix:**
```sql
ALTER TABLE character_ref_image
ADD CONSTRAINT character_ref_image_project_id_character_name_key
UNIQUE (project_id, character_name);
```

---

## 🟢 Niedrige Priorität (nach Qualität + UX stabil)

### 9. UI/UX Redesign — Wizard ruhiger gestalten
**Status:** ⏳ Warten bis Bildqualität stabil
**Aufwand:** 1-2 Tage
**Dateien:** `Step1Story.tsx`, `Step2Upload.tsx`, `Step3Style.tsx`, `page.tsx`, `ueber-uns/page.tsx`

**Problem:** Zu viele Emojis, zu viel visuelle Unruhe, kleine Buttons, wenig Weißraum.

**Design-Prinzipien:**
- Große weiße Boxen mit Nummern-Kreisen (1, 2, 3...)
- Warme Farbpalette: Gold `#C9963A`, Ink `#1A1410`, Cream `#FDF8F2`, Oat `#E8D9C0`
- Playfair Display für Überschriften
- Keine Emojis in Buttons
- Referenz: magischeskinderbuch.de

**WICHTIG:** Keine Funktionalitäten entfernen — nur visuelles Design.
Momente-Feature, Custom Dialogs, alle Validierungen bleiben erhalten.

---

### 10. OpenAI Tier 2
**Status:** ⏳ Offen
**Aufwand:** 5 Minuten ($50+ laden)

12 Minuten Generierungszeit → bei Tier 2 ca. 2-3 Minuten (5 IPM → 50 IPM).
Sinnvoll sobald erste zahlende Kunden da sind.

---

## ✅ Erledigt

### gpt-image-2 Upgrade
Alle Calls von `gpt-image-1.5` → `gpt-image-2`. +$0.20 pro Comic für deutlich bessere Qualität.

### Momente als Pflicht-Seiten
1 GPT-Call pro Moment (parallel) statt alle Momente auf einmal → garantiert eine Seite pro Moment.

### Supabase Memory
`character_ref_image` + `last_page_image` Tabellen. `visual_anchors` werden bei Regenerierung aus Supabase geladen.

### Outfit-Kontext-Erkennung
`getOutfit()` erkennt Beach/Airport/Garden/Home/Sport aus englischen Location-Keywords.

### Opa/Oma beim Abflug Fix *(1. Mai)*
Struktur-Prompt sagt jetzt explizit: nur Charaktere zeigen die in der Szene erwähnt sind.

### Anti-Manga COMIC_STYLE *(1. Mai)*
`STRICT PROHIBITION: NOT manga. NOT anime.` + Bande Dessinée / Blacksad / Bastien Vivès Referenz.

---

## 📋 Langfristig / Forschung

Diese Punkte sind konzeptuell dokumentiert aber noch nicht priorisiert:

- **Consistency Validation** — GPT-4o Vision vergleicht jede Seite mit Cover, Score 0-100
- **Reference Stack** — beste vorherige Seite als Referenz statt immer Cover
- **Face Embeddings** — mathematische Gesichts-Konsistenz (pgvector in Supabase)
- **SDXL + ControlNet** — Alternative zu OpenAI für mehr Kontrolle (GPU-Infrastruktur nötig)
- **Image Worker** — asynchrone Job-Queue (BullMQ + Redis) für Background-Processing
