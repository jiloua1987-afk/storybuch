# Was geht wohin? - Komplette Übersicht
*Stand: 3. Mai 2026 - Nach Wizard-Umbau*

## 📊 Haupttabelle: User Input → GPT Verwendung

| **Feld** | **Step** | **Gespeichert in** | **Gesendet an Backend** | **Cover** | **Seiten** | **Ending** | **Zweck** |
|----------|----------|-------------------|------------------------|-----------|-----------|-----------|-----------|
| **Kategorie** | 1 | `guidedAnswers.category` | `category` | ❌ | ❌ | ❌ | Tone-Mapping + Momente-Vorschläge |
| **Stil** | 1 | `comicStyle` | `comicStyle` | ❌ | ✅ | ❌ | Mood-Modifier (Action/Emotional/Humor) |
| **Foto-Modus** | 1 | `photoMode` | `photoMode` | ✅ | ✅ | ❌ | Steuert Character-Handling |
| **Familienbild** | 1 | `referenceImageUrls[0]` | `referenceImageUrls[0]` | ✅ | ✅ | ❌ | **images.edit() für Cover + Seiten** |
| **Einzelfotos** | 1 | `referenceImageUrls[]` | `referenceImageUrls[]` | ✅ | ✅ | ❌ | **Composite → images.edit()** |
| **Figuren-Namen** | 1 | `characters[].name` | `characters[].name` | ✅ | ✅ | ❌ | Bei Einzelfotos: Name für Foto-Zuordnung |
| **Titel** | 2 | `title` | `title` | ❌ | ❌ | ❌ | Nur für UI/PDF |
| **Momente** | 2 | `guidedAnswers.specialMoments` | `guidedAnswers.specialMoments` | ❌ | ✅ | ❌ | **1 GPT Call pro Moment = 1 Seite** |
| **Moment-Titel** | 2 | Teil von `specialMoments` | Teil von `specialMoments` | ❌ | ✅ | ❌ | Seitentitel |
| **Moment-Beschreibung** | 2 | Teil von `specialMoments` | Teil von `specialMoments` | ❌ | ✅ | ❌ | Szenen-Details für Panels |
| **Dialoge** | 2 | `dialogMode` + `customDialogs[]` | `dialogMode` + `customDialogs[]` | ❌ | ✅ | ❌ | Vorgegebene Dialoge in Panels |
| **Freitext** | 2 | `storyInput` | `storyInput` | ❌ | ✅ | ✅ | Story-Context für GPT |
| **Widmung** | 3 | `dedication` | `dedication` | ❌ | ❌ | ✅ | Widmungstext auf letzter Seite |
| **Widmung Von** | 3 | `dedicationFrom` | `dedicationFrom` | ❌ | ❌ | ✅ | Absender der Widmung |
| **Sprache** | - | `language` | `language` | ❌ | ✅ | ✅ | Dialoge + Widmung in Deutsch/Englisch |

---

## 🎨 COVER GENERATION - Was wird verwendet?

### **Modus 1: Familienbild** (✅ Bewährt - funktioniert super!)

```javascript
// INPUT vom Frontend:
{
  photoMode: "family",
  referenceImageUrls: [
    { label: "family", url: "https://supabase.../family.jpg" }
  ]
}

// BACKEND VERARBEITUNG:
1. Charaktere aus Story extrahieren (GPT-4.1)
   Input: storyInput + guidedAnswers.specialMoments
   Output: [{ name: "Jil", age: 28 }, { name: "Sally", age: 26 }]

2. Jeden Charakter aus Familienbild beschreiben (GPT-4.1 Vision)
   Input: Familienbild + "Describe person ~28 years old"
   Output: "Jil: 28 years old, brown hair, brown eyes..."

3. Cover erstellen (images.edit)
   Input Image: Familienbild
   Prompt: 
     - COMIC_STYLE (Bande Dessinée)
     - "REDRAW everyone as comic characters"
     - "Draw ALL characters: Jil, Sally"
     - Character descriptions
     - Setting: Mediterranean
   Output: Cover im Comic-Stil
```

**Was wird verwendet:**
- ✅ Familienbild → **images.edit()** (Basis für Cover)
- ✅ Momente → Character-Extraktion
- ✅ Freitext → Character-Extraktion
- ✅ Stil → Mood-Modifier
- ❌ Titel → Nicht verwendet
- ❌ Dialoge → Nicht verwendet

---

### **Modus 2: Einzelfotos** (🆕 Neu)

