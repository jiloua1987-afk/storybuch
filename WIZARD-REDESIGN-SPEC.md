# Wizard Redesign Spezifikation
*Für morgen: 3. Mai 2026*

## 🎯 Ziel

**Wizard vereinfachen** und **Multi-Photo Problem lösen** durch:
1. Charaktere explizit erfassen (kein GPT-Raten)
2. Redundante Felder entfernen
3. Logischeren Flow: Figuren → Stil → Momente
4. **Familienbild UND Einzelfotos unterstützen**

---

## 🆕 Neue Wizard-Struktur

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
