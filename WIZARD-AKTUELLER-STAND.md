# Wizard - Aktueller Stand
**Datum:** 3. Mai 2026, 19:00 Uhr

---

## 📋 WIZARD-STRUKTUR (AKTUELL)

### ✅ AKTUELLE STEP-REIHENFOLGE:

```javascript
const STEPS = [
  Step1Basics,    // Step 0
  Step2Content,   // Step 1
  Step3Style,     // Step 2
  Step4Generate,  // Step 3
  Step5Preview,   // Step 4
  Step6Checkout   // Step 5
];
```

---

## 🎯 STEP-BY-STEP ÜBERSICHT

### Step 0: Basics (Step1Basics.tsx) ✅
**Was passiert:**
1. **Kategorie wählen** (Liebe, Familie, Urlaub, Feier, Biografie, Freunde, Sonstiges)
2. **Stil wählen** (Action, Emotional, Humor)
3. **Bilder hochladen** (optional):
   - **Family Photo Mode:** 1 Foto mit mehreren Personen
     - ✅ **NEU:** Charakternamen-Pflichtfeld erscheint automatisch
     - User gibt ein: "Marc, Hassan, Maria"
   - **Individual Photo Mode:** Mehrere Fotos, jede Person separat
     - Name + Foto pro Person
   - **None:** Keine Bilder

**Datei:** `src/components/steps/Step1Basics.tsx`  
**Button:** "Weiter zum Inhalt →"

---

### Step 1: Content (Step2Content.tsx) ✅
**Was passiert:**
- Titel eingeben
- Momente beschreiben (3-5 besondere Momente)
- Guided Answers: Ort, Zeit, spezielle Momente

**Datei:** `src/components/steps/Step2Content.tsx`  
**Button:** "Weiter zum Stil →"

---

### Step 2: Style (Step3Style.tsx) ✅
**Was passiert:**
- Widmung eingeben (optional)
- Stil-Feineinstellungen (falls vorhanden)

**Datei:** `src/components/steps/Step3Style.tsx`  
**Button:** "Comic erstellen →"

---

### Step 3: Generate (Step4Generate.tsx) ✅
**Was passiert:**
- Comic wird generiert
- Cover → Seiten → Ending
- Progress Bar + Logs
- **NEU:** 4-Stufen-Fallback bei Safety Blocks

**Datei:** `src/components/steps/Step4Generate.tsx`  
**Auto-Weiterleitung:** → Step 4 (Preview)

---

### Step 4: Preview (Step5Preview.tsx) ✅
**Was passiert:**
- Comic-Vorschau
- Seiten bearbeiten
- Sprechblasen hinzufügen/bearbeiten
- "Neu illustrieren" mit Freitext
- Seite löschen (mit Wiederherstellen)

**Datei:** `src/components/steps/Step5Preview.tsx`  
**Button:** "Zur Bestellung →"

---

### Step 5: Checkout (Step6Checkout.tsx) ✅
**Was passiert:**
- Bestellung abschließen
- Zahlungsdetails
- Versandadresse

**Datei:** `src/components/steps/Step6Checkout.tsx`  
**Button:** "Jetzt bestellen"

---

## 🗂️ DATEIEN-STATUS

### ✅ AKTIV VERWENDET:
```
src/components/steps/
├── Step1Basics.tsx       ← Step 0: Kategorie + Stil + Bilder ✅
├── Step2Content.tsx      ← Step 1: Titel + Momente ✅
├── Step3Style.tsx        ← Step 2: Widmung + Stil ✅
├── Step4Generate.tsx     ← Step 3: Generierung ✅
├── Step5Preview.tsx      ← Step 4: Vorschau + Bearbeiten ✅
└── Step6Checkout.tsx     ← Step 5: Bestellung ✅
```

### ❌ VERALTET / NICHT VERWENDET:
```
src/components/steps/
├── Step1Story.tsx        ← NICHT VERWENDET (ähnlich zu Step2Content)
└── Step2Upload.tsx       ← VERALTET! Bilder sind jetzt in Step1Basics
```

---

## 🧹 AUFRÄUMEN

### Dateien zum Löschen:
1. ❌ `src/components/steps/Step1Story.tsx` - Nicht in STEPS array
2. ❌ `src/components/steps/Step2Upload.tsx` - Bilder sind jetzt in Step1Basics

### Grund:
- `Step1Story.tsx` wird nicht importiert in `page.tsx`
- `Step2Upload.tsx` ist komplett veraltet (Bilder sind in Step 0)
- Nur die 6 Steps im STEPS array werden verwendet

---

## 📝 NEUE FEATURES (3. Mai 2026)

### In Step1Basics.tsx:
1. ✅ **Charakternamen-Pflichtfeld** für Family Photo Mode
   - Erscheint automatisch nach Foto-Upload
   - Validation: Ohne Namen kein Weiter
   - Format: "Marc, Hassan, Maria" (comma-separated)
   - Speichert Characters in Store

2. ✅ **Photo Mode Selection**
   - Family (empfohlen) - 1 Foto mit mehreren Personen
   - Individual - Mehrere Fotos, jede Person separat
   - None - Keine Bilder

3. ✅ **DSGVO Consent**
   - Checkbox vor Upload
   - Bilder nur mit Zustimmung

### In Step4Generate.tsx:
1. ✅ **4-Stufen-Fallback-System** bei Safety Blocks
   - Stufe 1: Sichere Alternative (gleicher Kontext)
   - Stufe 2: Ultra-sichere Alternative (mit Referenz)
   - Stufe 3: Platzhalter-Seite (generisch, richtige Gesichter)
   - Stufe 4: Seite überspringen (nur absolute letzte Option)

2. ✅ **photoMode Parameter** wird an Backend übergeben
3. ✅ **Skipped Pages Handling** - Zeigt Hinweis wenn Seite übersprungen

---

## 🎯 NÄCHSTE SCHRITTE

1. ✅ Veraltete Dateien löschen:
   - `Step1Story.tsx`
   - `Step2Upload.tsx`

2. ✅ Dokumentation finalisieren

3. ✅ Testen:
   - Family Photo Mode mit Charakternamen
   - Barcelona Test (alle 3 Fixes)

---

**Erstellt:** 3. Mai 2026, 19:00 Uhr  
**Status:** Dokumentation komplett  
**Nächster Schritt:** Veraltete Dateien löschen