```javascript
// INPUT vom Frontend:
{
  photoMode: "individual",
  characters: [
    { name: "Jil" },
    { name: "Sally" }
  ],
  referenceImageUrls: [
    { label: "Jil", url: "https://supabase.../jil.jpg" },
    { label: "Sally", url: "https://supabase.../sally.jpg" }
  ]
}

// BACKEND VERARBEITUNG:
1. Namen direkt vom Frontend nutzen (KEIN GPT-Raten!)
   characters = [{ name: "Jil" }, { name: "Sally" }]

2. Jedes Foto einzeln beschreiben (GPT-4.1 Vision)
   Input: Jil-Foto + "Describe this person"
   Output: "Jil: adult, brown hair, brown eyes..."

3. Composite Image erstellen (Sharp)
   Input: Jil-Foto + Sally-Foto
   Output: Side-by-side Composite (beide Fotos nebeneinander)

4. Cover erstellen (images.edit)
   Input Image: Composite
   Prompt:
     - COMIC_STYLE
     - "REDRAW both people as comic characters"
     - "Left person is Jil: ..."
     - "Right person is Sally: ..."
     - "Draw BOTH together in Mediterranean setting"
   Output: Cover im Comic-Stil
```

**Was wird verwendet:**
- ✅ Einzelfotos → **Composite → images.edit()** (Basis für Cover)
- ✅ Figuren-Namen → Direkt vom Frontend (kein GPT-Raten!)
- ✅ Stil → Mood-Modifier
- ❌ Momente → Nicht verwendet für Cover
- ❌ Titel → Nicht verwendet
- ❌ Dialoge → Nicht verwendet

---

### **Modus 3: Keine Fotos**

```javascript
// INPUT vom Frontend:
{
  photoMode: "none"
}

// BACKEND VERARBEITUNG:
1. Charaktere aus Story extrahieren + beschreiben (GPT-4.1)
   Input: storyInput + guidedAnswers.specialMoments
   Output: [
     { name: "Jil", age: 28, visual_anchor: "28 years old, brown hair..." }
   ]

2. Cover erstellen (images.generate)
   Prompt:
     - COMIC_STYLE
     - "Comic book COVER"
     - "Draw characters: Jil: 28 years old, brown hair..."
     - Setting: Mediterranean
   Output: Cover im Comic-Stil (ohne Foto-Referenz)
```

**Was wird verwendet:**
- ✅ Momente → Character-Extraktion
- ✅ Freitext → Character-Extraktion
- ✅ Stil → Mood-Modifier
- ❌ Fotos → Keine
- ❌ Titel → Nicht verwendet

---

## 📄 SEITEN GENERATION - Was wird verwendet?

### **Für jede Seite:**

```javascript
// INPUT:
{
  page: {
    title: "Das erste Treffen",
    location: "library",
    panels: [
      { nummer: 1, szene: "Jil reaches for book...", dialog: "Entschuldigung", speaker: "Jil" }
    ]
  },
  characters: [
    { name: "Jil", visual_anchor: "28 years old, brown hair...", inPhoto: true }
  ],
  coverImageUrl: "https://supabase.../cover.png",
  comicStyle: "emotional"
}

// BACKEND VERARBEITUNG:
1. Age Context Detection
   Input: page.title + panel descriptions
   Output: { ageContext: "current", useReference: true }

2. Reference Strategy
   Priority:
   a) Age context: young/middle → NO reference (oder Cover mit Age Modifier)
   b) Cover (wenn alle Charaktere im Foto) → beste Konsistenz
   c) Multi-photo mode → Cover + Character descriptions
   d) Single photo → Style reference
   e) Generate only → keine Referenz

3. Image Generation (images.edit oder images.generate)
   Input Image: Cover (wenn verfügbar)
   Prompt:
     - COMIC_STYLE
     - Mood (emotional/action/humor)
     - Character descriptions
     - Panel descriptions
     - Outfit (basierend auf Location)
   Output: Seiten-Bild

4. Quality Check (GPT-4.1 Vision)
   Input: Generiertes Bild
   Output: "ok" oder "wrong" (Stil-Check)
   → Bei "wrong": Retry mit stärkerem Prompt

5. Panel Position Detection (GPT-4.1 Vision)
   Input: Generiertes Bild
   Output: Panel-Koordinaten (%, für Sprechblasen)
```

