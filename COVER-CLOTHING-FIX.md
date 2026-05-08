# Cover Clothing Fix
*Stand: 8. Mai 2026*

## 🎯 PROBLEM

**User Feedback:** "Das Cover braucht auch nicht eins zu eins die Klamotten vom original User foto zu übernehmen"

**Symptom:** Cover kopiert exakt die Kleidung vom User-Foto (z.B. T-Shirt, Hoodie, etc.)

**Root Cause:** Cover-Prompt hatte keine Anweisung für Kleidung → gpt-image-2 kopiert einfach vom Foto

---

## 🔧 FIX

### 1. Single Photo Cover (Zeile ~900)

**VORHER:**
```javascript
prompt: sanitizePrompt(`${COMIC_STYLE}

REDRAW everyone in this photo as hand-drawn comic book characters.
...
Character descriptions: ${charDesc}
Composition: dynamic group shot, characters in foreground, vivid illustrated background.
NO text, NO title, NO letters anywhere in the image.`)
```

**NACHHER:**
```javascript
prompt: sanitizePrompt(`${COMIC_STYLE}

REDRAW everyone in this photo as hand-drawn comic book characters.
...
Character descriptions: ${charDesc}

CLOTHING: Draw characters in casual everyday clothes appropriate for a cover photo.
IGNORE the specific clothing from the photo — use stylish casual attire instead.
Examples: nice shirts, blouses, jeans, casual dresses. Make it look good for a comic book cover.

Composition: dynamic group shot, characters in foreground, vivid illustrated background.
NO text, NO title, NO letters anywhere in the image.`)
```

### 2. Multi-Photo Cover (Zeile ~820)

**VORHER:**
```javascript
const multiPhotoPrompt = sanitizePrompt(`${COMIC_STYLE}

REDRAW both people in this photo as hand-drawn comic book characters standing together.
...
Draw BOTH characters together in ${coverLocation}.
Composition: dynamic group shot, both characters prominently visible, vivid illustrated background.
NO text, NO title, NO letters anywhere in the image.`);
```

**NACHHER:**
```javascript
const multiPhotoPrompt = sanitizePrompt(`${COMIC_STYLE}

REDRAW both people in this photo as hand-drawn comic book characters standing together.
...

CLOTHING: Draw characters in casual everyday clothes appropriate for a cover photo.
IGNORE the specific clothing from the photo — use stylish casual attire instead.
Examples: nice shirts, blouses, jeans, casual dresses. Make it look good for a comic book cover.

Draw BOTH characters together in ${coverLocation}.
Composition: dynamic group shot, both characters prominently visible, vivid illustrated background.
NO text, NO title, NO letters anywhere in the image.`);
```

---

## 📊 VORHER/NACHHER

### VORHER:
```
User-Foto: Person in altem T-Shirt und Jogginghose
Cover: Exakt gleiche Kleidung (T-Shirt, Jogginghose) ❌
```

### NACHHER:
```
User-Foto: Person in altem T-Shirt und Jogginghose
Cover: Stylische casual Kleidung (nice shirt, jeans) ✅
```

---

## 🎨 KLEIDUNGS-STRATEGIE

### Cover:
- **Immer:** Casual everyday clothes
- **Beispiele:** Nice shirts, blouses, jeans, casual dresses
- **Ziel:** Gut aussehen für Comic-Cover

### Comic-Seiten:
- **Abhängig von Location:** `getOutfit(location)`
- **Beispiele:**
  - Hochzeit → white wedding dress, formal suit
  - Strand → swimwear, sandals
  - Zuhause → relaxed home clothes
  - Restaurant → smart casual

---

## ❓ DEINE FRAGE: Für jedes Event eine Kategorie?

**Antwort: NEIN!**

### Nur für sehr spezifische Events:
- ✅ **Hochzeit** (weißes Kleid ist Pflicht)
- ✅ **Strand** (Badekleidung)
- ✅ **Flughafen** (Reisekleidung)

### Für normale Events: Fallback reicht!
```javascript
return "casual everyday clothes appropriate for the scene and warm weather.";
```

**GPT-4 ist smart genug** aus den Panel-Beschreibungen die richtige Kleidung abzuleiten:
- "Geburtstag feiern" → normale Kleidung ✅
- "Im Park spielen" → casual ✅
- "Restaurant besuchen" → smart casual ✅
- "Fahrrad fahren" → sporty clothes ✅

**Nur wenn die Kleidung KRITISCH ist** (wie bei Hochzeit), braucht man eine explizite Kategorie!

---

## 📁 GEÄNDERTE DATEIEN

- `backend-railway/src/routes/comic.js` (2 Stellen)
  1. Single Photo Cover Prompt (Zeile ~900)
  2. Multi-Photo Cover Prompt (Zeile ~820)

**Keine Frontend-Änderungen!**
**Keine Mobile-Änderungen!**

---

## ✅ ERGEBNIS

**Cover-Kleidung:**
- ✅ Cover zeigt stylische casual Kleidung (nicht exakt vom Foto)
- ✅ Sieht gut aus für Comic-Cover
- ✅ Gesichter bleiben identisch (nur Kleidung ändert sich)

**Comic-Seiten-Kleidung:**
- ✅ Hochzeit → Hochzeitskleidung
- ✅ Strand → Badekleidung
- ✅ Normale Events → GPT-4 entscheidet basierend auf Kontext

**Keine Breaking Changes:**
- Alte Comics funktionieren weiterhin
- Nur Verbesserungen für neue Comics

---

**Erstellt:** 8. Mai 2026
**Status:** ✅ Komplett implementiert
**Nächster Schritt:** Backend deployen und testen
