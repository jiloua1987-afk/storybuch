# Season-Based Clothing Fix
*Stand: 8. Mai 2026*

## 🎯 PROBLEM

**User Feedback:** "bedeutet das, dass auch bei Winter stories jmd als Fallback in T-Shirt dargestellt wird"

**Symptom:** Fallback-Kleidung war immer "warm weather" → Winter-Szenen zeigten Leute in T-Shirts ❌

**Root Cause:** 
```javascript
return "casual everyday clothes appropriate for the scene and warm weather.";
```

Keine Jahreszeiten-Erkennung!

---

## 🔧 FIX

### getOutfit() - Jahreszeiten-Erkennung hinzugefügt

**Datei:** `backend-railway/src/routes/comic.js` (Zeile 84-115)

**NEU: Parameter `panelDescriptions` hinzugefügt**
```javascript
function getOutfit(location = "", panelDescriptions = "")
```

**NEU: Jahreszeiten-Erkennung**
```javascript
const combined = `${loc} ${desc}`;

// Check for winter/cold weather keywords
const isWinter = ["winter", "schnee", "snow", "kalt", "cold", "weihnachten", "christmas", "skiing", "ski"].some(k => combined.includes(k));
const isCold = ["herbst", "autumn", "fall", "regen", "rain", "windig", "windy"].some(k => combined.includes(k));
```

**NEU: Jahreszeiten-basierte Fallbacks**
```javascript
// Season-based fallback
if (isWinter) {
  return "warm winter clothes — coats, jackets, sweaters, scarves, long trousers. NO t-shirts, NO shorts.";
}
if (isCold) {
  return "autumn/fall clothes — light jackets, long sleeves, jeans, comfortable shoes.";
}

// Default: warm weather
return "casual everyday clothes appropriate for the scene — t-shirts, light shirts, comfortable trousers or shorts for warm weather.";
```

---

## 📊 KEYWORDS

### Winter (isWinter):
- **Deutsch:** winter, schnee, kalt, weihnachten
- **English:** winter, snow, cold, christmas, skiing, ski

**Kleidung:** coats, jackets, sweaters, scarves, long trousers
**Verbote:** NO t-shirts, NO shorts

### Herbst/Kalt (isCold):
- **Deutsch:** herbst, regen, windig
- **English:** autumn, fall, rain, windy

**Kleidung:** light jackets, long sleeves, jeans, comfortable shoes

### Sommer/Warm (Default):
- Keine Keywords → Standard

**Kleidung:** t-shirts, light shirts, comfortable trousers or shorts

---

## 🔄 AUFRUF ANGEPASST

**Datei:** `backend-railway/src/routes/comic.js` (Zeile 1066-1070)

**VORHER:**
```javascript
const mood = MOOD_MOD[comicStyle] || MOOD_MOD.emotional;
const outfit = getOutfit(page.location);
const panelCount = page.panels.length;
```

**NACHHER:**
```javascript
const mood = MOOD_MOD[comicStyle] || MOOD_MOD.emotional;
const panelCount = page.panels.length;
const panelDescriptions = page.panels
  .map(p => `Panel ${p.nummer}: ${p.szene}`)
  .join("\n");
const outfit = getOutfit(page.location, panelDescriptions);
```

**Wichtig:** `panelDescriptions` wird jetzt FRÜHER definiert (vor `outfit`), damit es an `getOutfit()` übergeben werden kann.

---

## 📊 BEISPIELE

### Beispiel 1: Winter-Szene

**Input:**
```
Location: "park"
Panel descriptions: "Wide shot: Children playing in snow, building snowman in winter park"
```

**Erkennung:**
- `combined` enthält "snow" und "winter"
- `isWinter = true`

**Output:**
```
"warm winter clothes — coats, jackets, sweaters, scarves, long trousers. NO t-shirts, NO shorts."
```

**Ergebnis:** Kinder in Winterjacken, Schals ✅

---

### Beispiel 2: Herbst-Szene

**Input:**
```
Location: "park"
Panel descriptions: "Medium shot: Family walking in autumn park, leaves falling, rainy weather"
```

