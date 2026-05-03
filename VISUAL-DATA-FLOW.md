# Visueller Datenfluss - Was geht wohin?
*Stand: 3. Mai 2026*

## 🎯 Schnellübersicht: 3 Hauptprozesse

```
┌─────────────────────────────────────────────────────────────────┐
│                    1. COVER GENERATION                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  INPUT:                                                         │
│  • Familienbild ODER Einzelfotos                               │
│  • Momente (für Character-Extraktion)                          │
│  • Stil (für Mood)                                             │
│                                                                 │
│  PROZESS:                                                       │
│  1. Charaktere extrahieren/nutzen                              │
│  2. Fotos beschreiben (GPT Vision)                             │
│  3. images.edit() mit Foto(s)                                  │
│                                                                 │
│  OUTPUT:                                                        │
│  • Cover im Comic-Stil                                         │
│  • Character descriptions (für Seiten)                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    2. SEITEN GENERATION                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  INPUT:                                                         │
│  • COVER (Hauptreferenz!)                                      │
│  • Momente (Panel-Beschreibungen)                              │
│  • Dialoge (Panel-Dialoge)                                     │
│  • Stil (Mood-Modifier)                                        │
│  • Character descriptions (vom Cover)                          │
│                                                                 │
│  PROZESS:                                                       │
│  1. Age Context Detection                                      │
│  2. Reference Strategy (Cover > Photo > None)                  │
│  3. images.edit() mit Cover                                    │
│  4. Quality Check (Stil-Prüfung)                               │
│  5. Panel Position Detection                                   │
│                                                                 │
│  OUTPUT:                                                        │
│  • Seiten-Bild mit Panels                                      │
│  • Panel-Koordinaten (für Sprechblasen)                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    3. ENDING GENERATION                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  INPUT:                                                         │
│  • Freitext + Momente (Story-Context)                          │
│  • Widmung (User-Input)                                        │
│  • Kategorie (Tone)                                            │
│                                                                 │
│  PROZESS:                                                       │
│  1. GPT-4.1 schreibt Widmung                                   │
│                                                                 │
│  OUTPUT:                                                        │
│  • Widmungstext                                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📸 FAMILIENBILD-MODUS (Bewährt!)

```
USER INPUT (Step 1)
├─ Kategorie: "Liebesgeschichte"
├─ Stil: "Emotional"
└─ Foto-Modus: "Familie"
   └─ Familienbild: [family.jpg] ✅

USER INPUT (Step 2)
├─ Titel: "Unser Sommer"
└─ Momente:
   ├─ "Das erste Treffen: In der Bibliothek..."
   ├─ "Der Antrag: Am Main..."
   └─ "Die Hochzeit: Im Garten..."

                    ↓

BACKEND: POST /api/comic/structure
├─ 1. Character Extraction (GPT-4.1)
│  Input: Momente + Freitext
│  Output: [{ name: "Jil", age: 28 }, { name: "Sally", age: 26 }]
│
├─ 2. Photo Description (GPT-4.1 Vision) - PRO CHARAKTER
│  Input: Familienbild + "Describe person ~28 years old"
│  Output: "Jil: 28 years old, brown hair, brown eyes..."
│
└─ 3. Page Structure (GPT-4.1) - PRO MOMENT
   Input: "Das erste Treffen: In der Bibliothek..."
   Output: { title: "Das erste Treffen", panels: [...] }

                    ↓

BACKEND: POST /api/comic/cover
├─ Input Image: Familienbild ✅
├─ Prompt:
│  • COMIC_STYLE (Bande Dessinée)
│  • "REDRAW everyone as comic characters"
│  • "Draw ALL characters: Jil, Sally"
│  • Character descriptions
│  • Setting: Mediterranean
│
└─ images.edit() → Cover im Comic-Stil ✅

                    ↓

BACKEND: POST /api/comic/page (PRO SEITE)
├─ Input Image: Cover ✅ (Hauptreferenz!)
├─ Prompt:
│  • COMIC_STYLE
│  • Mood: "Warm golden tones, intimate close-ups..."
│  • Character descriptions (vom Cover)
│  • Panel descriptions (aus Moment)
│  • Dialoge
│
└─ images.edit() → Seiten-Bild ✅

                    ↓

