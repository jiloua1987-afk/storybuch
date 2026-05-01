# Product Backlog — MyComicStory
*Stand: 1. Mai 2026*

---

## 🗂️ Übersicht

| # | Thema | Prio | Aufwand | Status |
|---|-------|------|---------|--------|
| 1 | Test-Run: Anti-Manga + Opa/Oma-Fix | 🔴 Kritisch | 30 Min | ⏳ Offen |
| 2 | Style-Master-Panel | 🔴 Hoch | 2-3h | ⏳ Warten auf Test |
| 3 | "Neu illustrieren" mit Freitextfeld | 🟡 Mittel | 3-4h | ⏳ Offen |
| 4 | Quality Score + Auto-Retry | 🟡 Mittel | 3-4h | ⏳ Offen |
| 5 | Outfit-State (Supabase) | 🟡 Mittel | 2-3 Tage | ⏳ Offen |
| 6 | UI/UX Redesign Wizard | 🟢 Niedrig | 1-2 Tage | ⏳ Warten auf Qualität |
| 7 | OpenAI Tier 2 | 🟢 Niedrig | 5 Min | ⏳ Offen |
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

**Wenn Grillen/Fußball immer noch Manga → weiter zu #2 (Style-Master)**

---

### 2. Style-Master-Panel — Stil-Konsistenz ohne Fotorealismus-Drift
**Status:** ⏳ Warten auf Test-Run Ergebnis
**Aufwand:** 2-3 Stunden
**Datei:** `backend-railway/src/routes/comic.js`

**Problem:**
User-Foto → `images.edit()` → Cover (leicht fotorealistisch) → Seiten erben Fotorealismus.
Wenn Safety-Filter greift oder Opa/Oma-Seiten auf `generate-only` fallen → Stilbruch.

**Lösung: Hybrid-Ansatz**
```
Schritt 1: Style-Master-Panel (unsichtbar, nie dem User gezeigt)
  → images.generate() mit reinem COMIC_STYLE-Prompt
  → Keine Charaktere, nur Stil-Referenz (z.B. tunesischer Innenhof, goldene Stunde)
  → Speichern in Supabase als style_master_url

Schritt 2: Cover
  → images.edit() mit Style-Master als Input (NICHT User-Foto direkt)
  → Prompt: "Adapt this comic style, add these characters: [visual_anchors]"
  → Ergebnis: Comic-Stil-konsistent + erkennbare Gesichter

Schritt 3: Alle Seiten
  → Cover weiterhin als Referenz (behält Charakter-Konsistenz)
  → Style-Master als Fallback wenn Cover nicht verfügbar
```

**Hinweis:** Claude schlug vor, Style-Master direkt für alle Seiten zu nutzen.
Das würde Charakter-Konsistenz kosten. Hybrid-Ansatz ist besser.

**Kosten:** +1 `images.generate()` Call (~$0.04), +15-20s Generierungszeit

---

## 🟡 Nächste Priorität (nach Qualität stabil)

### 3. "Neu illustrieren" mit Freitextfeld
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

### 4. Quality Score + Auto-Retry
**Status:** ⏳ Offen
**Aufwand:** 3-4 Stunden
**Datei:** `backend-railway/src/routes/comic.js`

**Problem:** Manga-Stil-Ausreißer werden nicht automatisch erkannt und korrigiert.

**Lösung:**
```javascript
// Nach jeder Seiten-Generierung: GPT-4.1 Vision Check
const check = await openai.chat.completions.create({
  model: "gpt-4.1",
  messages: [{ role: "user", content: [
    { type: "image_url", image_url: { url: generatedPageUrl } },
    { type: "text", text: `Is this image in European Bande Dessinée / graphic novel style 
      (like Blacksad, Bastien Vivès)? Or does it look manga/anime/photorealistic?
      Return JSON: {"style": "bande-dessinee|manga|photorealistic|other", "score": 0-100}` }
  ]}],
  max_tokens: 50,
});

if (score < 70) {
  // Retry mit verstärktem Anti-Manga-Prompt
}
```

**Kosten:** ~$0.005 pro Seite (GPT-4.1 Vision, low detail)

---

### 5. Outfit-State (Supabase)
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

## 🟢 Niedrige Priorität (nach Qualität + UX stabil)

### 6. UI/UX Redesign — Wizard ruhiger gestalten
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

### 7. OpenAI Tier 2
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
- **Luca-Größenanker** — "toddler, ~90cm, visibly smaller than 8-year-old sister Maria"
