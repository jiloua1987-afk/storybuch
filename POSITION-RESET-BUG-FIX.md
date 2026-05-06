# Position Reset Bug - GEFIXT ✅

## Problem

**User-Report:**
> "Seite 2 hatte ich geöffnet und zurück zu Seite 1 und wieder 2, dann waren die Positionierungen wieder auf dem ursprünglichen aueinander gestapelten Stand"

**Root Cause:**
Der `useEffect` Hook für initiale Positionen wurde bei **jedem Seitenwechsel** erneut getriggert und überschrieb die manuell verschobenen Positionen.

### Warum passierte das?

1. User öffnet Seite 2 → `useEffect` speichert initiale Positionen
2. User verschiebt Bubbles → Positionen werden gespeichert
3. User wechselt zu Seite 1 → alles OK
4. User wechselt zurück zu Seite 2 → **`useEffect` triggert ERNEUT!**
5. Grund: `hasDetectedPositions` war `false` weil Daten noch nicht geladen
6. Resultat: Initiale Positionen überschreiben die manuell verschobenen!

## Lösung

### Vorher (FALSCH):
```typescript
useEffect(() => {
  if (onPositionsChange && !hasDetectedPositions && ...) {
    // Speichert IMMER wenn hasDetectedPositions false ist
    onPositionsChange(initialPositions);
  }
}, [dialogPanels.length, hasDetectedPositions]);
```

**Problem:** Triggert bei jedem Render wenn `hasDetectedPositions` sich ändert.

### Nachher (RICHTIG):
```typescript
useEffect(() => {
  const storageKey = `bubble-init-${pageId}`;
  const alreadyInitialized = sessionStorage.getItem(storageKey);
  
  if (onPositionsChange && 
      !hasDetectedPositions && 
      !alreadyInitialized) {  // ← NEU: Prüft sessionStorage
    
    onPositionsChange(initialPositions);
    sessionStorage.setItem(storageKey, 'true');  // ← NEU: Markiert als initialisiert
  }
}, [pageId, hasDetectedPositions, resolvedPositions.length, dialogPanels.length]);
```

**Lösung:** 
- Speichert Initialisierungs-Status in `sessionStorage`
- Key: `bubble-init-${pageId}` (z.B. `bubble-init-page1`)
- Wird nur **einmal pro Seite pro Session** ausgeführt

## Verhalten jetzt

### Szenario 1: Erste Seite öffnen
1. User öffnet Seite 1
2. `sessionStorage.getItem('bubble-init-page1')` → `null`
3. Initiale Positionen werden gespeichert
4. `sessionStorage.setItem('bubble-init-page1', 'true')`
5. ✅ Positionen sind gespeichert

### Szenario 2: Bubbles verschieben
1. User verschiebt Bubble
2. `handleMouseUp()` speichert neue Position
3. ✅ Position ist aktualisiert

### Szenario 3: Seitenwechsel und zurück
1. User wechselt zu Seite 2
2. `sessionStorage.getItem('bubble-init-page2')` → `null`
3. Initiale Positionen für Seite 2 werden gespeichert
4. User wechselt zurück zu Seite 1
5. `sessionStorage.getItem('bubble-init-page1')` → `'true'` ✅
6. **KEIN erneutes Speichern!**
7. ✅ Manuelle Positionen bleiben erhalten

### Szenario 4: Page Reload
1. User lädt Seite neu (F5)
2. `sessionStorage` wird geleert
3. Alle Seiten werden neu initialisiert
4. ✅ Gespeicherte Positionen aus Store werden geladen

## Vorteile dieser Lösung

✅ **Pro Session:** Initialisierung nur einmal pro Seite pro Browser-Session
✅ **Persistent:** Manuelle Positionen bleiben beim Seitenwechsel erhalten
✅ **Clean:** Kein komplexer State-Management
✅ **Robust:** Funktioniert auch bei schnellen Seitenwechseln

## Test-Schritte

1. **Seite 1 öffnen:**
   - Console: `💾 Saving initial bubble positions for page page1`
   - Bubbles sind positioniert

2. **Bubble verschieben:**
   - Console: `🎯 Drag ended, saving positions...`
   - Bubble ist an neuer Position

3. **Zu Seite 2 wechseln:**
   - Console: `💾 Saving initial bubble positions for page page2`
   - Seite 2 Bubbles sind positioniert

4. **Zurück zu Seite 1:**
   - Console: **KEINE** `💾 Saving initial...` Nachricht
   - Bubble ist **noch an verschobener Position** ✅

5. **Wieder zu Seite 2:**
   - Console: **KEINE** `💾 Saving initial...` Nachricht
   - Positionen bleiben erhalten ✅

## Status: GEFIXT ✅

Das Problem ist vollständig gelöst. Positionen bleiben jetzt beim Seitenwechsel erhalten!
