# Production Roadmap - May 9, 2026
*Fokus: Performance, Persistenz, UX vor Launch*

---

## 🎯 AKTUELLE SITUATION

### ✅ Was bereits funktioniert:
- Tier 2 aktiv (50 IPM, 5 concurrent requests)
- Prompt-Sanitizer implementiert (kann erweitert werden)
- Bubble-Positionierung funktioniert (aber nur in Session)
- PDF-Export funktioniert (Koordinaten-Konvertierung hat Edge Cases)

### ⚠️ Was optimiert werden muss:
1. **Bubble Persistence** - Geht bei Browser-Neustart verloren
2. **SSE Fortschrittsanzeige** - User sieht nicht was passiert
3. **Prompt-Sanitizer erweitern** - Jubel/Sport-Szenen (WM-Problem)
4. **PDF-Export vereinfachen** - Vorschau → PNG → PDF
5. **Platform-Optimierungen** - Supabase, Vercel, Railway besser nutzen

---

## 📅 ROADMAP

### PHASE 1: Bubble Persistence (Priorität: KRITISCH)
**Aufwand:** 2 Stunden
**Status:** Bereit zur Implementierung

#### Warum kritisch:
- User verliert Bubble-Positionen bei Browser-Neustart
- Keine Multi-Device-Unterstützung
- Unprofessionell für Launch

#### Was implementieren:

**1. Supabase Schema (5 Min)**
```sql
CREATE TABLE comic_bubble_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  chapter_id TEXT NOT NULL,
  panel_number INT NOT NULL,
  bubble_index INT NOT NULL,
  top_percent FLOAT NOT NULL,
  left_percent FLOAT NOT NULL,
  width_percent FLOAT NOT NULL,
  height_percent FLOAT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_bubble_positions_project 
ON comic_bubble_positions(project_id, chapter_id);

CREATE UNIQUE INDEX idx_bubble_positions_unique 
ON comic_bubble_positions(project_id, chapter_id, panel_number, bubble_index);
```

**2. Backend API (30 Min)**
- Datei: `backend-railway/src/lib/bubble-storage.js` (NEU)
- Funktionen: `saveBubblePositions()`, `loadBubblePositions()`, `loadAllBubblePositions()`
- Endpoints: 
  - POST `/api/comic/bubble-positions/save`
  - GET `/api/comic/bubble-positions/:projectId/:chapterId`
  - GET `/api/comic/bubble-positions/:projectId` (alle Seiten)

**3. Frontend Integration (1h)**
- Datei: `src/components/steps/Step5Preview.tsx`
- Debounced Save (alle 2 Sekunden)
- Load beim Seitenwechsel
- Fallback auf Store-Daten

**4. Migration (15 Min)**
- Bestehende Positionen aus Store → Supabase

**Erfolgs-Kriterien:**
- ✅ Bubble-Positionen überleben Browser-Neustart
- ✅ Multi-Device funktioniert (Desktop → Mobile)
- ✅ Keine Datenverluste

**Details:** Siehe `BUBBLE-PERSISTENCE-SUPABASE-SOLUTION.md`

---

### PHASE 2: SSE Fortschrittsanzeige (Priorität: HOCH)
**Aufwand:** 4-6 Stunden
**Status:** Design fertig, Implementierung offen

#### Warum wichtig:
- Generierung dauert 2-5 Minuten
- User sieht nicht was passiert
- Fühlt sich länger an ohne Feedback
- **Mit Live-Fortschritt fühlt es sich 50% kürzer an**

#### Was implementieren:

**1. Backend: Server-Sent Events (3h)**
- Datei: `backend-railway/src/routes/comic.js`
- Neuer Endpoint: POST `/api/comic/generate-full`
- SSE Setup mit `Content-Type: text/event-stream`
- Progress Events:
  - `structure` (5-15%): "Geschichte wird analysiert…"
  - `cover` (20-40%): "Cover wird gezeichnet…"
  - `pages` (40-90%): "Seite 1-2 wird gezeichnet…"
  - `done` (100%): "Dein Comic ist fertig!"

**2. Batch-Parallelisierung (1h)**
```javascript
// Batch-Größe 2 (sicher für Tier 2)
const BATCH_SIZE = 2;
const DELAY_BETWEEN_BATCHES = 15000; // 15s

for (let i = 0; i < pages.length; i += BATCH_SIZE) {
  const batch = pages.slice(i, i + BATCH_SIZE);
  
  sendProgress('pages', 40 + (i / pages.length) * 50, 
    `Seite ${i+1}–${Math.min(i+BATCH_SIZE, pages.length)} wird gezeichnet…`);
  
  // Batch parallel ausführen
  const batchResults = await Promise.all(
    batch.map((moment, idx) => generatePage(moment, cover.url, i + idx + 1))
  );
  
  results.push(...batchResults);
  
  // Zwischen Batches warten (Rate-Limit)
  if (i + BATCH_SIZE < pages.length) {
    await sleep(DELAY_BETWEEN_BATCHES);
  }
}
```

