# Wizard Redesign Spezifikation
*Für morgen: 3. Mai 2026*

## 🎯 Ziel

**Wizard drastisch vereinfachen:**
1. Nur 2 Content-Steps (statt 3-4)
2. Fokus auf Momente & Dialoge
3. Alle spezifischen Fragen raus
4. Bilder direkt in Step 1

---

## 🆕 Neue Wizard-Struktur (5 Steps)

### **Step 1: Geschichte, Stil & Bilder** 🎨📸

**UI:**
```
┌─────────────────────────────────────────────────────────┐
│ 1. Um was für eine Geschichte handelt es sich?         │
├─────────────────────────────────────────────────────────┤
│ [Liebesgeschichte] [Familie] [Urlaub] [Feier]          │
│ [Biografie] [Freundschaft] [Sonstiges]                 │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 2. Welchen Stil soll dein Comic haben?                 │
├─────────────────────────────────────────────────────────┤
│ [Action] [Emotional] [Humor]                           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 3. Bilder (optional)                                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ○ Familienbild / Gruppenfoto                          │
│    ✅ Empfohlen - funktioniert am besten!              │
│    [📷 Foto hochladen]                                  │
│    [Vorschau wenn hochgeladen]                         │
│                                                         │
│  ○ Einzelne Hauptfiguren                               │
│    [+ Figur hinzufügen]                                │
│    ┌─────────────────────────────┐                     │
│    │ Name: [Jil__________]       │                     │
│    │ Foto: [📷 Hochladen]        │                     │
│    └─────────────────────────────┘                     │
│                                                         │
│  ○ Keine Bilder                                         │
│                                                         │
└─────────────────────────────────────────────────────────┘

[Weiter →]
```

**Datenstruktur:**
```typescript
{
  category: "liebe",
  comicStyle: "emotional",
  photoMode: "family" | "individual" | "none",
  familyPhoto: File | null,
  characters: [
    { id: "c1", name: "Jil", photo: File | null }
  ]
}
```

**Was raus ist:**
- ❌ Alle spezifischen Fragen (Kennenlernen, Zusammen, Personen, Zeitraum)
- ❌ Freitext-Modus (kommt in Step 2)
- ❌ Titel (kommt in Step 2)

---

### **Step 2: Inhalt** ✍️

**UI:**
```
┌─────────────────────────────────────────────────────────┐
│ Titel deines Comics                                     │
├─────────────────────────────────────────────────────────┤
│ [z. B. Unser Sommer auf Sardinien__________________]   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Wie möchtest du deine Geschichte erzählen?             │
├─────────────────────────────────────────────────────────┤
│  ○ Momente & Dialoge (empfohlen)                       │
│  ○ Freitext                                             │
└─────────────────────────────────────────────────────────┘

[Wenn "Momente & Dialoge" gewählt:]

┌─────────────────────────────────────────────────────────┐
│ Besondere Momente                                       │
├─────────────────────────────────────────────────────────┤
│ 💡 Vorschläge für Liebesgeschichte:                     │
│ [+ Das erste Treffen] [+ Der Antrag] [+ Die Hochzeit]  │
│                                                         │
│ [+ Eigenen Moment hinzufügen]                          │
│                                                         │
│ ┌─────────────────────────────────┐                    │
│ │ Moment #1                   [×] │                    │
│ ├─────────────────────────────────┤                    │
│ │ Titel: [Das erste Treffen___]   │                    │
│ │ Beschreibung:                   │                    │
│ │ [In der Bibliothek, Jil sucht  │                    │
│ │  ein Buch...]                   │                    │
│ └─────────────────────────────────┘                    │
│                                                         │
│ 💡 Jeder Moment wird eine eigene Seite                 │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Dialoge                                                 │
├─────────────────────────────────────────────────────────┤
│  ○ Automatisch vorschlagen                             │
│  ○ Eigene Dialoge eingeben                             │
│                                                         │
│ [Wenn "Eigene Dialoge":]                               │
│ [+ Dialog hinzufügen]                                  │
│ ┌─────────────────────────────────┐                    │
│ │ Sprecher: [Jil__________]       │                    │
│ │ Text: [Warte, kennst du mich?_] │                    │
│ └─────────────────────────────────┘                    │
└─────────────────────────────────────────────────────────┘

[Wenn "Freitext" gewählt:]

┌─────────────────────────────────────────────────────────┐
│ Deine Geschichte                                        │
├─────────────────────────────────────────────────────────┤
│ [Stichpunkte reichen! z. B.:                           │
│  Toskana, Sommer 2023, Emma 6 Jahre,                   │
│  erster Gelato, Sonnenuntergang am Strand...]          │
│                                                         │
│                                                         │
│                                                         │
└─────────────────────────────────────────────────────────┘

[← Zurück]  [Weiter →]
```