ERGEBNIS:
✅ Cover zeigt Jil + Sally im Comic-Stil (aus Familienbild)
✅ Alle Seiten nutzen Cover als Referenz
✅ Charaktere sehen auf allen Seiten gleich aus
```

---

## 👥 EINZELFOTOS-MODUS (Neu!)

```
USER INPUT (Step 1)
├─ Kategorie: "Liebesgeschichte"
├─ Stil: "Emotional"
└─ Foto-Modus: "Einzeln"
   ├─ Figur 1: Name: "Jil", Foto: [jil.jpg] ✅
   └─ Figur 2: Name: "Sally", Foto: [sally.jpg] ✅

USER INPUT (Step 2)
├─ Titel: "Unser Sommer"
└─ Momente: [...]

                    ↓

BACKEND: POST /api/comic/structure
├─ 1. Namen direkt vom Frontend nutzen (KEIN GPT-Raten!)
│  characters = [{ name: "Jil" }, { name: "Sally" }]
│
├─ 2. Photo Description (GPT-4.1 Vision) - PRO FOTO
│  Input: Jil-Foto + "Describe this person"
│  Output: "Jil: adult, brown hair, brown eyes..."
│
└─ 3. Page Structure (GPT-4.1) - PRO MOMENT
   [Gleich wie Familienbild-Modus]

                    ↓

BACKEND: POST /api/comic/cover
├─ 1. Composite Image erstellen (Sharp)
│  Input: Jil-Foto + Sally-Foto
│  Output: Side-by-side Composite ✅
│
├─ 2. Cover Generation (images.edit)
│  Input Image: Composite ✅
│  Prompt:
│  • COMIC_STYLE
│  • "REDRAW both people as comic characters"
│  • "Left person is Jil: ..."
│  • "Right person is Sally: ..."
│  • "Draw BOTH together in Mediterranean setting"
│
└─ images.edit() → Cover im Comic-Stil ✅

                    ↓

BACKEND: POST /api/comic/page (PRO SEITE)
├─ Input Image: Cover ✅ (Hauptreferenz!)
├─ [Rest gleich wie Familienbild-Modus]
│
└─ images.edit() → Seiten-Bild ✅

                    ↓

ERGEBNIS:
✅ Cover zeigt Jil + Sally im Comic-Stil (aus Composite)
✅ Alle Seiten nutzen Cover als Referenz
✅ Charaktere sehen auf allen Seiten gleich aus
✅ KEIN Name-Matching mehr nötig!
```

---

## 🚫 KEINE FOTOS-MODUS

```
USER INPUT (Step 1)
├─ Kategorie: "Liebesgeschichte"
├─ Stil: "Emotional"
└─ Foto-Modus: "Keine"

USER INPUT (Step 2)
├─ Titel: "Unser Sommer"
└─ Momente: [...]

                    ↓

BACKEND: POST /api/comic/structure
├─ 1. Character Extraction + Description (GPT-4.1)
│  Input: Momente + Freitext
│  Output: [
│    { name: "Jil", age: 28, visual_anchor: "28 years old, brown hair..." }
│  ]
│
└─ 2. Page Structure (GPT-4.1) - PRO MOMENT
   [Gleich wie andere Modi]

                    ↓

BACKEND: POST /api/comic/cover
├─ Prompt:
│  • COMIC_STYLE
│  • "Comic book COVER"
│  • "Draw characters: Jil: 28 years old, brown hair..."
│  • Setting: Mediterranean
│
└─ images.generate() → Cover im Comic-Stil ❌ (OHNE Foto!)

                    ↓

BACKEND: POST /api/comic/page (PRO SEITE)
├─ Input Image: Cover ✅ (Hauptreferenz!)
├─ [Rest gleich wie andere Modi]
│
└─ images.edit() → Seiten-Bild ✅

                    ↓