**3. Frontend: Live-Fortschrittsanzeige (2h)**
- Datei: `src/components/steps/Step4Generate.tsx`
- EventSource für SSE
- Fortschrittsbalken mit Prozent
- Zeitschätzung: "ca. 3 Minuten verbleibend"
- Emotionaler Text: "Deine Erinnerungen nehmen gerade Form an…"
- Step-Indikator (Struktur → Cover → Seiten)

**Erfolgs-Kriterien:**
- ✅ User sieht Live-Fortschritt
- ✅ Zeitschätzung ist akkurat (±30 Sekunden)
- ✅ Generierung fühlt sich schneller an
- ✅ Bei Fehler: Klare Fehlermeldung

**Erwartete Generierungszeit mit Tier 2 + Batching:**
- Cover: 30s
- 5 Pages in 3 Batches: 2×30s + 1×30s + 2×15s Pause = 2 Minuten
- **Total: ~2.5 Minuten** ✅

---

### PHASE 3: Prompt-Sanitizer erweitern (Priorität: MITTEL)
**Aufwand:** 2-3 Stunden
**Status:** Basis vorhanden, Erweiterung nötig

#### Warum wichtig:
- Safety Blocks bei Jubel-Szenen (WM, Geburtstag, Sport)
- Aktuell ~30% Safety Blocks
- Ziel: <10% Safety Blocks

#### Was implementieren:

**1. Erweiterte Replacements (30 Min)**
- Datei: `backend-railway/src/routes/comic.js` (Zeile 29-80)
- Neue Kategorien:
  - Jubel/Sport: "jubeln" → "smiling with raised hands"
  - Kinder in Action: "kind rennt" → "child walking quickly"
  - Körperkontakt: "stürzt" → "stumbles playfully"
  - Emotion: "weint" → "eyes glistening with emotion"

```javascript
const SAFETY_REWRITES = {
  // Jubel / Sport
  "jubeln": "smiling with raised hands, joyful expression",
  "fist pump": "arms raised in celebration, big smile",
  "schreien": "laughing loudly with open mouth",
  "toben": "playing energetically",
  
  // Kinder in Action
  "kind rennt": "child walking quickly with excitement",
  "kind springt": "child standing on tiptoes, excited",
  "kleinkind klettert": "toddler reaching up with curiosity",
  
  // Körperkontakt
  "stürzt": "stumbles playfully, laughing",
  "fällt": "tumbles gently, surprised expression",
  "kämpfen": "playing together energetically",
  "raufen": "playful interaction",
  
  // Emotion
  "weint": "eyes glistening with emotion",
  "schluchzt": "deeply moved, tears of happiness",
};
```

**2. Spezial-Handler für Szenen (1h)**
```javascript
function makeFootballSceneSafe(prompt) {
  return prompt
    .replace(/jubel\w*/gi, "celebrates with big smile and raised hands")
    .replace(/ruft laut/gi, "exclaims happily with open arms")
    .replace(/springt auf/gi, "stands up excitedly")
    .replace(/schreit/gi, "cheers enthusiastically")
    // Opa+Kind Jubel ist das eigentliche Problem:
    .replace(
      /opa.*jubel.*kind|kind.*jubel.*opa/gi,
      "grandfather and child sharing a happy moment together, both smiling broadly"
    );
}
```

**3. Tiered Retry (1h)**
- TIER 1: Original (hard-sanitized)
- TIER 2: Entschärfter Prompt, gleicher Stil
- TIER 3: Generisch, kein Referenzbild

**Erfolgs-Kriterien:**
- ✅ Safety Blocks von 30% auf <10%
- ✅ Jubel-Szenen funktionieren
- ✅ Kinder-Action-Szenen funktionieren
- ✅ Weniger Retries = schnellere Generierung

---

### PHASE 4: PDF-Export vereinfachen (Priorität: MITTEL)
**Aufwand:** 3-4 Stunden
**Status:** Alternative Lösung evaluieren

#### Warum wichtig:
- Aktuelle Koordinaten-Konvertierung hat Edge Cases
- Extra Bubbles werden nicht gerendert
- Multi-Panel-Seiten haben Probleme

#### Zwei Ansätze:

**Option A: Koordinaten-Fix (komplex)**
- Datei: `backend-railway/src/lib/pdf-generator.js`
- Korrigierte Koordinaten-Konvertierung
- Extra Bubbles Support
- Multi-Panel Support
- **Aufwand:** 3-4h
- **Vorteil:** Editierbare Texte im PDF
- **Nachteil:** Komplex, fehleranfällig

