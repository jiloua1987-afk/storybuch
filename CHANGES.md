# CHANGES — Session 30. April 2026

## Übersicht
Alle Änderungen dieser Session. Backend muss auf Railway neu deployed werden damit sie live gehen.

---

## ✅ AKTIV — Frontend (Vercel)

### 1. Format: Alle Seiten einheitlich 2:3 (1024×1536)
**Datei:** `src/components/steps/Step5Preview.tsx`
- Cover: `aspectRatio` von `"1024/1792"` → `"1024 / 1536"` (war falsch, jetzt gleich wie API-Output)
- Widmung: bereits `1024/1536` — unverändert
- Seiten (PanelView): festes `aspectRatio: "1024 / 1536"` + `object-cover` statt `h-auto`
- Konstante `PAGE_RATIO = "1024 / 1536"` für alle drei

### 2. Seitentitel über dem Bild (nicht mehr im Bild)
**Dateien:** `src/components/comic/PanelView.tsx`, `src/components/steps/Step5Preview.tsx`
- PanelView: Titel-Overlay komplett entfernt aus dem Bild
- Step5Preview: Titel als `<h3>` mit Playfair Display über dem Bild, außerhalb des Bild-Containers
- Doppelter Titel im unteren Bar entfernt, nur noch "Neu illustrieren" Button unten

### 3. numPages aus Store
**Dateien:** `src/store/bookStore.ts`, `src/components/steps/Step4Generate.tsx`
- `numPages?: number` zu `BookProject` Interface hinzugefügt
- Frontend sendet `project?.numPages || 5` statt hardcodiertem `5`
- Ermöglicht später Premium-Pakete mit mehr Seiten ohne Code-Änderung

---

## ✅ AKTIV — Backend (Railway — muss deployed werden)

### 4. Momente als Pflicht-Seiten
**Datei:** `backend-railway/src/routes/comic.js` — `/structure` Route
- `specialMoments` aus `guidedAnswers` wird explizit als `MANDATORY SCENES` extrahiert
- GPT-4o bekommt: "Diese Szenen MÜSSEN vorkommen, eine pro Seite"
- Anzahl Seiten = Anzahl Momente (wenn Momente vorhanden)
- Verhindert: doppelte Seiten, erfundene Szenen, fehlende Momente
- Vorher: Momente kamen nur als Teil des `ctx` Strings an und wurden oft ignoriert

### 5. Character Sheet Fallback entfernt
**Datei:** `backend-railway/src/routes/comic.js` — `/page` + `/cover` Route
- `referenceImages[0] || characters.find(c => c.refBase64)?.refBase64` → nur noch `referenceImages[0]`
- Character Sheet wurde als Referenz genutzt wenn kein User-Foto → falscher Stil, fehlende Charaktere
- Jetzt: nur User-Foto als Referenz, kein Fallback auf Sheet

### 6. NOT photorealistic in allen Prompts
**Datei:** `backend-railway/src/routes/comic.js` — `/cover` + `/page` Route
- Cover `images.edit()` Prompt: `bold ink outlines, flat colors, expressive cartoon faces. NOT photorealistic. NOT a photograph.`
- Seiten `images.edit()` Prompt: `NOT photorealistic. NOT a photograph.`
- War vorher nicht explizit drin

### 7. Fixer Basis-Stil für alle Seiten
**Datei:** `backend-railway/src/routes/comic.js` — `/page` Route
- Vorher: `SM` Objekt mit 7 Kategorien × 3 Stile = 21 verschiedene Style-Strings → inkonsistenter Look
- Jetzt: `BASE_STYLE = "cinematic comic illustration, bold ink outlines, rich detailed colors, expressive faces, dramatic lighting, professional graphic novel quality"`
- Nur Stimmungs-Modifier variiert noch: `emotional` / `action` / `humor`
- Reproduziert den Stil der auf den guten Test-Seiten zu sehen war

### 8. Outfit-Erkennung erweitert (6 Kontexte statt 3)
**Datei:** `backend-railway/src/routes/comic.js` — `/page` Route
- Vorher: nur Beach / Formal / Home
- Jetzt: Beach, Formal, Flughafen, Hof/Garten, Fahrrad/Sport, Wohnzimmer/Küche
- `outfitContext` wird jetzt an 3 Stellen genutzt:
  1. Prompt Rewriter System-Prompt
  2. `images.edit()` Call direkt (wichtigste Stelle)
  3. Fallback-Prompt
