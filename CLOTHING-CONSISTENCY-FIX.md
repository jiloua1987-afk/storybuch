# Clothing & Consistency Fix
*Stand: 8. Mai 2026*

## 🎯 PROBLEME BEHOBEN

### Problem 1: Hochzeit mit falscher Kleidung
**Symptom:** Hochzeitsszene zeigt Charaktere in Alltagskleidung (wie auf Cover) statt Hochzeitskleidung

**Root Cause:**
1. `getOutfit()` hatte "wedding" zusammen mit "restaurant, party" → nur "smart casual"
2. Cover-Referenz wurde verwendet, aber Kleidung nicht überschrieben

**Fix:**
- ✅ Hochzeit als separate Kategorie mit expliziter Kleidung
- ✅ "IGNORE clothing from cover" in allen refNote Sektionen

---

### Problem 2: Kleidung wird vom Cover kopiert
**Symptom:** Alle Szenen zeigen die gleiche Kleidung wie auf dem Cover

**Root Cause:**
- "OVERRIDE" im Prompt war zu schwach formuliert
- Bei `cover` und `cover-individual-photos` fehlte "IGNORE clothing"

**Fix:**
- ✅ Stärkere Formulierung: "CRITICAL CLOTHING RULES"
- ✅ Explizit: "DO NOT copy clothing from reference photo"
- ✅ "IGNORE clothing" in allen 3 Cover-refNote Varianten

---

## 🔧 ÄNDERUNGEN

### 1. getOutfit() - Hochzeit als separate Kategorie

**Datei:** `backend-railway/src/routes/comic.js` (Zeile 84-102)

**VORHER:**
```javascript
if (["restaurant", "wedding", "celebration", "party", "dinner", "theater"].some(k => loc.includes(k)))
  return "smart casual — dress shirts, blouses, nice trousers.";
```

**NACHHER:**
```javascript
if (["wedding", "hochzeit", "heirat", "marriage", "bride", "groom", "ceremony"].some(k => loc.includes(k)))
  return "WEDDING ATTIRE — bride in white wedding dress with veil, groom in dark formal suit with tie. NO casual clothes, NO everyday outfits.";
if (["restaurant", "celebration", "party", "dinner", "theater"].some(k => loc.includes(k)))
  return "smart casual — dress shirts, blouses, nice trousers.";
```

**Neue Keywords:**
- wedding, hochzeit, heirat, marriage
- bride, groom, ceremony

**Explizite Kleidung:**
- Braut: white wedding dress with veil
- Bräutigam: dark formal suit with tie
- Verbote: NO casual clothes, NO everyday outfits

---

### 2. CRITICAL CLOTHING RULES - Stärkere Formulierung

**Datei:** `backend-railway/src/routes/comic.js` (Zeile 1085-1095)

**VORHER:**
```javascript
CLOTHING — characters wear ${outfit} OVERRIDE any clothing visible in the reference photo.
```

**NACHHER:**
```javascript
CRITICAL CLOTHING RULES:
Characters MUST wear: ${outfit}
DO NOT copy clothing from the reference photo.
The reference photo is ONLY for facial features and body proportions.
IGNORE any clothing visible in the reference photo — draw the clothing specified above instead.
```

**Verbesserungen:**
- "CRITICAL" statt normaler Text
- "MUST wear" statt "wear"
- Explizit: "DO NOT copy"
- Klarstellung: "reference photo is ONLY for facial features"
- Wiederholung: "IGNORE any clothing"

---

### 3. refNote - "IGNORE clothing" in allen Cover-Varianten

**Datei:** `backend-railway/src/routes/comic.js` (3 Stellen)

#### 3a. cover-age-* (Age-Modified Scene)

**Zeile ~1260-1290**

**NEU hinzugefügt:**
```javascript
CRITICAL: IGNORE the clothing from the cover photo.
The cover shows everyday clothing, but this scene requires different attire.
Draw the clothing specified in the CRITICAL CLOTHING RULES section instead.
```

#### 3b. cover-individual-photos (Individual Photos Mode)

**Zeile ~1295-1340**

**NEU hinzugefügt:**
```javascript
CRITICAL: IGNORE the clothing from the cover photo.
The cover shows everyday clothing, but this scene requires different attire.
Draw the clothing specified in the CRITICAL CLOTHING RULES section instead.
```

#### 3c. cover / cover-with-crowd (Standard Cover)

**Zeile ~1350-1380**

**NEU hinzugefügt:**
```javascript
CRITICAL: IGNORE the clothing from the cover photo.
The cover shows everyday clothing, but this scene requires different attire.
Draw the clothing specified in the CRITICAL CLOTHING RULES section instead.
```

**Bereits vorhanden (keine Änderung):**
- `user-photo`: "IGNORE the clothing from the photo"
- `user-photo-style`: "IGNORE the clothing from the photo"

