# Multi-Photo Debug Plan
*Stand: 2. Mai 2026, 21:00 Uhr*

## 🔴 Problem

**Fotos werden nicht verwendet** → Charaktere ändern sich auf jeder Seite

### Symptome:
- Cover: Photorealistisch oder falsche Charaktere
- Seite 1: Jil hat kurze Haare
- Seite 2: Jil sieht komplett anders aus
- Seite 3: Wieder andere Gesichter
- Logs zeigen: `"Jil: generated from story (no photo provided)"`

### Root Cause:
Character-Name-Matching schlägt fehl:
```
Frontend: { label: "Jil", url: "..." }
GPT:      { name: "Jil Schmidt", age: 28 }
Match:    "Jil" !== "Jil Schmidt" → FALSE
```

---

## 🛠️ Bereits implementiert (Deployment läuft):

### 1. Fuzzy Matching (Zeile 351-360)
```javascript
const matchedPhoto = referenceImageUrls.find(ref => {
  const labelLower = ref.label.toLowerCase().trim();
  const charNameLower = char.name.toLowerCase().trim();
  return labelLower === charNameLower || 
         labelLower.includes(charNameLower) || 
         charNameLower.includes(labelLower);
});
```

### 2. Debug Logging (Zeile 343-346)
```javascript
console.log(`  → Photo labels: ${referenceImageUrls.map(r => r.label).join(", ")}`);
console.log(`  → Character names from GPT: ${characters.map(c => c.name).join(", ")}`);
console.log(`  → ✓ Matched character "${char.name}" to photo "${matchedPhoto.label}"`);
```

### 3. Composite Image für Multi-Photo Cover (Zeile 580-650)
```javascript
// Beide Fotos side-by-side kombinieren
const compositeBuffer = await sharp({...})
  .composite([
    { input: img1, left: 0 },
    { input: img2, left: width1 }
  ])
```

---

## 📋 Nächster Test (wenn Deployment fertig):

### Test-Szenario:
1. Railway Logs öffnen (ganz nach unten scrollen)
2. Neuen Comic generieren:
   - Foto 1: Label "Jil"
   - Foto 2: Label "Sally"
   - Liebesgeschichte mit 4 Momenten
3. In Logs suchen nach:
   ```
   DEBUG: referenceImageUrls
   DEBUG: characters from GPT
   ✓ Matched character
   ```

### Erwartete Logs:
```
Analyzing 2 photo(s)...
  → DEBUG: referenceImageUrls = [
      { "label": "Jil", "url": "https://..." },
      { "label": "Sally", "url": "https://..." }
    ]
  → DEBUG: characters from GPT = [
      { "name": "Jil", "age": 28 },
      { "name": "Sally", "age": 26 }
    ]
  → Multi-photo mode: 2 photos
  → Photo labels: Jil, Sally
  → Character names from GPT: Jil, Sally
  → ✓ Matched character "Jil" to photo "Jil"
  → ✓ Matched character "Sally" to photo "Sally"
  → Creating composite image from both photos
✓ Cover done (multi-photo composite mode)
```

### Wenn Matching funktioniert:
```
Generating page "Das erste Treffen"
  → Age context: current (useReference: true)
  → Using cover as reference (all characters in photo)
✓ Page done
```

### Wenn Matching NICHT funktioniert:
```
  → Jil: generated from story (no photo provided)
  → Sally: generated from story (no photo provided)
  → Page has non-photo characters, ref: user-photo-style
```

---

## 🎯 Wenn Test fehlschlägt:

### Plan B: Character-Namen aus Labels erzwingen

**Backend-Änderung:**
```javascript
// NACH GPT Character-Extraktion:
// Überschreibe Namen mit Labels wenn Fotos vorhanden
if (referenceImageUrls.length > 0) {
  characters = referenceImageUrls.map((ref, i) => {
    const gptChar = characters[i] || {};
    return {
      name: ref.label,  // ← FORCE: Nutze Label als Namen
      age: gptChar.age || 30,
      visual_anchor: gptChar.visual_anchor || `Person named ${ref.label}`,
      inPhoto: true
    };
  });
}
```

**Vorteil:**
- ✅ 100% Match-Rate (Namen sind identisch)
- ✅ Keine Änderung im Frontend nötig
- ✅ Funktioniert sofort

**Nachteil:**
- ⚠️ GPT kann keine zusätzlichen Charaktere aus Story extrahieren
- ⚠️ Nur für Charaktere mit Fotos

---

## 📝 Langfristige Lösung (für morgen):

### Wizard-Umstrukturierung:

**Step 1: Figuren & Fotos**
```
[+ Figur hinzufügen]
  ├─ Name: [Input] "Jil"
  ├─ Alter: [Input] "28" (optional)
  └─ Foto: [Upload] (optional)
```

**Step 2: Stil & Kategorie**
```
[Action] [Emotional] [Humor]
[Liebesgeschichte] [Familie] [Urlaub]
```

**Step 3: Momente**
```
[+ Moment hinzufügen]
  ├─ Titel: "Das erste Treffen"
  └─ Beschreibung: "In der Bibliothek..."

💡 Vorschläge: [Kennenlernen] [Hochzeit] [Urlaub]
```

**Backend:**
```javascript
// Charaktere kommen direkt vom Frontend
const characters = req.body.characters;
// [{ name: "Jil", age: 28, photo_url: "..." }]
// → Kein GPT-Extraktion, kein Matching-Problem!
```

---

## 🔑 Wichtige Erkenntnisse:

1. **guidedAnswers-Felder sind redundant** → Werden nur als unstrukturierter Text genutzt
2. **Momente sind das Wichtigste** → Jeder Moment = 1 Seite
3. **Character-Extraktion ist fehleranfällig** → GPT erfindet Namen
4. **Lösung:** Charaktere explizit im Wizard erfassen

---

## 📊 Status:

- ✅ Fuzzy Matching implementiert
- ✅ Debug Logging implementiert
- ✅ Composite Image für Multi-Photo implementiert
- ⏳ Deployment läuft (Railway)
- ⏳ Test ausstehend
- 📋 Wizard-Umstrukturierung geplant (morgen)

---

**Nächster Schritt:** Test durchführen wenn Deployment fertig ist (~2-3 Minuten)
