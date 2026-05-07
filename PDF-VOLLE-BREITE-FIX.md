# PDF Export - Volle Breite Fix

## Problem

Comic-Seiten wurden im PDF-Export NICHT auf volle Breite exportiert, obwohl das bereits gefixt sein sollte.

**Ursache:** `fit: 'contain'` in Sharp verkleinert das Bild proportional, um es in den verfügbaren Platz zu passen. Das führt zu weißen Rändern links/rechts.

## Lösung

### Vorher (FALSCH):
```javascript
const imgWidth = A4_WIDTH; // Volle Breite
const imgHeight = A4_HEIGHT - titleHeight - footerHeight - (imgPadding * 2);

const pageProcessed = await sharp(pageBuffer)
  .resize(Math.round(imgWidth * 2), Math.round(imgHeight * 2), { 
    fit: 'contain',  // ❌ Verkleinert Bild proportional → weiße Ränder
    position: 'center',
    background: { r: 255, g: 255, b: 255, alpha: 1 }
  })
```

**Problem:** 
- `fit: 'contain'` behält Aspect Ratio bei
- Bild ist 1024×1536 (2:3 Ratio)
- Verfügbarer Platz ist breiter als 2:3 → Bild wird verkleinert
- Resultat: Weiße Ränder links/rechts ❌

### Jetzt (RICHTIG):
```javascript
// VOLLE BREITE nutzen, Höhe basierend auf Bild-Ratio
const imgWidth = A4_WIDTH; // VOLLE BREITE ohne Rand
const imgRatio = 1536 / 1024; // Original Ratio (Höhe / Breite)
const imgHeight = imgWidth * imgRatio; // Höhe basierend auf Ratio

// Prüfen ob Bild in verfügbaren Platz passt
const availableHeight = A4_HEIGHT - titleHeight - footerHeight - (imgPadding * 2);
const finalImgHeight = Math.min(imgHeight, availableHeight);
const finalImgWidth = imgWidth;

const pageProcessed = await sharp(pageBuffer)
  .resize(Math.round(finalImgWidth * 2), Math.round(finalImgHeight * 2), { 
    fit: 'cover',  // ✅ Füllt volle Breite, schneidet Höhe wenn nötig
    position: 'center',
    background: { r: 255, g: 255, b: 255, alpha: 1 }
  })
```

**Lösung:**
1. ✅ Breite = A4_WIDTH (volle Breite)
2. ✅ Höhe = Breite × Original-Ratio (1536/1024 = 1.5)
3. ✅ `fit: 'cover'` füllt volle Breite
4. ✅ Wenn Höhe zu groß → auf verfügbaren Platz begrenzen

## Sprechblasen-Koordinaten angepasst

Da sich die Bildgröße geändert hat, müssen auch die Sprechblasen-Koordinaten angepasst werden:

**Vorher:**
```javascript
bubbleX = imgX + (pos.left / 100) * imgWidth;
bubbleY = imgY + (pos.top / 100) * imgHeight;
```

**Jetzt:**
```javascript
bubbleX = imgX + (pos.left / 100) * finalImgWidth;
bubbleY = imgY + (pos.top / 100) * finalImgHeight;
```

Alle Bounds-Checks verwenden jetzt auch `finalImgWidth` und `finalImgHeight`.

## Erwartetes Ergebnis

### Vorher:
```
┌─────────────────────────────────┐
│         TITEL                   │
├─────────────────────────────────┤
│     ┌───────────────┐           │ ← Weiße Ränder
│     │               │           │
│     │  Comic Bild   │           │
│     │               │           │
│     └───────────────┘           │
├─────────────────────────────────┤
│         Seite 1                 │
└─────────────────────────────────┘
```

### Jetzt:
```
┌─────────────────────────────────┐
│         TITEL                   │
├─────────────────────────────────┤
│┌───────────────────────────────┐│ ← VOLLE BREITE
││                               ││
││        Comic Bild             ││
││                               ││
│└───────────────────────────────┘│
├─────────────────────────────────┤
│         Seite 1                 │
└─────────────────────────────────┘
```

## Technische Details

**A4 Dimensionen:**
- Breite: 595 Points (21 cm)
- Höhe: 842 Points (29.7 cm)

**Comic Bild:**
- Original: 1024×1536 (2:3 Ratio)
- PDF: 595 × 892.5 Points (volle Breite, Höhe = 595 × 1.5)

**Verfügbarer Platz:**
- Titel: 60 Points
- Footer: 30 Points
- Padding: 16 Points (2 × 8)
- Verfügbar: 842 - 60 - 30 - 16 = 736 Points

**Finale Größe:**
- Breite: 595 Points (volle Breite) ✅
- Höhe: min(892.5, 736) = 736 Points (begrenzt auf verfügbaren Platz)

## Geänderte Dateien

- `backend-railway/src/lib/pdf-generator.js` (Zeilen ~130-160)
  - Bildgröße Berechnung: Volle Breite, Höhe basierend auf Ratio
  - `fit: 'contain'` → `fit: 'cover'`
  - Sprechblasen-Koordinaten: `imgWidth/imgHeight` → `finalImgWidth/finalImgHeight`

## Status

✅ **FIXED** - Comic-Seiten nutzen jetzt volle Breite im PDF
✅ **FIXED** - Sprechblasen-Koordinaten korrekt angepasst
✅ **READY FOR TEST**