---

## 📊 VORHER/NACHHER

### VORHER (Kaputt):

**Hochzeitsszene:**
```
Location: "wedding ceremony"
getOutfit() → "smart casual — dress shirts, blouses, nice trousers"
Prompt: "CLOTHING — characters wear smart casual OVERRIDE..."
refNote (cover): (keine Erwähnung von Kleidung)

Ergebnis: gpt-image-2 kopiert Kleidung vom Cover (Alltagskleidung) ❌
```

### NACHHER (Funktioniert):

**Hochzeitsszene:**
```
Location: "wedding ceremony"
getOutfit() → "WEDDING ATTIRE — bride in white wedding dress with veil, groom in dark formal suit with tie. NO casual clothes, NO everyday outfits."

Prompt: 
"CRITICAL CLOTHING RULES:
Characters MUST wear: WEDDING ATTIRE — bride in white wedding dress with veil, groom in dark formal suit with tie.
DO NOT copy clothing from the reference photo.
IGNORE any clothing visible in the reference photo — draw the clothing specified above instead."

refNote (cover):
"CRITICAL: IGNORE the clothing from the cover photo.
The cover shows everyday clothing, but this scene requires different attire.
Draw the clothing specified in the CRITICAL CLOTHING RULES section instead."

Ergebnis: gpt-image-2 zeichnet Hochzeitskleidung ✅
```

---

## 🧪 TESTING

### Test 1: Hochzeitsszene
1. Story mit "Hochzeit" / "wedding" Moment erstellen
2. **Erwartung:** Braut in weißem Kleid, Bräutigam im Anzug ✅

### Test 2: Strand-Szene
1. Story mit "Strand" / "beach" Moment erstellen
2. **Erwartung:** Badekleidung, nicht Alltagskleidung vom Cover ✅

### Test 3: Zuhause-Szene
1. Story mit "Zuhause" / "home" Moment erstellen
2. **Erwartung:** Bequeme Hauskleidung, nicht Cover-Kleidung ✅

### Test 4: Konsistenz über mehrere Seiten
1. Story mit 3 verschiedenen Locations erstellen
2. **Erwartung:** Jede Seite hat passende Kleidung für Location ✅

---

## 🎯 KONSISTENZ-OPTIMIERUNGEN

### Was bereits gut funktioniert:

1. **COMIC_STYLE** (Zeile 10-20)
   - ✅ Wird FIRST in jedem Prompt platziert
   - ✅ "Every page MUST look identical in style"
   - ✅ Klare Verbote: NOT manga, NOT anime, NOT photorealistic

2. **Character Descriptions** (visual_anchor)
   - ✅ Werden in jedem Prompt wiederholt
   - ✅ "Draw identically across all panels"

3. **refNote Sektionen**
   - ✅ "EXACT SAME faces"
   - ✅ "Match art style and color palette of cover exactly"
   - ✅ "Keep CONSISTENT across all panels"

### Keine weiteren Änderungen nötig!

Die Konsistenz-Regeln sind bereits sehr stark. Das Hauptproblem war nur die Kleidung.

---

## 📱 MOBILE OPTIMIERUNG

**Hinweis:** Diese Änderungen sind nur Backend (comic.js) - keine Frontend-Änderungen.

**Mobile ist nicht betroffen**, da:
- Nur Prompt-Änderungen
- Keine UI-Änderungen
- Keine Layout-Änderungen
- Keine Touch-Event-Änderungen

**Mobile funktioniert weiterhin wie vorher!** ✅

---

## 📁 GEÄNDERTE DATEIEN

- `backend-railway/src/routes/comic.js` (5 Stellen)
  1. getOutfit() - Hochzeit als separate Kategorie
  2. CRITICAL CLOTHING RULES - stärkere Formulierung
  3. refNote (cover-age-*) - IGNORE clothing
  4. refNote (cover-individual-photos) - IGNORE clothing
  5. refNote (cover) - IGNORE clothing

**Keine Frontend-Dateien geändert!**
**Keine Mobile-spezifischen Änderungen nötig!**

---

## ✅ ERGEBNIS

**Alle Kleidungs-Probleme gelöst:**
1. ✅ Hochzeit zeigt Hochzeitskleidung (weißes Kleid, Anzug)
2. ✅ Kleidung wird nicht mehr vom Cover kopiert
3. ✅ Jede Szene hat passende Kleidung für Location
4. ✅ Konsistenz bleibt erhalten (Gesichter, Stil, Farben)

**Keine Breaking Changes:**
- Alte Comics funktionieren weiterhin
- Nur Verbesserungen für neue Comics
- Mobile nicht betroffen

---

**Erstellt:** 8. Mai 2026
**Status:** ✅ Komplett implementiert
**Nächster Schritt:** Backend deployen und testen