**Option B: Vorschau → PNG → PDF (einfach)** ⭐ EMPFOHLEN
- Frontend rendert Seite mit html2canvas
- PNG an Backend senden
- Backend: PNG → PDF
- **Aufwand:** 2-3h
- **Vorteil:** WYSIWYG, einfach, zuverlässig
- **Nachteil:** Größere Dateien, keine editierbaren Texte

**Implementierung Option B:**

```typescript
// Frontend: src/components/steps/Step5Preview.tsx
import html2canvas from 'html2canvas';

const exportPageAsPNG = async (pageElement: HTMLElement) => {
  const canvas = await html2canvas(pageElement, {
    scale: 2, // Höhere Auflösung für Druck
    backgroundColor: '#FFFFFF',
    logging: false,
  });
  
  return canvas.toDataURL('image/png');
};

const exportPDF = async () => {
  const pages = [];
  
  for (const chapter of project.chapters) {
    const pageElement = document.getElementById(`page-${chapter.id}`);
    if (pageElement) {
      const pngDataUrl = await exportPageAsPNG(pageElement);
      pages.push(pngDataUrl);
    }
  }
  
  // Sende an Backend
  const response = await fetch('/api/comic/export-pdf-from-png', {
    method: 'POST',
    body: JSON.stringify({ pages }),
  });
};
```

```javascript
// Backend: backend-railway/src/routes/comic.js
router.post('/export-pdf-from-png', async (req, res) => {
  const { pages } = req.body; // Array von PNG data URLs
  
  const doc = new PDFDocument({ size: 'A4' });
  
  for (const pngDataUrl of pages) {
    const pngBuffer = Buffer.from(pngDataUrl.split(',')[1], 'base64');
    
    doc.addPage();
    doc.image(pngBuffer, 0, 0, { 
      width: 595, 
      height: 842,
      fit: 'contain'
    });
  }
  
  doc.end();
  // ... stream to response
});
```

**Erfolgs-Kriterien:**
- ✅ Alle Bubbles im PDF (genau wie in Vorschau)
- ✅ Extra Bubbles funktionieren
- ✅ Multi-Panel funktioniert
- ✅ WYSIWYG (What You See Is What You Get)

**Empfehlung:** Starte mit Option B (PNG → PDF), evaluiere Dateigröße

---

### PHASE 5: Platform-Optimierungen (Priorität: NIEDRIG)
**Aufwand:** Variabel
**Status:** Kontinuierliche Verbesserung

#### Supabase Optimierungen:

**1. Storage Buckets für Bilder**
- Aktuell: Bilder als Base64 in DB?
- Besser: Supabase Storage Buckets
- Vorteil: CDN, schnellere Ladezeiten, weniger DB-Last

```javascript
// Statt Base64 in DB:
const { data, error } = await supabase.storage
  .from('comic-images')
  .upload(`${projectId}/${chapterId}.jpg`, imageBuffer, {
    contentType: 'image/jpeg',
    cacheControl: '3600',
  });

// Public URL mit CDN:
const publicUrl = supabase.storage
  .from('comic-images')
  .getPublicUrl(`${projectId}/${chapterId}.jpg`).data.publicUrl;
```

**2. Database Indexes**
```sql
-- Schnellere Queries für character_ref_image
CREATE INDEX idx_char_ref_project ON character_ref_image(project_id);
CREATE INDEX idx_char_ref_character ON character_ref_image(character_name);

-- Schnellere Queries für bubble_positions
CREATE INDEX idx_bubble_project_chapter ON comic_bubble_positions(project_id, chapter_id);
```

**3. Row Level Security (RLS)**
```sql
-- Wenn du User-Auth hast:
ALTER TABLE comic_bubble_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own data"
ON comic_bubble_positions
FOR ALL
USING (auth.uid() = user_id);
```

#### Vercel Optimierungen:

**1. Image Optimization**
```typescript
// Nutze Next.js Image Component
import Image from 'next/image';

<Image 
  src={coverImageUrl} 
  width={400} 
  height={600}
  quality={85}
  priority // Für Cover
/>
```

**2. Static Generation wo möglich**
```typescript
// Statische Seiten (Landing, FAQ, etc.)
export const metadata = {
  title: 'ComicStyle.de - Deine Geschichte als Comic',
};

// ISR für dynamische Inhalte
export const revalidate = 3600; // 1 Stunde
```

**3. Edge Functions für API-Calls**
```typescript
// Schnellere API-Calls mit Edge Runtime
export const runtime = 'edge';

export async function GET(request: Request) {
  // Läuft auf Vercel Edge Network (näher am User)
}
```

#### Railway Optimierungen:

**1. Environment Variables Caching**
```javascript
// Einmal laden, nicht bei jedem Request
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;

// Supabase Client einmal initialisieren
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
```