**Datenstruktur:**
```typescript
{
  title: "Unser Sommer auf Sardinien",
  contentMode: "moments" | "freetext",
  
  // Wenn "moments":
  moments: [
    { id: "m1", title: "Das erste Treffen", description: "..." }
  ],
  dialogMode: "auto" | "custom",
  customDialogs: [
    { id: "d1", speaker: "Jil", text: "..." }
  ],
  
  // Wenn "freetext":
  storyInput: "Toskana, Sommer 2023..."
}
```

**Momente-Vorschläge:**
```typescript
const MOMENT_SUGGESTIONS = {
  liebe: [
    "Das erste Treffen",
    "Der erste Kuss",
    "Der Antrag",
    "Die Hochzeit",
    "Heute"
  ],
  familie: [
    "Morgens am Frühstückstisch",
    "Spielplatz-Abenteuer",
    "Gute-Nacht-Geschichte",
    "Familienausflug"
  ],
  urlaub: [
    "Ankunft am Urlaubsort",
    "Am Strand",
    "Kulinarisches Highlight",
    "Unvergesslicher Ausflug"
  ],
  biografie: [
    "Kindheit",
    "Jugend",
    "Berufseinstieg",
    "Familie gründen",
    "Heute"
  ],
  feier: [
    "Die Vorbereitung",
    "Die Überraschung",
    "Die Feier",
    "Der Höhepunkt"
  ],
  freunde: [
    "Wie wir uns kennenlernten",
    "Unser erstes Abenteuer",
    "Ein unvergesslicher Tag",
    "Heute"
  ]
};
```

---

### **Step 3: Widmung** 💝
*(Unverändert)*

---

### **Step 4: Vorschau & Bearbeiten** 👁️
*(Unverändert - wie aktuell Step 5)*

---

### **Step 5: Bestellen** 🛒
*(Unverändert - wie aktuell Step 6)*

---

## 📊 Vergleich Alt vs. Neu

| **Aspekt** | **Alt** | **Neu** |
|------------|---------|---------|
| **Content Steps** | 3 (Story, Upload, Widmung) | 2 (Basis, Inhalt) |
| **Felder in Step 1** | 8-10 (je nach Kategorie) | 3 (Kategorie, Stil, Bilder) |
| **Spezifische Fragen** | Ja (Kennenlernen, Zusammen, etc.) | ❌ Nein |
| **Freitext vs. Geführt** | Separate Modi | Zusammen in Step 2 |
| **Bilder** | Eigener Step | In Step 1 integriert |
| **Momente** | In Step 1 versteckt | Fokus in Step 2 |
| **Dialoge** | In Step 1 versteckt | Fokus in Step 2 |

---

## 🔧 Backend-Änderungen

### **Minimal - nur Datenstruktur anpassen:**