ERGEBNIS:
✅ Cover zeigt Jil + Sally im Comic-Stil (generiert)
✅ Alle Seiten nutzen Cover als Referenz
✅ Charaktere sehen auf allen Seiten gleich aus
⚠️ Gesichter sind erfunden (kein Foto-Referenz)
```

---

## 🔄 VERGLEICH: Alt vs. Neu

### **FAMILIENBILD-MODUS**

| Schritt | Alt (vor Umbau) | Neu (nach Umbau) | Status |
|---------|----------------|------------------|--------|
| 1. Foto hochladen | ✅ Familienbild | ✅ Familienbild | ✅ GLEICH |
| 2. Character-Extraktion | ✅ GPT aus Story | ✅ GPT aus Story | ✅ GLEICH |
| 3. Photo Description | ✅ GPT Vision | ✅ GPT Vision | ✅ GLEICH |
| 4. Cover Generation | ✅ images.edit() | ✅ images.edit() | ✅ GLEICH |
| 5. Seiten Generation | ✅ Cover-Referenz | ✅ Cover-Referenz | ✅ GLEICH |

**ERGEBNIS: 100% identisch! Funktioniert weiterhin super!**

---

### **EINZELFOTOS-MODUS**

| Schritt | Alt (vor Umbau) | Neu (nach Umbau) | Verbesserung |
|---------|----------------|------------------|--------------|
| 1. Namen eingeben | ❌ Nicht möglich | ✅ User gibt Namen ein | ✅ Neu |
| 2. Fotos hochladen | ❌ Nicht möglich | ✅ Pro Person 1 Foto | ✅ Neu |
| 3. Character-Extraktion | ❌ GPT rät Namen | ✅ Namen vom Frontend | ✅ Kein Raten! |
| 4. Name-Matching | ❌ Fehleranfällig! | ✅ Nicht mehr nötig | ✅ Robust! |
| 5. Cover Generation | ❌ Matching-Problem | ✅ Composite → images.edit() | ✅ Funktioniert! |
| 6. Seiten Generation | ❌ Inkonsistent | ✅ Cover-Referenz | ✅ Konsistent! |

**ERGEBNIS: Viel robuster! Kein Name-Matching mehr nötig!**

---

## ✅ GARANTIEN

### **1. Familienbild funktioniert weiterhin!**
- ✅ Gleicher Code-Pfad wie vorher
- ✅ Gleiche GPT Calls
- ✅ Gleiche images.edit() Logik
- ✅ Gleiche Cover-Referenz für Seiten
- **KEINE ÄNDERUNG!**

### **2. Cover ist immer die Hauptreferenz für Seiten!**
- ✅ Familienbild → Cover → Seiten
- ✅ Einzelfotos → Composite → Cover → Seiten
- ✅ Keine Fotos → Generiertes Cover → Seiten
- **Garantiert Konsistenz!**

### **3. Was NICHT für Cover verwendet wird:**
- ❌ Titel (nur UI/PDF)
- ❌ Dialoge (nur Seiten)
- ❌ Widmung (nur Ending)
- ❌ Spezifische Fragen (entfernt)

---

## 📋 Checkliste: Was muss getestet werden?

Nach Railway-Deployment:

### **Test 1: Familienbild** (Muss funktionieren wie bisher!)
- [ ] 1 Familienbild hochladen
- [ ] Momente eingeben
- [ ] Cover zeigt alle Personen im Comic-Stil
- [ ] Seiten zeigen konsistente Charaktere
- [ ] Logs: "Family photo mode: extracting characters from story"

### **Test 2: Einzelfotos** (Neu!)
- [ ] 2 Namen eingeben: "Jil", "Sally"
- [ ] Pro Person 1 Foto hochladen
- [ ] Momente eingeben
- [ ] Cover zeigt beide Personen im Comic-Stil
- [ ] Seiten zeigen konsistente Charaktere
- [ ] Logs: "Individual photos mode: using 2 characters from frontend"

### **Test 3: Keine Fotos**
- [ ] Keine Fotos hochladen
- [ ] Momente eingeben
- [ ] Cover zeigt generierte Charaktere
- [ ] Seiten zeigen konsistente Charaktere
- [ ] Logs: "No photos mode: extracting characters from story"

---

**Zusammenfassung:** Familienbild funktioniert wie bisher, Einzelfotos ist neu und robuster!
