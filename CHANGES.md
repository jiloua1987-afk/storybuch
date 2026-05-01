# CHANGES — Session 1. Mai 2026 (Abend)

## Übersicht
Fixes für Opa/Oma-Abflug-Problem und Manga-Stil-Problem. Deployed auf Railway.

---

## ✅ DEPLOYED — Backend (Railway)

### 1. Opa/Oma erscheinen nicht mehr beim Abflug
**Datei:** `backend-railway/src/routes/comic.js` — `/structure` Route
- Struktur-Prompt für jeden Moment-GPT-Call hat jetzt explizite Regel:
  "Only include characters explicitly mentioned in this scene"
- Konkretes Beispiel im Prompt: Großeltern die in Tunesien warten dürfen nicht beim Abflug Frankfurt auftauchen
- Root cause: GPT-4.1 bekam vollen `storyCtx` mit allen 6 Charakteren und "erfand" Opa/Oma in Szenen rein

### 2. Anti-Manga: COMIC_STYLE stärker
**Datei:** `backend-railway/src/routes/comic.js` — `COMIC_STYLE` Konstante
- Vorher: "NOT manga, NOT anime" als Teil eines längeren Satzes
- Jetzt: `"STRICT PROHIBITION: NOT manga. NOT anime. NOT Japanese comic style. NOT big anime eyes. NOT speed lines."`
- Stil-Referenz: "EUROPEAN BANDE DESSINÉE ILLUSTRATION — Franco-Belgian comic book style, similar to Blacksad or Bastien Vivès"
- `generate-only` Fallback-Prompt (genutzt wenn Opa/Oma-Seiten kein Referenzbild haben) explizit verstärkt

### 3. Letzter guter Commit-Stand: 54f9b94
- Commit "Fix: user photo as style reference for Opa/Oma pages and safety fallback"
- HEAD (702f46f) enthält zusätzlich: Supabase-Enrichment für `visual_anchors` bei Regenerierung

---

## 📝 Offen nach diesem Deploy

- Testen ob Grillen-Seite jetzt im richtigen Bande-Dessinée-Stil ist
- Wenn nicht → Style-Master-Panel implementieren (siehe BACKLOG.md)
- "Neu illustrieren" mit Freitextfeld (siehe BACKLOG.md)

---

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

## 📝 OFFEN — Stil-Konsistenz generate() vs edit()

**Problem:** Seiten mit Opa/Oma nutzen `images.generate()` (kein Referenzbild) → leicht anderer Stil als Seiten mit `images.edit()` (Cover als Referenz). Die Großeltern-Seiten wirken etwas "vermalter"/weicher.

**Beobachtung:** Beide Stile sind gut, aber nicht identisch. Ziel: ein einheitlicher Stil über alle Seiten.

**Mögliche Lösung:** 
- Option A: Alle Seiten auf `images.generate()` umstellen — kein Referenzbild, nur `COMIC_STYLE` + `visual_anchors`. Konsistenz durch identischen Prompt-Stil.
- Option B: Für Opa/Oma-Seiten das Cover trotzdem als Stil-Referenz mitgeben, aber explizit sagen "ignore the faces in the reference, only use the art style"

**Wann angehen:** Nach dem nächsten Test-Run wenn Gesamtqualität bewertet ist.

### Wann umsetzen?
Wenn nach dem aktuellen Deploy folgende Probleme weiterhin bestehen:
- Charaktere sehen auf verschiedenen Seiten unterschiedlich aus
- Stil inkonsistent zwischen Seiten
- Klamotten ändern sich nicht trotz OVERRIDE

### Architektur-Übersicht

```
Frontend (Next.js/Vercel)
    ↓ POST /api/comic/generate
Railway Backend (Orchestrator)
    ↓ speichert/liest
Supabase (Gedächtnis)
    ↓ generiert Bilder
OpenAI gpt-image-2
```

### Railway = Orchestrator
Steuert den gesamten Ablauf:
1. Cover generieren → in Supabase speichern als `character_reference`
2. Cover-Buffer für alle Seiten-Calls bereithalten (im Memory, kein Re-Download)
3. Nach jeder Seite: Quality Score berechnen (GPT-4o Vision)
4. Bei Score < 70: automatisch retry mit Cover statt User-Foto

### Supabase = Gedächtnis
Tabellen:
- `projects` — project_id, cover_url, character_anchors, style_reference
- `pages` — project_id, page_number, image_url, quality_score
- `character_memory` — project_id, character_name, best_image_url, visual_anchor

### Implementierungsplan (ca. 1 Tag)

**Schritt 1: Supabase Tabellen anlegen**
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cover_url TEXT,
  character_anchors JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id),
  page_number INT,
  image_url TEXT,
  quality_score INT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Schritt 2: Railway Cover-Route erweitern**
- Cover generieren
- Cover-Buffer im Railway-Memory cachen (Map: projectId → buffer)
- Cover-URL in Supabase `projects` speichern

**Schritt 3: Railway Page-Route erweitern**
- Cover-Buffer aus Memory holen (kein HTTP-Download mehr)
- Nach Generierung: GPT-4o Vision Quality Check
- Score in Supabase speichern
- Bei Score < 70: retry mit Cover als Referenz