**Erkennung:**
- `combined` enthält "autumn" und "rainy"
- `isCold = true`

**Output:**
```
"autumn/fall clothes — light jackets, long sleeves, jeans, comfortable shoes."
```

**Ergebnis:** Familie in leichten Jacken, lange Ärmel ✅

---

### Beispiel 3: Sommer-Szene

**Input:**
```
Location: "park"
Panel descriptions: "Wide shot: Family having picnic in sunny park"
```

**Erkennung:**
- Keine Winter/Herbst Keywords
- `isWinter = false`, `isCold = false`

**Output:**
```
"casual everyday clothes appropriate for the scene — t-shirts, light shirts, comfortable trousers or shorts for warm weather."
```

**Ergebnis:** Familie in T-Shirts, Shorts ✅

---

### Beispiel 4: Weihnachten

**Input:**
```
Location: "living room"
Panel descriptions: "Medium shot: Family decorating Christmas tree together"
```

**Erkennung:**
- `combined` enthält "christmas"
- `isWinter = true`

**Output:**
```
"warm winter clothes — coats, jackets, sweaters, scarves, long trousers. NO t-shirts, NO shorts."
```

**Ergebnis:** Familie in Pullovern (drinnen, aber Winter-Kleidung) ✅

---

## 🎯 PRIORITÄT

**Reihenfolge der Kleidungs-Bestimmung:**

1. **Spezifische Locations** (höchste Priorität)
   - Beach → Swimwear
   - Wedding → Wedding attire
   - Airport → Travel clothes
   - Restaurant → Smart casual
   - etc.

2. **Jahreszeiten-Fallback** (mittlere Priorität)
   - Winter → Warm winter clothes
   - Herbst/Kalt → Autumn clothes

3. **Default-Fallback** (niedrigste Priorität)
   - Sommer/Warm → Casual everyday clothes

**Beispiel:**
- "Beach in winter" → **Swimwear** (Location gewinnt, nicht Jahreszeit!)
- "Park in winter" → **Warm winter clothes** (Jahreszeit greift)
- "Park" (keine Jahreszeit) → **Casual everyday clothes** (Default)

---

## 🧪 TESTING

### Test 1: Winter-Story
1. Story mit "Schnee", "Winter", "Weihnachten" erstellen
2. **Erwartung:** Charaktere in Jacken, Pullovern, Schals ✅

### Test 2: Herbst-Story
1. Story mit "Herbst", "Regen", "Blätter fallen" erstellen
2. **Erwartung:** Charaktere in leichten Jacken, langen Ärmeln ✅

### Test 3: Sommer-Story
1. Story ohne Jahreszeiten-Keywords erstellen
2. **Erwartung:** Charaktere in T-Shirts, Shorts ✅

### Test 4: Strand im Winter (Edge Case)
1. Story mit "Beach" Location aber "winter" in Beschreibung
2. **Erwartung:** Swimwear (Location hat Priorität) ✅

---

## 📁 GEÄNDERTE DATEIEN

- `backend-railway/src/routes/comic.js` (2 Stellen)
  1. `getOutfit()` Funktion - Jahreszeiten-Erkennung hinzugefügt (Zeile 84-115)
  2. `getOutfit()` Aufruf - `panelDescriptions` Parameter hinzugefügt (Zeile 1066-1070)

**Keine Frontend-Änderungen!**
**Keine Mobile-Änderungen!**

---

## ✅ ERGEBNIS

**Jahreszeiten-basierte Kleidung:**
- ✅ Winter → Jacken, Pullover, Schals (NO t-shirts)
- ✅ Herbst → Leichte Jacken, lange Ärmel
- ✅ Sommer → T-Shirts, Shorts (Default)
- ✅ Spezifische Locations haben weiterhin Priorität

**Keine Breaking Changes:**
- Alte Comics funktionieren weiterhin
- Nur Verbesserungen für neue Comics
- Sommer-Stories bleiben unverändert (Default)

---

**Erstellt:** 8. Mai 2026
**Status:** ✅ Komplett implementiert
**Nächster Schritt:** Backend deployen und testen