```javascript
// Vorher:
const { storyInput, guidedAnswers, ... } = req.body;

// Nachher:
const { 
  category,
  comicStyle,
  photoMode,
  familyPhoto,
  characters,
  title,
  contentMode,
  moments,
  dialogMode,
  customDialogs,
  storyInput  // Nur bei Freitext
} = req.body;

// Story Context bauen:
let storyCtx = "";
if (contentMode === "moments") {
  storyCtx = moments.map(m => `${m.title}: ${m.description}`).join("\n");
} else {
  storyCtx = storyInput;
}
```

**Wichtig:** Backend-Logik bleibt fast identisch!

---

## 📋 Implementierungs-Schritte

### Phase 1: Frontend (3-4 Stunden)

**Step1Story.tsx → Step1Basics.tsx:**
```typescript
// Entfernen:
- Freitext-Modus Toggle
- Titel-Input
- Spezifische Fragen (kennengelernt, zusammen, etc.)
- Momente-Editor
- Dialog-Editor

// Hinzufügen:
- Bilder-Upload (Familie / Einzeln / Keine)
- Figuren-Editor (nur bei "Einzeln")

// Behalten:
- Kategorie-Auswahl
- Stil-Auswahl
```

**Step2Upload.tsx → Step2Content.tsx:**
```typescript
// Entfernen:
- Foto-Upload (ist jetzt in Step 1)
- DSGVO-Checkbox (ist jetzt in Step 1)

// Hinzufügen:
- Titel-Input
- Content-Modus Toggle (Momente / Freitext)
- Momente-Editor (aus Step 1)
- Momente-Vorschläge (neu!)
- Dialog-Editor (aus Step 1)
- Freitext-Textarea (aus Step 1)
```

**Step3Widmung.tsx:**
```typescript
// Unverändert
```

**Step4Generate.tsx → Step4Preview.tsx:**
```typescript
// Unverändert (nur umbenennen)
```

**Step5Preview.tsx → Step5Checkout.tsx:**
```typescript
// Unverändert (nur umbenennen)
```

### Phase 2: Backend (1 Stunde)
- Datenstruktur-Mapping anpassen
- Foto-Handling für beide Modi (Familie / Einzeln)
- Story Context aus Momenten oder Freitext bauen

### Phase 3: Testing (1 Stunde)
- Familienbild-Test
- Einzelfotos-Test
- Momente-Test
- Freitext-Test

---

## ✅ Vorteile

### UX:
- ✅ **Viel einfacher** - nur 2 Content-Steps
- ✅ **Fokus auf Wichtiges** - Momente & Dialoge
- ✅ **Schneller** - weniger Felder
- ✅ **Klarer** - Bilder direkt bei Basis-Infos

### Technisch:
- ✅ **Weniger Code** - spezifische Fragen entfernt
- ✅ **Einfacher zu warten** - weniger Logik
- ✅ **Backend fast unverändert** - nur Mapping anpassen

---

## 🎯 Erfolgs-Kriterien

1. **Wizard ist einfacher:**
   - ✅ Maximal 5 Felder in Step 1
   - ✅ Momente-Vorschläge per Klick
   - ✅ Keine spezifischen Fragen mehr

2. **Familienbild funktioniert:**
   - ✅ 1 Foto hochladen
   - ✅ Cover zeigt alle im Comic-Stil
   - ✅ Seiten konsistent

3. **Einzelfotos funktionieren:**
   - ✅ Pro Person 1 Foto + Name
   - ✅ Cover zeigt alle
   - ✅ Seiten konsistent

---

**Status:** Spezifikation aktualisiert nach User-Feedback
**Wichtig:** Viel einfacher als vorherige Version!

### **Step 1: Figuren & Fotos** 👥

