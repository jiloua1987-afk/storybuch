# GPT Data Flow - Was geht wohin?
*Stand: 3. Mai 2026 - Nach Wizard-Umbau*

> **📋 Siehe auch:**
> - **[GPT-DATA-FLOW-TABLE.md](./GPT-DATA-FLOW-TABLE.md)** - Komplette Tabelle mit allen Feldern
> - **[VISUAL-DATA-FLOW.md](./VISUAL-DATA-FLOW.md)** - Visueller Datenfluss mit Diagrammen

## 📊 Übersicht: User Input → GPT Calls

| **User Input** | **Gespeichert in** | **Gesendet an Backend als** | **Verwendet in GPT Call** | **Zweck** |
|----------------|-------------------|----------------------------|--------------------------|-----------|
| **Kategorie** (z.B. Liebesgeschichte) | `project.guidedAnswers.category` | `category` | ❌ Nicht direkt | Tone-Mapping (romantisch) |
| **Stil** (z.B. Emotional) | `project.comicStyle` | `comicStyle` | ✅ Structure, Page | Mood-Modifier im Prompt |
| **Foto-Modus** (Familie/Einzeln/Keine) | `project.photoMode` | `photoMode` | ❌ Nicht direkt | Steuert Character-Handling |
| **Familienbild** | `project.referenceImageUrls[0]` | `referenceImageUrls[0]` | ✅ Character Description, Cover, Page | Basis für images.edit() |
| **Einzelfotos** | `project.referenceImageUrls[]` | `referenceImageUrls[]` | ✅ Character Description, Cover, Page | Pro Person 1 Foto |
| **Figuren-Namen** (bei Einzeln) | `project.characters[].name` | `characters[].name` | ✅ Character Description | Name für Foto-Beschreibung |
| **Titel** | `project.title` | `title` | ❌ Nicht direkt | Nur für UI/Cover-Text |
| **Momente** | `project.guidedAnswers.specialMoments` | `guidedAnswers.specialMoments` | ✅ Structure (1 GPT call pro Moment) | Jeder Moment = 1 Seite |
| **Moment-Titel** | `moments[].title` | Teil von `specialMoments` | ✅ Structure | Seitentitel |
| **Moment-Beschreibung** | `moments[].description` | Teil von `specialMoments` | ✅ Structure | Szenen-Details |
| **Dialoge** (Auto/Custom) | `project.dialogMode` | `dialogMode` | ❌ Nicht direkt | Steuert Dialog-Generierung |
| **Custom Dialoge** | `project.customDialogs[]` | `customDialogs[]` | ✅ Structure | Vorgegebene Dialoge |
| **Freitext** | `project.storyInput` | `storyInput` | ✅ Structure, Character Extraction | Story-Context |
| **Sprache** | `project.language` | `language` | ✅ Structure, Page, Ending | Dialoge in Deutsch/Englisch/etc. |
| **Widmung** | `project.dedication` | `dedication` | ✅ Ending | Widmungstext |

---

## 🔄 GPT Calls im Detail

### 1️⃣ **POST /api/comic/structure** - Story-Struktur erstellen

#### Input vom Frontend:
```javascript
{
  photoMode: "family" | "individual" | "none",
  characters: [{ name: "Jil" }, { name: "Sally" }],  // Nur bei "individual"
  referenceImageUrls: [{ label: "family", url: "..." }],  // Bei "family"
  // ODER
  referenceImageUrls: [
    { label: "Jil", url: "..." },
    { label: "Sally", url: "..." }
  ],  // Bei "individual"
  storyInput: "...",  // Bei Freitext-Modus
  guidedAnswers: {
    category: "liebe",
    specialMoments: "Das erste Treffen: In der Bibliothek... | Der Antrag: Am Main...",
    characters: "Jil, Sally"  // Nur Info, nicht verwendet
  },
  comicStyle: "emotional",
  language: "de"
}
```

#### GPT Calls:

**A) Character Extraction (abhängig von photoMode):**

**Modus 1: Family Photo** (✅ Wie bisher - funktioniert!)
```javascript
// Call 1: Charaktere aus Story extrahieren
GPT-4.1: "Extract ALL characters from story"
Input: storyInput + guidedAnswers (als Text)
Output: [{ name: "Jil", age: 28 }, { name: "Sally", age: 26 }]

// Call 2: Jeden Charakter aus Familienbild beschreiben
GPT-4.1 Vision (pro Charakter):
Input: Familienbild + "Describe person who is ~28 years old"
Output: "Jil: 28 years old, brown hair, brown eyes..."
```