**Schritt 4: Frontend vereinfachen**
- Nur noch einen einzigen POST an Railway: `/api/comic/generate`
- Railway orchestriert alles intern
- Frontend pollt Status oder bekommt SSE-Stream

### Kosten dieser Architektur
- Supabase: kostenlos bis 500MB
- Quality Check: +$0.01 pro Seite (GPT-4o Vision)
- Gesamt: +$0.05-0.10 pro Comic

### Root Cause Analyse (30. April 2026, Abend)

Nach mehreren Test-Runs sind die echten Probleme klar:

#### Problem 1: Momente werden vermischt / doppelt dargestellt
**Ursache:** Structure-Prompt bekommt alle 7 Momente auf einmal → GPT-4o kombiniert, erfindet, überspringt
**Echte Lösung:** Jeden Moment einzeln strukturieren — ein GPT-Call pro Moment, parallel ausgeführt
```
Statt: POST /structure → GPT bekommt 7 Momente → gibt 7 Seiten zurück (unzuverlässig)
Neu:   POST /structure → 7 parallele GPT-Calls → jeder bekommt NUR 1 Moment → 7 garantierte Seiten
```

#### Problem 2: Charakterkonsistenz fehlt
**Ursache:** `images.edit()` interpretiert User-Foto bei jedem Call anders → Drift über Seiten
**Echte Lösung:** Cover zuerst generieren, Cover-Buffer im Memory halten, alle Seiten-Calls bekommen Cover als Referenz
```
Ablauf:
1. Cover-Promise starten (parallel)
2. Seiten-Calls starten sofort (parallel)  
3. Jeder Seiten-Call awaitet coverPromise intern (max ~45s Wartezeit)
4. Seiten-Call nutzt Cover-Buffer als images.edit() Referenz
→ Kein sequenzielles Warten, aber alle Seiten haben Cover-Referenz
```

#### Problem 3: Gleiche Klamotten überall
**Ursache:** `detectOutfitContext()` prüft auf deutsche Keywords, aber `page.location` kommt von GPT-4o auf Englisch ("courtyard", "beach house", "living room")
**Echte Lösung:** Keywords auf Englisch ausrichten + location aus Moment-Beschreibung ableiten (nicht von GPT)

#### Problem 4: Alle lachen immer
**Ursache:** `images.edit()` mit User-Foto — Familienfoto zeigt lächelnde Menschen → Modell übernimmt Emotion
**Echte Lösung:** Emotion explizit in Panel-Szene beschreiben ("Luca crying, tears on cheeks") + Cover als Referenz statt Familienfoto für Seiten

### Implementierungsplan für nächste Session

**Schritt 1: Structure-Route umbauen**
```javascript
// Jeden Moment einzeln → parallele GPT-Calls
const pageStructures = await Promise.all(momentsList.map(async (moment, i) => {
  const res = await openai.chat.completions.create({
    model: "gpt-4.1",
    messages: [{
      role: "system", 
      content: `Create panels for ONE comic page in ${lang}. 2-4 panels. 
      Show the EXACT scene described. Include correct emotions.`
    }, {
      role: "user",
      content: `Scene: ${moment}\nCharacters: ${charListStr}\nTone: ${tone}`
    }],
    response_format: { type: "json_object" }
  });
  return { id: `page${i+1}`, pageNumber: i+1, ...JSON.parse(res.choices[0].message.content) };
}));
```

**Schritt 2: Cover → Seiten Referenz-Kette (ohne Blockierung)**
```javascript
// Frontend: Cover und Seiten parallel, aber Seiten warten auf Cover
const coverPromise = post("/api/comic/cover", {...});

// Alle Seiten parallel starten
await Promise.all(pages.map(async (page, i) => {
  const coverUrl = await Promise.race([
    coverPromise,
    new Promise(r => setTimeout(() => r(""), 50000)) // 50s timeout
  ]);
  const pageData = await post("/api/comic/page", { ...page, coverImageUrl: coverUrl });
  // ...
}));
```

**Schritt 3: Location-Keywords auf Englisch**
```javascript
// Englische Keywords die GPT-4o tatsächlich verwendet
const beachKw = ["beach", "sea", "pool", "shore", "coast", "swimming"];
const gardenKw = ["courtyard", "garden", "yard", "terrace", "patio", "outdoor"];
const homeKw = ["living room", "kitchen", "bedroom", "home", "house", "indoor"];
const airportKw = ["airport", "gate", "terminal", "departure", "arrival"];
```

**Schritt 4: Emotion in Szenen-Beschreibung erzwingen**
```javascript
// Im Structure-Prompt pro Panel:
// "szene" muss Emotion enthalten: "Luca crying on the ground next to fallen bicycle, Papa rushing over with worried face"
// Nicht: "Luca falls from bicycle"
```

### Dateien die geändert werden müssen
- `backend-railway/src/routes/comic.js` — Structure-Route, Page-Route
- `src/components/steps/Step4Generate.tsx` — Cover-Promise Logik

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