**2. Connection Pooling**
```javascript
// Für Supabase-Verbindungen
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  db: {
    poolSize: 10, // Max 10 gleichzeitige Verbindungen
  },
});
```

**3. Response Compression**
```javascript
const compression = require('compression');
app.use(compression()); // Gzip für alle Responses
```

**4. Logging & Monitoring**
```javascript
// Strukturiertes Logging für Railway
console.log(JSON.stringify({
  level: 'info',
  message: 'Page generated',
  projectId,
  pageNum,
  duration: Date.now() - startTime,
}));
```

**Erfolgs-Kriterien:**
- ✅ Bilder laden 50% schneller (CDN)
- ✅ DB-Queries 30% schneller (Indexes)
- ✅ API-Responses 20% kleiner (Compression)
- ✅ Besseres Monitoring (Structured Logging)

---

## 📊 PRIORITÄTEN-MATRIX

| Phase | Priorität | Aufwand | Impact | Wann |
|-------|-----------|---------|--------|------|
| 1. Bubble Persistence | 🔴 KRITISCH | 2h | 🔥🔥🔥 | SOFORT |
| 2. SSE Fortschritt | 🟡 HOCH | 4-6h | 🔥🔥 | Diese Woche |
| 3. Prompt-Sanitizer | 🟡 MITTEL | 2-3h | 🔥 | Diese Woche |
| 4. PDF-Export | 🟢 MITTEL | 2-3h | 🔥 | Nächste Woche |
| 5. Platform-Opt. | 🔵 NIEDRIG | Variabel | 🔥 | Kontinuierlich |

---

## 🎯 LAUNCH-READY KRITERIEN

### Must-Have (vor Launch):
- ✅ Bubble Persistence (Supabase)
- ✅ SSE Fortschrittsanzeige
- ✅ Generierungszeit <3 Minuten
- ✅ Safety Blocks <15%

### Nice-to-Have (nach Launch):
- PDF-Export vereinfacht (PNG → PDF)
- Prompt-Sanitizer erweitert (Safety Blocks <10%)
- Platform-Optimierungen (CDN, Indexes, etc.)

---

## 📅 ZEITPLAN

### Diese Woche (Mai 9-15):
- **Tag 1-2:** Bubble Persistence (Supabase) - 2h
- **Tag 3-4:** SSE Fortschrittsanzeige - 4-6h
- **Tag 5:** Prompt-Sanitizer erweitern - 2-3h
- **Tag 6-7:** Testing & Bug-Fixes

### Nächste Woche (Mai 16-22):
- **Tag 1-2:** PDF-Export vereinfachen (PNG → PDF) - 2-3h
- **Tag 3-7:** Platform-Optimierungen (kontinuierlich)

### Launch:
- **Ziel:** Ende Mai 2026
- **Voraussetzung:** Must-Have Kriterien erfüllt

---

## 💰 KOSTEN-ÜBERSICHT

### Einmalig:
- OpenAI Tier 2: $50 (bereits bezahlt) ✅

### Monatlich:
- Supabase: Free Tier (ausreichend für Start)
- Vercel: Free Tier (ausreichend für Start)
- Railway: ~$5-10/Monat (Backend)

### Pro Comic (nach Optimierungen):
- Struktur (GPT-4o): $0.02
- Cover: $0.20
- 5 Pages (parallel): $1.00
- Retries (weniger durch Sanitizer): $0.05
- **Total: ~$1.27** (vorher $1.45)

**Einsparung durch Optimierungen:** -$0.18 pro Comic

---

## 📝 NOTIZEN

### Wichtige Erinnerungen:
1. **Supabase, Vercel, Railway besser nutzen** - Geschwindigkeit, Performance, Speichern
2. **Bubble-Tests laufen** - User testet gerade
3. **Tier 2 bereits aktiv** - Sollte schneller sein
4. **Prompt-Sanitizer vorhanden** - Kann erweitert werden

### Nächste Schritte:
1. Warte auf Bubble-Test-Ergebnisse
2. Implementiere Bubble Persistence (Supabase)
3. Implementiere SSE Fortschrittsanzeige
4. Erweitere Prompt-Sanitizer

---

**Erstellt:** 9. Mai 2026
**Status:** Bereit zur Umsetzung
**Ziel:** Launch Ende Mai 2026

---

## 🚀 QUICK START

**Heute:**
1. Bubble-Test abwarten
2. Supabase Schema erstellen (5 Min)
3. Backend API implementieren (30 Min)

**Diese Woche:**
1. Frontend Integration (1h)
2. SSE Fortschrittsanzeige (4-6h)
3. Prompt-Sanitizer erweitern (2-3h)

**Nächste Woche:**
1. PDF-Export vereinfachen (2-3h)
2. Platform-Optimierungen starten

**Launch:**
- Ende Mai 2026 ✅