- Beispiel: "Hof" → `t-shirts, shorts, light trousers` statt Default
- Beispiel: Beach → `swimwear, NO jeans, NO dark shirts` explizit

### 9. gpt-4.1 statt gpt-4o
**Datei:** `backend-railway/src/routes/comic.js`
- Alle 5 GPT-Calls auf `gpt-4.1` umgestellt
- Besseres Instruction Following, günstiger ($2/$8 vs $5/$15 per 1M tokens)
- Hilft bei: "EXACTLY 5 pages", "EVERY character must appear" etc.

---

## ❌ RÜCKGÄNGIG GEMACHT

### Cover als Referenz für Seiten
- War: Cover wird zuerst generiert, dann als `images.edit()` Referenz für alle Seiten
- Problem: Cover sequenziell abwarten = 8+ Minuten statt 60-90s
- Zurück zu: Cover und Seiten parallel, beide nutzen User-Foto direkt

### Character Sheet
- War: Character Sheet (1536×1024 Landscape) als Referenz für Portrait-Seiten
- Problem: Modell "editiert" das Sheet statt Comic zu zeichnen → falsche Charaktere, fehlende Personen
- Entfernt: Character Sheet wird noch generiert aber nie als Referenz genutzt
- TODO: Character Sheet komplett aus Structure-Route entfernen (spart ~$0.20 pro Comic)

---

## 🔧 NOCH OFFEN / NÄCHSTE SCHRITTE

### Hohe Priorität
- [ ] **Railway Deploy** — alle Backend-Änderungen sind lokal, müssen deployed werden
- [ ] **Test-Run** nach Deploy mit dem Tunesien-Beispiel
- [ ] **Character Sheet aus Structure entfernen** — wird nie genutzt, kostet $0.20 pro Comic

### Mittlere Priorität
- [ ] **Opa/Oma auf Cover** — fehlen weil nicht im User-Foto. Lösung: Cover-Prompt muss alle Charaktere aus `characters` Array explizit nennen und einfordern
- [ ] **Konsistenz über Seiten** — `images.edit()` driftet pro Call leicht ab. Langfristig: Cover als Stil-Referenz sobald Parallelisierungs-Problem gelöst

### Niedrige Priorität
- [ ] **UI/UX Redesign** (Wizard ruhiger, weniger Emojis) — aus Backlog
- [ ] **Regenerate einzelner Seiten** — aktuell nur Dummy-Implementierung in Step5Preview

---

## 📁 Geänderte Dateien

| Datei | Was |
|---|---|
| `backend-railway/src/routes/comic.js` | Momente als Pflichtszenen, kein Sheet-Fallback, NOT photorealistic, fixer Stil, Outfit-Erkennung, gpt-4.1 |
| `src/components/steps/Step4Generate.tsx` | numPages aus Store, Cover+Seiten parallel |
| `src/components/steps/Step5Preview.tsx` | Format 2:3, Titel über Bild |
| `src/components/comic/PanelView.tsx` | Titel-Overlay entfernt, festes Seitenverhältnis |
| `src/store/bookStore.ts` | numPages zu BookProject Interface |

---

## 🧪 Letzter Test-Stand (29. April 2026)

**Beispiel:** Sommer in Tunesien bei Opa und Oma, 7 Momente

**Was funktioniert hat:**
- Seite "Fahrrad fahren im Hof" — Opa dabei, Luca auf Fahrrad, Papa klatscht ✅
- Seite "Ankunft bei Opa und Oma" — Stil gut, Charaktere erkennbar ✅
- Comic-Stil mit `images.edit()` + User-Foto grundsätzlich gut ✅

**Was nicht funktioniert hat:**
- Willkommensseite doppelt statt Strandszene ❌ → Fix 4 (Momente als Pflichtszenen)
- Opa/Oma fehlen auf Cover ❌ → noch offen
- Gleiche Klamotten überall ❌ → Fix 8 (Outfit-Erkennung)
- Inkonsistenter Stil zwischen Seiten ❌ → Fix 7 (fixer Basis-Stil)
