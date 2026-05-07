# Neu Illustrieren Button - Fix

## Problem 1: Neu Illustrieren überschreibt Panel-Beschreibungen

**Vorher:**
```javascript
${reillustrationNote ? `USER REQUESTED SCENE CHANGE:
${reillustrationNote}

Create 3 panels showing this new scene with the same characters.
Each panel must show a different moment/angle of this scene.` : `PANELS:
${panelDescriptions}`}
```

❌ **Problem:** `reillustrationNote` hat die Panel-Beschreibungen **komplett ersetzt**
❌ **Resultat:** Komplett neue Szene statt Anpassung der bestehenden

**Jetzt:**
```javascript
PANELS:
${panelDescriptions}

${reillustrationNote ? `
USER FEEDBACK FOR RE-ILLUSTRATION:
${reillustrationNote}

IMPORTANT: Keep the same panel structure and story beats as described above.
Only adjust the visual details based on the user feedback.
Example: If user says "Opa more in foreground" → keep the same scene but adjust composition.
Example: If user says "at hair salon not at home" → keep the same actions but change location.
DO NOT create completely new panels - adjust the existing ones based on feedback.
` : ''}
```

✅ **Jetzt:** Panel-Beschreibungen bleiben, `reillustrationNote` **ergänzt** sie
✅ **Resultat:** Gleiche Szene mit Anpassungen basierend auf User-Feedback

---

## Problem 2: "Mama ist Friseurin" statt "beide beim Friseur"

**Root Cause:** GPT-4 Structure beschreibt Szenen ohne klaren Location-Kontext

**Vorher:**
```
Panel 1: "Mama cuts Maria's hair"
Panel 2: "Maria looks in mirror"
```

❌ **Problem:** Nicht klar WO die Szene stattfindet
❌ **Resultat:** GPT denkt Mama schneidet zu Hause die Haare

**Jetzt - Verstärkter Prompt:**
```
CRITICAL — LOCATION CONTEXT IN EVERY PANEL:
- ALWAYS include the location/setting in the "szene" description
- Make it clear WHERE the scene takes place
- Example: "Wide shot: Maria and Mama at hair salon, stylist cutting Maria's hair"
- If the scene is "at the hair salon" → ALL panels must show they are AT THE SALON
- "At hair salon" means a PROFESSIONAL STYLIST is cutting hair, NOT a family member

BAD EXAMPLES:
❌ "Mama cuts Maria's hair" → WRONG! Doesn't specify WHERE
❌ "Family eats dinner" → WRONG! Doesn't specify WHERE

GOOD EXAMPLES:
✅ "Wide shot: At professional hair salon, stylist cutting Maria's hair while Mama watches"
✅ "Medium shot: In restaurant dining room, waiter bringing food to family's table"
✅ "Close-up: Maria's happy face at hair salon, new haircut visible, salon mirrors in background"
```

✅ **Jetzt:** Jede Panel-Beschreibung enthält expliziten Location-Kontext
✅ **Resultat:** Klar dass sie beim Friseur sind, nicht zu Hause

---

## Erwartetes Verhalten nach Fix

### Szenario: "Friseur: Haare schneiden, Gesichtsmaske, Tee trinken"

**GPT-4 Structure generiert jetzt:**
```json
{
  "title": "Friseurtag mit Mama",
  "location": "professional hair salon",
  "panels": [
    {
      "nummer": 1,
      "szene": "Wide shot: At professional hair salon, Maria sits in salon chair while stylist cuts her hair, Mama watches from nearby chair, salon mirrors and products visible in background"
    },
    {
      "nummer": 2,
      "szene": "Medium shot: At hair salon, Maria has face mask applied by salon staff, Mama laughs at the funny green mask"
    },
    {
      "nummer": 3,
      "szene": "Close-up: At salon waiting area, Maria and Mama drinking tea together, relaxed atmosphere"
    },
    {
      "nummer": 4,
      "szene": "Medium shot: At hair salon, Maria admires her new haircut in salon mirror, Mama smiles proudly"
    }
  ]
}
```

✅ Jedes Panel hat "At professional hair salon" / "At hair salon"
✅ Klar dass STYLIST/STAFF die Arbeit macht, nicht Mama
✅ Location-Elemente sichtbar (salon chairs, mirrors, products)

### Neu Illustrieren mit Feedback

**User schreibt:** "Opa mehr im Vordergrund"

**Vorher:** Komplett neue Szene generiert ❌
**Jetzt:** Gleiche 4 Panels, aber Opa prominenter platziert ✅

---

## Geänderte Dateien

- `backend-railway/src/routes/comic.js`
  - Zeile ~1050: `reillustrationNote` ergänzt statt ersetzt
  - Zeile ~620-650: Location-Kontext Regeln hinzugefügt

---

## Test-Checkliste

### Test 1: Neu Illustrieren mit Feedback
- [ ] Comic generieren
- [ ] "Neu illustrieren" klicken
- [ ] Feedback eingeben: "Opa mehr im Vordergrund"
- [ ] Prüfen: Gleiche Szene, nur Opa prominenter
- [ ] Prüfen: NICHT komplett neue Szene

### Test 2: Location-Kontext
- [ ] Story: "Friseur: Haare schneiden, Gesichtsmaske, Tee trinken"
- [ ] Prüfen: Alle Panels zeigen professionellen Friseursalon
- [ ] Prüfen: Stylist schneidet Haare (NICHT Mama)
- [ ] Prüfen: Salon-Elemente sichtbar (Spiegel, Stühle, Produkte)

### Test 3: Restaurant vs Home
- [ ] Story: "Restaurant: Familie isst Abendessen"
- [ ] Prüfen: Restaurant-Setting sichtbar
- [ ] Prüfen: Kellner bringt Essen (NICHT Mama kocht)
- [ ] Prüfen: Restaurant-Elemente (Tische, Menü, andere Gäste)

---

## Status

✅ **FIXED** - Neu Illustrieren behält jetzt Panel-Struktur bei
✅ **FIXED** - Location-Kontext in allen Panel-Beschreibungen
✅ **READY FOR TEST**
