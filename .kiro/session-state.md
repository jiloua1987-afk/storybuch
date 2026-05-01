# Session State — MyComicStory
*Zuletzt aktualisiert: 1. Mai 2026*
*Git Tag: stable-v1-mai2026 (commit de71af4)*

---

## Projekt-Übersicht

Web-App die personalisierte Comic-Bücher aus Familienfotos und Geschichten generiert.

**Stack:**
- Frontend: Next.js 15 / Vercel (`src/`)
- Backend: Node.js / Railway (`backend-railway/src/routes/comic.js`)
- Bildgenerierung: gpt-image-2 (OpenAI)
- Textstruktur: GPT-4.1
- Storage/DB: Supabase (bucket: `comic-panels`, Tabellen: `character_ref_image`, `last_page_image`)

---

## Aktueller Stand (was funktioniert)

- ✅ 5 Story-Momente → 5 separate Seiten (1 GPT-Call pro Moment)
- ✅ Bande Dessinée Stil (STRICT PROHIBITION: NOT manga, NOT anime)
- ✅ Opa/Oma erscheinen nicht beim Abflug (nur Charaktere aus der Szene)
- ✅ Safety-Block Fallback: sanitized prompt → generate-only
- ✅ Neue projectId bei jeder Generierung (kein Supabase-Bleed vom vorherigen Comic)
- ✅ Chapters werden beim Start geleert (kein State-Bleed im Browser)
- ✅ Cover: images.edit() mit User-Foto
- ✅ Seiten: Cover als Referenz (Foto-Chars) / user-photo-style (Opa/Oma)
- ✅ Outfit-Kontext: Beach/Airport/Garden/Home/Sport erkannt
- ✅ visual_anchors aus Supabase bei Regenerierung
- ✅ Sprechblasen: hinzufügen, löschen, ziehen, skalieren, Sprecher editieren

---

## Bekannte offene Probleme

1. **Fußball-Seite (Safety-Block):** images.edit() + images.generate() beide geblockt bei Jubel-Szenen mit Kindern. Sanitized-Prompt-Fallback generiert ein Bild, aber Charaktere weniger erkennbar.
2. **Supabase Unique-Constraint:** `saveCharacterRefs` schlägt fehl wegen fehlendem Constraint. Fix: `ALTER TABLE character_ref_image ADD CONSTRAINT ... UNIQUE (project_id, character_name)`
3. **Stil-Konsistenz:** Gelegentlich leichte Manga/Ghibli-Drift bei warmen Abendszenen. Besser als vorher aber nicht 100% deterministisch.

---

## Wichtige Dateien

| Datei | Zweck |
|-------|-------|
| `backend-railway/src/routes/comic.js` | Haupt-Backend: structure, cover, page, ending Routes |
| `backend-railway/src/lib/storage.js` | Supabase: saveImage, saveCharacterRefs, getCharacterRefs, savePage |
| `src/components/steps/Step4Generate.tsx` | Frontend Generierungs-Flow |
| `src/components/steps/Step5Preview.tsx` | Preview: CoverView, EndingView, PanelView |
| `src/components/comic/PanelView.tsx` | Sprechblasen-Editor |
| `src/store/bookStore.ts` | Zustand: project, chapters, characters |
| `BACKLOG.md` | Priorisierter Backlog mit allen offenen Punkten |
| `CHANGES.md` | Session-Änderungen + Lessons Learned |
| `ARCHITECTURE.md` | System-Übersicht, Prompt-Strategie, Challenges |

---

## COMIC_STYLE Konstante (Backend)

```javascript
const COMIC_STYLE = [
  "EUROPEAN BANDE DESSINÉE ILLUSTRATION — Franco-Belgian comic book style, similar to Blacksad or Bastien Vivès.",
  "Bold clean ink outlines on every figure and object. Flat cel-shaded color areas, NOT photographic gradients.",
  "Warm cinematic colors: golden tones, rich shadows, vivid saturated hues.",
  "Expressive stylized faces — clearly drawn eyes, nose, mouth. NOT photographic faces.",
  "Realistic human proportions. Western comic book anatomy.",
  "STRICT PROHIBITION: NOT manga. NOT anime. NOT Japanese comic style. NOT big anime eyes. NOT speed lines.",
  "STRICT PROHIBITION: NOT photorealistic. NOT a photograph. NOT CGI render. NOT watercolor painting.",
  "This must look like a page printed in a European comic album — ink outlines visible on every edge.",
  "Every page in this comic MUST look identical in style. Consistent ink weight, color palette, and character design.",
].join(" ");
```

---

## Referenz-Strategie (Backend /page Route)

```
Priorität:
1. cover → beste Stil+Charakter-Referenz (alle Foto-Chars)
2. user-photo-style → wenn Opa/Oma auf der Seite (nicht im Foto)
3. generate-only → wenn Safety-Block oder kein Referenzbild

Safety-Block Fallback:
→ Prompt sanitizen (aggressive Wörter entfernen)
→ generate-only ohne Referenz
```

---

## Nächste Schritte (aus BACKLOG.md)

1. **Test-Run** mit neuem Beispiel (Geburtstag) — projectId-Fix verifizieren
2. **Supabase Constraint Fix** — 30 Min, SQL in Supabase Dashboard
3. **Quality Score + Auto-Retry** — vor Launch, ~3-4h
4. **Luca-Größenanker** — 30 Min, Quick Win
5. **"Neu illustrieren" mit Freitextfeld** — 3-4h

---

## Rollback

```bash
# Zurück zum stabilen Stand
git checkout stable-v1-mai2026

# Oder letzten guten Commit vor Style-Master
git checkout 54f9b94
```
