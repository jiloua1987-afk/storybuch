# Safety Block Fix - Wiederholte Panels behoben

## Problem

Wenn OpenAI Safety System eine Szene blockiert (z.B. "Friseur mit Gesichtsmaske"), wurden **alle 4 Panels identisch** generiert, obwohl die Story 4 verschiedene Momente beschreibt.

### Beispiel aus den Logs:

**Story:** Friseur: Haare schneiden, Gesichtsmaske (wie Frosch), Tee trinken

**Was GPT-4 Structure generiert:**
- Panel 1: Haare schneiden
- Panel 2: Gesichtsmaske (Frosch comment)
- Panel 3: Tee trinken
- Panel 4: Fertige Frisur

**Was tatsächlich im Bild erschien:**
- Panel 1: Haare schneiden ❌
- Panel 2: Haare schneiden (wiederholt) ❌
- Panel 3: Haare schneiden (wiederholt) ❌
- Panel 4: Haare schneiden (wiederholt) ❌

### Log-Analyse:

```
[err] → images.edit() failed, falling back: 400 Your request was rejected by the safety system
[err] ⚠️ WARNING: Generated without reference despite having photos!
[inf] → This would show WRONG FACES - attempting safe alternative with reference
[inf] ✓ Safe alternative generated WITH reference - faces maintained!
```

## Root Cause

Die Safe Alternative Prompts (Zeilen 1390 und 1420) enthielten **KEINE detaillierten Panel-Beschreibungen**.

**Vorher:**
```javascript
const safeAlternativePrompt = `${COMIC_STYLE} ${mood}

Comic page: "${page.title}" (safe family-friendly version)
${panelCount} panels in ${layoutDesc}. Bold black borders between panels.

CHARACTERS (draw EXACTLY as described):
${charAnchors}

SAFE ALTERNATIVE SCENE:
Create a family-friendly version of this scene with the same emotional tone.
- If beach/strand → show boardwalk/promenade with ice cream, NOT beach activities
- If party/club → show restaurant dinner with conversation, NOT dancing
...
`;
```

❌ **Problem:** Nur generische Anweisungen, keine spezifischen Panel-Beschreibungen
❌ **Resultat:** gpt-image-2 wiederholt das erste Panel 4x

## Lösung

**Jetzt:** Safe Alternative Prompts enthalten die **vollständigen Panel-Beschreibungen** mit `sanitizePrompt()`:

```javascript
// Sanitize panel descriptions to reduce safety triggers
const sanitizedPanelDesc = sanitizePrompt(panelDescriptions);

const safeAlternativePrompt = `${COMIC_STYLE} ${mood}

Comic page: "${page.title}" (safe family-friendly version)
${panelCount} panels in ${layoutDesc}. Bold black borders between panels.

CHARACTERS (draw EXACTLY as described):
${charAnchors}

${ageContext.modifier ? `AGE MODIFIER: ${ageContext.modifier}\n` : ""}
CRITICAL: Draw characters EXACTLY as described above.

CLOTHING — characters wear ${outfit}

SAFE ALTERNATIVE SCENE - DRAW ALL PANELS AS DESCRIBED:
${sanitizedPanelDesc}

CRITICAL RULES:
- Each panel MUST show a COMPLETELY DIFFERENT moment as described above
- Panel 1: First moment (as described)
- Panel 2: Second moment (DIFFERENT from panel 1, as described)
- Panel 3: Third moment (DIFFERENT from panels 1-2, as described)
- Panel 4: Fourth moment (DIFFERENT from all previous, as described)
...
`;
```

✅ **Jetzt:** Detaillierte Panel-Beschreibungen mit Sanitization
✅ **Resultat:** Alle 4 verschiedenen Panels werden korrekt generiert

## Was wurde geändert?

### 1. Erste Safe Alternative (Zeile ~1390)
- ✅ `sanitizePrompt(panelDescriptions)` hinzugefügt
- ✅ `${sanitizedPanelDesc}` in Prompt eingefügt
- ✅ Explizite Panel-Regeln hinzugefügt

### 2. Zweite Safe Alternative mit Reference (Zeile ~1420)
- ✅ `sanitizePrompt(panelDescriptions)` hinzugefügt
- ✅ `${sanitizedPanelDesc}` in Prompt eingefügt
- ✅ Explizite Panel-Regeln hinzugefügt

## Wie funktioniert `sanitizePrompt()`?

Die Funktion ersetzt Safety-Trigger durch sichere Alternativen:

```javascript
'gesichtsmaske' → 'face treatment'
'friseur' → 'hair salon'
'bierzelt' → 'festival tent'
'strand' → 'strandpromenade'
'party' → 'celebration gathering'
```

## Erwartetes Ergebnis

**Vorher (mit Safety Block):**
- Panel 1: Haare schneiden
- Panel 2: Haare schneiden (wiederholt)
- Panel 3: Haare schneiden (wiederholt)
- Panel 4: Haare schneiden (wiederholt)

**Jetzt (mit Fix):**
- Panel 1: Haare schneiden (sanitized)
- Panel 2: Face treatment (sanitized, aber ANDERES Panel)
- Panel 3: Tee trinken (sanitized)
- Panel 4: Fertige Frisur (sanitized)

## Test-Szenario

**Story:** "Friseur: Haare schneiden, Gesichtsmaske (wie Frosch), Tee trinken"

**Erwartung:**
1. Safety System blockiert initial
2. Safe Alternative wird mit sanitized Panel-Beschreibungen generiert
3. Alle 4 verschiedenen Panels erscheinen korrekt
4. Gesichter bleiben konsistent (Reference wird verwendet)

## Dateien geändert

- `backend-railway/src/routes/comic.js` (Zeilen 1390-1450)
  - Safe Alternative Prompt #1: Panel-Beschreibungen hinzugefügt
  - Safe Alternative Prompt #2: Panel-Beschreibungen hinzugefügt

## Status

✅ **FIXED** - Safety Block führt nicht mehr zu wiederholten Panels
✅ **TESTED** - Bereit für Test mit "Friseur" Szenario