**UI:**
```
Wer kommt in deiner Geschichte vor?

┌─────────────────────────────────────────────────────────┐
│ 📸 Foto-Optionen                                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ○ Familienbild / Gruppenfoto                          │
│    Alle Personen auf einem Foto                        │
│    ✅ Hat bisher super funktioniert!                    │
│    [📷 Foto hochladen]                                  │
│                                                         │
│  ○ Einzelne Fotos                                       │
│    Jede Person separat fotografiert                     │
│    💡 Für bessere Gesichtserkennung                     │
│                                                         │
│  ○ Keine Fotos                                          │
│    Charaktere werden aus Beschreibung generiert         │
│                                                         │
└─────────────────────────────────────────────────────────┘

[+ Figur hinzufügen]

┌─────────────────────────────────────┐
│ Figur #1                        [×] │
├─────────────────────────────────────┤
│ Name: [Jil________________]         │
│ Alter: [28___] (optional)           │
│                                     │
│ [Wenn "Einzelne Fotos" gewählt:]   │
│ Foto: [📷 Hochladen] (optional)     │
│       [Vorschau wenn hochgeladen]   │
│                                     │
│ [Wenn "Familienbild" gewählt:]      │
│ 💡 Wird aus Familienbild erkannt    │
└─────────────────────────────────────┘

💡 Tipp: Familienbilder funktionieren am besten!
```

**Datenstruktur:**
```typescript
photoMode: "family" | "individual" | "none"
familyPhoto: File | null
characters: [
  {
    id: "char-1",
    name: "Jil",
    age: 28,
    photo: File | null,        // Nur bei "individual"
    photoUrl: string | null    // Nach Upload
  }
]
```

**Logik:**

**Modus 1: Familienbild** (✅ Bewährt)
1. User lädt 1 Foto hoch mit allen Personen
2. User gibt Namen ein: "Jil", "Sally"
3. Backend nutzt `images.edit()` mit Familienbild
4. GPT Vision beschreibt Personen basierend auf Alter
5. Cover wird aus Familienbild generiert

**Modus 2: Einzelne Fotos** (Neu)
1. User lädt pro Person 1 Foto hoch
2. Backend erstellt Composite Image (side-by-side)
3. Cover wird aus Composite generiert
4. Seiten nutzen Cover als Referenz

**Modus 3: Keine Fotos**
1. User gibt nur Namen ein
2. GPT generiert Charaktere aus Beschreibung
3. Kein Referenzfoto

**Vorteile:**
- ✅ User sieht beide Optionen
- ✅ Familienbild wird als "bewährt" markiert
- ✅ Flexibilität für verschiedene Use Cases
- ✅ Klare Unterscheidung der Modi

---

### **Step 2: Stil & Kategorie** 🎨

**UI:**
```
Welchen Stil soll dein Comic haben?

[Action] [Emotional] [Humor]

Um was für eine Geschichte handelt es sich?

[Liebesgeschichte] [Familie] [Urlaub] [Biografie] ...
```

**Datenstruktur:**
```typescript
comicStyle: "emotional"
category: "liebe"
```

**Änderung:** Keine Fragen mehr (kennengelernt, zusammen, etc.) → alles in Momenten

---

### **Step 3: Momente** ⭐

**UI:**
```
Welche besonderen Momente sollen vorkommen?

💡 Vorschläge für Liebesgeschichte:
[+ Das erste Treffen] [+ Der erste Kuss] [+ Der Antrag] [+ Die Hochzeit]

[+ Eigenen Moment hinzufügen]

┌─────────────────────────────────────┐
│ Moment #1                       [×] │
├─────────────────────────────────────┤
│ Titel: [Das erste Treffen_______]   │
│ Beschreibung:                       │
│ [In der Bibliothek, Jil sucht ein  │
│  Buch über Architektur...]          │
└─────────────────────────────────────┘

💡 Jeder Moment wird eine eigene Seite
```