**Modus 2: Individual Photos** (🆕 Neu)
```javascript
// Keine Character-Extraktion! Namen kommen vom Frontend
characters = [{ name: "Jil" }, { name: "Sally" }]  // Vom Frontend

// Call: Jeden Charakter aus seinem Foto beschreiben
GPT-4.1 Vision (pro Charakter):
Input: Jil-Foto + "Describe this person"
Output: "Jil: adult, brown hair, brown eyes..."
```

**Modus 3: No Photos** (✅ Wie bisher)
```javascript
// Call: Charaktere aus Story extrahieren + beschreiben
GPT-4.1: "Extract ALL characters and describe them"
Input: storyInput + guidedAnswers
Output: [{ name: "Jil", age: 28, visual_anchor: "detailed description..." }]
```

**B) Page Structure (für jeden Moment):**
```javascript
// Pro Moment 1 GPT Call
GPT-4.1 (pro Moment):
Input: 
  - Moment: "Das erste Treffen: In der Bibliothek..."
  - Story Context: storyInput + guidedAnswers
  - Language: "German"
  - Tone: "romantic and tender"
  - Style: "emotional"
Output: {
  id: "page1",
  title: "Das erste Treffen",
  location: "library",
  panels: [
    { nummer: 1, szene: "Jil reaches for book...", dialog: "Entschuldigung...", speaker: "Jil" }
  ]
}
```

#### Output:
```javascript
{
  pages: [{ id: "page1", title: "...", panels: [...] }],
  characters: [
    { name: "Jil", age: 28, visual_anchor: "Jil: 28 years old, brown hair...", inPhoto: true },
    { name: "Sally", age: 26, visual_anchor: "Sally: 26 years old, ...", inPhoto: true }
  ]
}
```

---

### 2️⃣ **POST /api/comic/cover** - Cover erstellen

#### Input:
```javascript
{
  characters: [
    { name: "Jil", visual_anchor: "Jil: 28 years old, brown hair..." },
    { name: "Sally", visual_anchor: "Sally: 26 years old, ..." }
  ],
  referenceImages: ["base64..."],  // Fallback
  referenceImageUrls: [{ label: "family", url: "..." }],
  location: "Mediterranean setting"
}
```

#### GPT Call:

**Family Photo Mode:**
```javascript
// images.edit() mit Familienbild
OpenAI images.edit:
Input Image: Familienbild
Prompt: `
  ${COMIC_STYLE}
  REDRAW everyone as comic characters.
  Draw ALL characters: Jil, Sally
  Character descriptions:
  - Jil: 28 years old, brown hair...
  - Sally: 26 years old, ...
  Setting: Mediterranean
  NO text, NO title
`
Output: Cover-Bild (Comic-Stil)
```

**Individual Photos Mode:**
```javascript
// Composite Image erstellen aus beiden Fotos
Sharp: Jil-Foto + Sally-Foto → Side-by-side Composite

// images.edit() mit Composite
OpenAI images.edit:
Input Image: Composite (Jil links, Sally rechts)
Prompt: `
  ${COMIC_STYLE}
  REDRAW both people as comic characters.
  Left person is Jil: ...
  Right person is Sally: ...
  Draw BOTH together in Mediterranean setting
  NO text, NO title
`
Output: Cover-Bild
```

**No Photos Mode:**
```javascript
// images.generate() ohne Foto
OpenAI images.generate:
Prompt: `
  ${COMIC_STYLE}
  Comic book COVER.
  Draw characters:
  - Jil: 28 years old, brown hair...
  - Sally: 26 years old, ...
  Setting: Mediterranean
  NO text, NO title
`
Output: Cover-Bild
```

---

### 3️⃣ **POST /api/comic/page** - Seite erstellen

#### Input:
```javascript
{
  page: {
    id: "page1",
    title: "Das erste Treffen",
    location: "library",
    panels: [
      { nummer: 1, szene: "Jil reaches for book...", dialog: "Entschuldigung", speaker: "Jil" }
    ]
  },
  characters: [
    { name: "Jil", visual_anchor: "...", inPhoto: true },
    { name: "Sally", visual_anchor: "...", inPhoto: true }
  ],
  coverImageUrl: "https://supabase.../cover.png",
  referenceImageUrls: [{ label: "family", url: "..." }],
  comicStyle: "emotional"
}
```

#### GPT Calls:

**A) Image Generation:**
```javascript
// Age Context Detection
getAgeContext("Das erste Treffen", "Jil reaches for book...")
→ { ageContext: "current", useReference: true }

// Reference Strategy
if (coverImageUrl exists && all characters in photo) {
  reference = coverImageUrl  // ✅ Nutzt Cover
  refSource = "cover"
}

// images.edit() mit Cover
OpenAI images.edit:
Input Image: Cover
Prompt: `
  ${COMIC_STYLE}
  ${MOOD_MOD.emotional}
  
  Comic page - 3 panels
  
  CHARACTERS:
  - Jil: 28 years old, brown hair...
  - Sally: 26 years old, ...
  
  PANELS:
  Panel 1: Jil reaches for book on high shelf
  Panel 2: Sally notices Jil struggling
  Panel 3: They make eye contact
  
  NO text, NO speech bubbles
`
Output: Seiten-Bild
```

**B) Quality Check:**
```javascript
GPT-4.1 Vision:
Input: Generiertes Seiten-Bild
Prompt: "Is this Bande Dessinée style or manga/photorealistic?"
Output: "ok" oder "wrong"

// Wenn "wrong" → Retry mit stärkerem Prompt
```

**C) Panel Position Detection:**
```javascript
GPT-4.1 Vision:
Input: Generiertes Seiten-Bild
Prompt: "Comic page with 3 panels. Return positions as % coordinates."
Output: {
  panels: [
    { nummer: 1, top: 5, left: 0, width: 100, height: 30 },
    { nummer: 2, top: 35, left: 0, width: 50, height: 30 },
    { nummer: 3, top: 35, left: 50, width: 50, height: 30 }
  ]
}
```

---

### 4️⃣ **POST /api/comic/ending** - Widmung erstellen

#### Input:
```javascript
{
  storyInput: "...",
  guidedAnswers: { ... },
  tone: "romantisch",
  language: "de",
  dedication: "Für Dich, lieber Werner...",  // Optional vom User
  dedicationFrom: "Deine Familie"
}
```

#### GPT Call:
```javascript
GPT-4.1:
Prompt: `
  Write a personal dedication for last page in German.
  Max 2-3 sentences, address main person directly.
  Tone: romantic and tender
  Story: ${storyInput}
  ${dedication ? "User dedication: " + dedication : ""}
`
Output: "Für Dich, Werner. Möge die Erinnerung an..."
```

---

## 🔑 Wichtige Unterschiede Alt vs. Neu

| **Aspekt** | **Alt (vor Umbau)** | **Neu (nach Umbau)** |
|------------|-------------------|---------------------|
| **Character-Extraktion** | Immer aus Story | Abhängig von photoMode |
| **Character-Namen** | GPT rät aus Story | Bei "individual": vom Frontend |
| **Name-Matching** | Nötig (fehleranfällig!) | Nicht mehr nötig bei "individual" |
| **Family Photo** | ✅ Funktioniert | ✅ Funktioniert weiterhin identisch |
| **Individual Photos** | ❌ Matching-Problem | ✅ Kein Matching mehr nötig |
| **Spezifische Fragen** | Ja (Kennenlernen, etc.) | ❌ Entfernt |
| **Momente** | In guidedAnswers versteckt | Fokus in Step 2 |

---

## ✅ Was bei Family Photo gleich bleibt:

**Alles!** Der Family Photo Mode funktioniert **exakt wie bisher**:

1. User lädt 1 Familienbild hoch
2. Backend extrahiert Charaktere aus Story (GPT-4.1)
3. Backend beschreibt jeden Charakter aus Familienbild (GPT-4.1 Vision)
4. Cover wird mit images.edit() + Familienbild erstellt
5. Seiten nutzen Cover als Referenz

**Kein Unterschied zum alten System!**

---

## 🆕 Was bei Individual Photos neu ist:

1. User gibt Namen ein: "Jil", "Sally"
2. User lädt pro Person 1 Foto hoch
3. Backend nutzt Namen **direkt vom Frontend** (kein GPT-Raten!)
4. Backend beschreibt jedes Foto (GPT-4.1 Vision)
5. Cover wird aus Composite erstellt (beide Fotos side-by-side)
6. Seiten nutzen Cover als Referenz

**Vorteil:** Kein Name-Matching mehr nötig → 100% korrekt!

---

**Zusammenfassung:** Family Photo funktioniert wie bisher, Individual Photos ist neu und robuster!