**Was wird verwendet:**
- ✅ **Cover** → **Hauptreferenz für alle Seiten** (beste Konsistenz!)
- ✅ Momente → Panel-Beschreibungen
- ✅ Dialoge → Panel-Dialoge
- ✅ Stil → Mood-Modifier
- ✅ Character descriptions → Aus Cover-Generierung
- ❌ Titel → Nicht verwendet
- ❌ Familienbild direkt → Nur über Cover

---

## 💝 ENDING GENERATION - Was wird verwendet?

```javascript
// INPUT:
{
  storyInput: "...",
  guidedAnswers: { specialMoments: "...", ... },
  tone: "romantisch",
  language: "de",
  dedication: "Für Dich, lieber Werner...",
  dedicationFrom: "Deine Familie"
}

// GPT CALL:
Prompt:
  - "Write personal dedication in German"
  - "Max 2-3 sentences"
  - "Address main person directly"
  - "Tone: romantic and tender"
  - Story context
  - User dedication (wenn vorhanden)

Output: "Für Dich, Werner. Möge die Erinnerung an..."
```

**Was wird verwendet:**
- ✅ Freitext → Story-Context
- ✅ Momente → Story-Context
- ✅ Widmung → User-Input (optional)
- ✅ Widmung Von → Absender
- ✅ Kategorie → Tone-Mapping
- ❌ Fotos → Nicht verwendet
- ❌ Titel → Nicht verwendet

---

## 🔑 WICHTIGSTE ERKENNTNISSE

### **1. Cover ist die Hauptreferenz für alle Seiten!**
- ✅ Cover wird aus Familienbild ODER Composite erstellt
- ✅ Alle Folgeseiten nutzen Cover als Referenz
- ✅ Das garantiert Konsistenz über alle Seiten

### **2. Familienbild-Modus funktioniert wie bisher!**
- ✅ 1 Foto hochladen
- ✅ GPT extrahiert Charaktere aus Story
- ✅ GPT beschreibt Charaktere aus Foto
- ✅ Cover wird mit images.edit() erstellt
- ✅ Seiten nutzen Cover als Referenz
- **KEINE ÄNDERUNG zum alten System!**

### **3. Einzelfotos-Modus ist neu und robuster!**
- ✅ Namen kommen vom Frontend (kein GPT-Raten!)
- ✅ Composite wird aus beiden Fotos erstellt
- ✅ Cover wird mit images.edit() + Composite erstellt
- ✅ Seiten nutzen Cover als Referenz
- **VORTEIL: Kein Name-Matching mehr nötig!**

### **4. Was NICHT für Cover verwendet wird:**
- ❌ Titel (nur für UI/PDF)
- ❌ Dialoge (nur für Seiten)
- ❌ Widmung (nur für Ending)
- ❌ Spezifische Fragen (wurden entfernt)

### **5. Was für Seiten verwendet wird:**
- ✅ **Cover** (Hauptreferenz!)
- ✅ Momente (Panel-Beschreibungen)
- ✅ Dialoge (Panel-Dialoge)
- ✅ Stil (Mood-Modifier)
- ✅ Character descriptions (aus Cover)

---

## ✅ Garantie: Familienbild funktioniert weiterhin!

**Alter Ablauf (vor Umbau):**
1. User lädt Familienbild hoch
2. GPT extrahiert Charaktere aus Story
3. GPT beschreibt Charaktere aus Foto
4. Cover: images.edit() mit Familienbild
5. Seiten: Cover als Referenz

**Neuer Ablauf (nach Umbau):**
1. User lädt Familienbild hoch ← **GLEICH**
2. GPT extrahiert Charaktere aus Story ← **GLEICH**
3. GPT beschreibt Charaktere aus Foto ← **GLEICH**
4. Cover: images.edit() mit Familienbild ← **GLEICH**
5. Seiten: Cover als Referenz ← **GLEICH**

**ERGEBNIS: 100% identisch!**

---

## 📋 Zusammenfassung für User

**Für Cover:**
- Familienbild → images.edit() mit Foto
- Einzelfotos → images.edit() mit Composite
- Keine Fotos → images.generate() ohne Foto

**Für Seiten:**
- Immer Cover als Referenz (beste Konsistenz!)
- Momente → Panel-Beschreibungen
- Dialoge → Panel-Dialoge
- Stil → Mood-Modifier

**Für Ending:**
- Freitext + Momente → Story-Context
- Widmung → User-Input
- Kategorie → Tone

**Was NICHT verwendet wird:**
- Titel → Nur UI/PDF
- Spezifische Fragen → Entfernt