**Momente-Vorschläge pro Kategorie:**
```typescript
const MOMENT_SUGGESTIONS = {
  liebe: [
    { title: "Das erste Treffen", desc: "Wo und wie habt ihr euch kennengelernt?" },
    { title: "Der erste Kuss", desc: "Der magische Moment..." },
    { title: "Der Antrag", desc: "Wie wurde der Antrag gemacht?" },
    { title: "Die Hochzeit", desc: "Der schönste Tag..." },
    { title: "Heute", desc: "Ein besonderer Moment aus der Gegenwart" }
  ],
  familie: [
    { title: "Morgens am Frühstückstisch", desc: "" },
    { title: "Spielplatz-Abenteuer", desc: "" },
    { title: "Gute-Nacht-Geschichte", desc: "" },
    { title: "Familienausflug", desc: "" }
  ],
  urlaub: [
    { title: "Ankunft am Urlaubsort", desc: "" },
    { title: "Am Strand", desc: "" },
    { title: "Kulinarisches Highlight", desc: "" },
    { title: "Unvergesslicher Ausflug", desc: "" }
  ],
  biografie: [
    { title: "Kindheit", desc: "Frühe Jahre..." },
    { title: "Jugend", desc: "Schulzeit, erste Liebe..." },
    { title: "Berufseinstieg", desc: "" },
    { title: "Familie gründen", desc: "" },
    { title: "Heute", desc: "" }
  ]
};
```

---

## 🔧 Backend-Änderungen

### **Familienbild-Modus** (wie bisher, funktioniert):
```javascript
if (photoMode === "family" && familyPhotoUrl) {
  // Nutze images.edit() mit Familienbild
  const coverRes = await openai.images.edit({
    image: familyPhotoBuffer,
    prompt: `${COMIC_STYLE}\nDraw ALL characters: ${charNames}...`
  });
}
```

### **Einzelfotos-Modus** (neu):
```javascript
if (photoMode === "individual" && characters.some(c => c.photoUrl)) {
  // Erstelle Composite aus allen Fotos
  const compositeBuffer = await createComposite(
    characters.map(c => c.photoUrl)
  );
  
  // Nutze images.edit() mit Composite
  const coverRes = await openai.images.edit({
    image: compositeBuffer,
    prompt: `${COMIC_STYLE}\nDraw ALL characters: ${charNames}...`
  });
}
```

### **Keine-Fotos-Modus**:
```javascript
if (photoMode === "none") {
  // Nutze images.generate() ohne Referenz
  const coverRes = await openai.images.generate({
    prompt: `${COMIC_STYLE}\nDraw characters: ${charDescriptions}...`
  });
}
```

---

## 📋 Implementierungs-Schritte

### Phase 1: Frontend (3-4 Stunden)
1. ✅ Step1 umbauen: Foto-Modus-Auswahl
2. ✅ Figuren-Editor mit bedingten Feldern
3. ✅ Step2: Nur Stil + Kategorie
4. ✅ Step3: Momente mit Vorschlägen
5. ✅ bookStore: Datenstruktur anpassen

### Phase 2: Backend (2 Stunden)
1. ✅ Foto-Modus-Handling
2. ✅ Familienbild-Logik beibehalten
3. ✅ Einzelfotos-Composite erstellen
4. ✅ Character-Extraktion entfernen

### Phase 3: Testing (1-2 Stunden)
1. ✅ Familienbild-Test (wie bisher)
2. ✅ Einzelfotos-Test (Jil + Sally)
3. ✅ Keine-Fotos-Test
4. ✅ Mixed-Test

---

## ✅ Erfolgs-Kriterien

1. **Familienbild funktioniert weiterhin:**
   - ✅ 1 Foto hochladen mit 2+ Personen
   - ✅ Cover zeigt alle im Comic-Stil
   - ✅ Seiten konsistent

2. **Einzelfotos funktionieren:**
   - ✅ Pro Person 1 Foto
   - ✅ Composite wird erstellt
   - ✅ Cover zeigt alle
   - ✅ Seiten konsistent

3. **UI ist klar:**
   - ✅ User versteht Unterschied
   - ✅ Familienbild als "empfohlen" markiert
   - ✅ Weniger Felder als vorher

---

**Status:** Spezifikation komplett, bereit für Implementierung morgen
**Wichtig:** Familienbild-Modus MUSS weiterhin funktionieren (hat bisher super geklappt)!
