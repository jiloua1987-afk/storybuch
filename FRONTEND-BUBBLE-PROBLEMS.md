# Frontend Sprechblasen-Probleme - Analyse
*Stand: 8. Mai 2026*

## 🐛 GEFUNDENE PROBLEME

### Problem 1: Sprechblasen nicht bearbeitbar ✅ SOLLTE FUNKTIONIEREN

**Code-Analyse:**
- ✅ `editingBubbleId` State existiert (Zeile 332)
- ✅ Double-click Handler setzt `editingBubbleId` (Zeile 625)
- ✅ `handleDialogBlur` speichert Änderungen (Zeile 372-379)
- ✅ Multi-bubble Support vorhanden (Zeile 381-407)

**Warum funktioniert es nicht?**
- Möglicherweise wird `onDialogChange` nicht korrekt aufgerufen
- Oder: `editedDialogs` State wird nicht korrekt aktualisiert

**Test:** Doppelklick auf Bubble → sollte editierbar werden

---

### Problem 2: Neue Positionierungen werden nicht gespeichert ⚠️ PROBLEM GEFUNDEN

**Code-Analyse PanelView.tsx:**

```typescript
const handleMouseUp = () => {
  // Save positions to store when drag ends
  if (dragging && dragging.type === "panel" && onPositionsChange) {
    console.log('🎯 Drag ended, saving positions...');
    
    const updatedPositions: PanelPosition[] = dialogPanels.map((panel, bubbleIndex) => {
      const bubbleId = panel.bubbleId ?? `${panel.originalIndex}-0`;
      const dragPos = dragPositions[bubbleId];
      const resolved = resolvedPositions[bubbleIndex];
      
      const position = {
        nummer: panel.originalIndex + 1,
        top: dragPos?.top ?? resolved?.top ?? 5,
        left: dragPos?.left ?? resolved?.left ?? 2,
        width: resolved?.w ?? 20,
        height: resolved?.h ?? 10,
      };
      
      return position;
    });
    
    console.log(`  → Calling onPositionsChange with ${updatedPositions.length} positions`);
    onPositionsChange(updatedPositions);
  }
  setDragging(null);
};
```

**Problem:** `handleMouseUp` wird nur bei `dragging.type === "panel"` aufgerufen, aber:
- Wenn User außerhalb des Containers loslässt → `onMouseLeave` triggert `handleMouseUp`
- Aber `dragging` State könnte schon `null` sein

**Zusätzliches Problem:** Multi-bubble Panels
- Alle Bubbles eines Panels bekommen die gleiche `nummer` (panel.originalIndex + 1)
- Aber unterschiedliche Positionen
- Backend/Store kann nicht unterscheiden welche Bubble welche Position hat!

**Beispiel:**
```javascript
// Panel 3 hat 3 Bubbles:
[
  { nummer: 3, top: 10, left: 5 },  // Bubble 0
  { nummer: 3, top: 25, left: 5 },  // Bubble 1
  { nummer: 3, top: 40, left: 5 }   // Bubble 2
]
// Alle haben nummer: 3 → Backend kann sie nicht unterscheiden!
```

---

### Problem 3: Bubbles stapeln sich aufeinander ⚠️ PROBLEM GEFUNDEN

**Code-Analyse:**

```typescript
// Zeile 381-407: Flattening multi-bubble panels
const dialogPanels = panels.flatMap((p, panelIndex) => {
  if (p.dialogs && p.dialogs.length > 0) {
    // Multi-bubble format: create separate entry for each bubble
    return p.dialogs
      .filter(d => isValidDialog(d.text))
      .map((dialogItem, bubbleIndex) => ({
        ...p,
        dialog: dialogItem.text,
        speaker: dialogItem.speaker,
        originalIndex: panelIndex,
        bubbleIndex: bubbleIndex,
        bubbleId: `${panelIndex}-${bubbleIndex}`, // Unique ID for this bubble
        isMultiBubble: true,
      }));
  }
  // ...
});
```

**Dann in resolvedPositions (Zeile 437-467):**

```typescript
const resolvedPositions = useMemo(() => {
  const initial = dialogPanels.map((panel) => {
    const i = panel.originalIndex;
    const bubbleIdx = panel.bubbleIndex ?? 0;
    let top = 5;
    let left = 2;
    
    if (hasDetectedPositions) {
      const pos = panelPositions!.find(p => p.nummer === i + 1) || panelPositions![i];
      if (pos) { 
        top = pos.top + 2; 
        left = pos.left + 2;
        // For multi-bubble panels, stack them vertically with offset
        if (panel.isMultiBubble && bubbleIdx > 0) {
          top = top + (bubbleIdx * 15); // Stack with 15% vertical offset
        }
      }
    }
    // ...
  });
  // ...
}, [dialogPanels.length, hasDetectedPositions, panels.length]);
```

**Problem:**
```typescript
const pos = panelPositions!.find(p => p.nummer === i + 1) || panelPositions![i];
```

- `panelPositions` ist ein Array mit `nummer` Feld
- Für Multi-bubble Panels gibt es mehrere Einträge mit gleicher `nummer`
- `.find()` gibt immer nur den ERSTEN Eintrag zurück!
- Alle Bubbles eines Panels bekommen die gleiche Position
- Dann wird `+ (bubbleIdx * 15)` addiert, aber das reicht nicht wenn User die Bubbles verschoben hat

**Beispiel:**
```javascript
// panelPositions vom Backend:
[
  { nummer: 3, top: 10, left: 5 },   // Bubble 0
  { nummer: 3, top: 25, left: 10 },  // Bubble 1 (User hat sie verschoben)
  { nummer: 3, top: 40, left: 15 }   // Bubble 2 (User hat sie verschoben)
]

// Was passiert:
// Bubble 0: pos = find(nummer === 3) → { top: 10, left: 5 } ✓
// Bubble 1: pos = find(nummer === 3) → { top: 10, left: 5 } ✗ (sollte 25, 10 sein!)
// Bubble 2: pos = find(nummer === 3) → { top: 10, left: 5 } ✗ (sollte 40, 15 sein!)

// Dann wird Offset addiert:
// Bubble 1: top = 10 + 15 = 25 (zufällig richtig, aber left ist falsch!)
// Bubble 2: top = 10 + 30 = 40 (zufällig richtig, aber left ist falsch!)
```

---

### Problem 4: Viele Bubbles werden nicht gespeichert ⚠️ DATENSTRUKTUR-PROBLEM

**Root Cause:** `panelPositions` Array hat keine eindeutige Identifikation für Multi-bubble Panels

**Aktuelles Format:**
```typescript
interface PanelPosition {
  nummer: number;      // Panel-Nummer (nicht eindeutig bei Multi-bubble!)
  top: number;
  left: number;
  width: number;
  height: number;
}
```

**Problem:** Wenn Panel 3 drei Bubbles hat, gibt es drei Einträge mit `nummer: 3`, aber keine Möglichkeit zu unterscheiden welcher Eintrag zu welcher Bubble gehört!

**Lösung:** `bubbleIndex` hinzufügen:

```typescript
interface PanelPosition {
  nummer: number;        // Panel-Nummer
  bubbleIndex: number;   // Bubble-Index innerhalb des Panels (0, 1, 2, ...)
  top: number;
  left: number;
  width: number;
  height: number;
}
```

Dann kann man eindeutig identifizieren:
```javascript
const pos = panelPositions!.find(p => 
  p.nummer === i + 1 && p.bubbleIndex === bubbleIdx
);
```

---

## 🔧 FIXES BENÖTIGT

### Fix 1: PanelPosition Interface erweitern

**Datei:** `src/components/comic/PanelView.tsx` (Zeile 14-20)

```typescript
interface PanelPosition {
  nummer: number;
  bubbleIndex?: number;  // NEU: Optional für Backward-Compatibility
  top: number;
  left: number;
  width: number;
  height: number;
}
```

### Fix 2: handleMouseUp - bubbleIndex speichern

**Datei:** `src/components/comic/PanelView.tsx` (Zeile 540-565)

```typescript
const handleMouseUp = () => {
  if (dragging && dragging.type === "panel" && onPositionsChange) {
    console.log('🎯 Drag ended, saving positions...');
    
    const updatedPositions: PanelPosition[] = dialogPanels.map((panel, bubbleIndex) => {
      const bubbleId = panel.bubbleId ?? `${panel.originalIndex}-0`;
      const dragPos = dragPositions[bubbleId];
      const resolved = resolvedPositions[bubbleIndex];
      
      const position = {
        nummer: panel.originalIndex + 1,
        bubbleIndex: panel.bubbleIndex ?? 0,  // NEU: bubbleIndex hinzufügen
        top: dragPos?.top ?? resolved?.top ?? 5,
        left: dragPos?.left ?? resolved?.left ?? 2,
        width: resolved?.w ?? 20,
        height: resolved?.h ?? 10,
      };
      
      return position;
    });
    
    console.log(`  → Calling onPositionsChange with ${updatedPositions.length} positions`);
    onPositionsChange(updatedPositions);
  }
  setDragging(null);
};
```

### Fix 3: resolvedPositions - bubbleIndex beim Laden verwenden

**Datei:** `src/components/comic/PanelView.tsx` (Zeile 437-467)

```typescript
const resolvedPositions = useMemo(() => {
  const initial = dialogPanels.map((panel) => {
    const i = panel.originalIndex;
    const bubbleIdx = panel.bubbleIndex ?? 0;
    let top = 5;
    let left = 2;
    
    if (hasDetectedPositions) {
      // NEU: Suche mit nummer UND bubbleIndex
      const pos = panelPositions!.find(p => 
        p.nummer === i + 1 && 
        (p.bubbleIndex === undefined || p.bubbleIndex === bubbleIdx)
      );
      
      if (pos) { 
        top = pos.top + 2; 
        left = pos.left + 2;
        // Kein Offset mehr nötig - Position ist bereits korrekt gespeichert!
      } else {
        // Fallback: Wenn keine Position gefunden, verwende Slot-System
        const style = getFallbackPosition(i, panels.length);
        top  = parseFloat(String(style.top  ?? "5%"));
        left = parseFloat(String(style.left ?? style.right ?? "2%"));
        // Für Multi-bubble: Stack mit Offset
        if (panel.isMultiBubble && bubbleIdx > 0) {
          top = top + (bubbleIdx * 15);
        }
      }
    } else {
      // Keine gespeicherten Positionen: Verwende Fallback
      const style = getFallbackPosition(i, panels.length);
      top  = parseFloat(String(style.top  ?? "5%"));
      left = parseFloat(String(style.left ?? style.right ?? "2%"));
      if (panel.isMultiBubble && bubbleIdx > 0) {
        top = top + (bubbleIdx * 15);
      }
    }
    
    const text = (panel.speaker || "") + (panel.dialog || "");
    const wPx = Math.min(220, Math.max(100, 80 + text.length * 3.2));
    const lines = Math.ceil(text.length / 22);
    const hPx = Math.max(48, 28 + lines * 20);
    return { top, left, w: (wPx / 400) * 100, h: (hPx / 600) * 100 };
  });
  const resolved = resolveCollisions(initial);
  return resolved.map((pos, idx) => ({
    ...pos,
    w: initial[idx].w,
    h: initial[idx].h
  }));
}, [dialogPanels.length, hasDetectedPositions, panels.length, panelPositions]);
```

### Fix 4: useEffect - bubbleIndex beim initialen Speichern

**Datei:** `src/components/comic/PanelView.tsx` (Zeile 477-500)

```typescript
useEffect(() => {
  const storageKey = `bubble-init-${pageId}`;
  const alreadyInitialized = sessionStorage.getItem(storageKey);
  
  if (onPositionsChange && 
      resolvedPositions.length > 0 && 
      !hasDetectedPositions && 
      dialogPanels.length > 0 &&
      !alreadyInitialized) {
    
    console.log(`💾 Saving initial bubble positions for page ${pageId}`);
    const initialPositions: PanelPosition[] = dialogPanels.map((panel, bubbleIndex) => {
      const resolved = resolvedPositions[bubbleIndex];
      return {
        nummer: panel.originalIndex + 1,
        bubbleIndex: panel.bubbleIndex ?? 0,  // NEU: bubbleIndex hinzufügen
        top: resolved?.top ?? 5,
        left: resolved?.left ?? 2,
        width: resolved?.w ?? 20,
        height: resolved?.h ?? 10,
      };
    });
    console.log(`  → Saving ${initialPositions.length} initial positions`);
    onPositionsChange(initialPositions);
    
    sessionStorage.setItem(storageKey, 'true');
  }
}, [pageId, hasDetectedPositions, resolvedPositions.length, dialogPanels.length]);
```

### Fix 5: Delete Button - bubbleIndex beim Speichern

**Datei:** `src/components/comic/PanelView.tsx` (Zeile 590-610)

```typescript
onClick={(e) => { 
  e.stopPropagation(); 
  setHiddenBubbles(prev => new Set([...prev, bubbleId]));
  // Save updated positions after hiding bubble
  if (onPositionsChange) {
    const updatedPositions: PanelPosition[] = dialogPanels
      .filter(p => (p.bubbleId ?? `${p.originalIndex}-0`) !== bubbleId)
      .map((panel, bubbleIndex) => {
        const bid = panel.bubbleId ?? `${panel.originalIndex}-0`;
        const dragPos = dragPositions[bid];
        const resolved = resolvedPositions[bubbleIndex];
        return {
          nummer: panel.originalIndex + 1,
          bubbleIndex: panel.bubbleIndex ?? 0,  // NEU: bubbleIndex hinzufügen
          top: dragPos?.top ?? resolved?.top ?? 5,
          left: dragPos?.left ?? resolved?.left ?? 2,
          width: resolved?.w ?? 20,
          height: resolved?.h ?? 10,
        };
      });
    onPositionsChange(updatedPositions);
  }
}}
```

---

## 📋 ZUSAMMENFASSUNG

**Hauptproblem:** Multi-bubble Panels können nicht korrekt gespeichert/geladen werden, weil `panelPositions` keine `bubbleIndex` hat.

**Symptome:**
1. ✅ Bearbeitung sollte funktionieren (Code ist korrekt)
2. ❌ Positionen werden nicht gespeichert (bubbleIndex fehlt)
3. ❌ Bubbles stapeln sich (`.find()` gibt immer erste Position zurück)
4. ❌ Viele Bubbles gehen verloren (können nicht unterschieden werden)

**Lösung:** `bubbleIndex` zu `PanelPosition` Interface hinzufügen und überall verwenden.

**Backward Compatibility:** `bubbleIndex` ist optional (`bubbleIndex?: number`), alte Comics ohne Multi-bubble funktionieren weiterhin.

---

**Erstellt:** 8. Mai 2026
**Status:** Analyse komplett, Fixes definiert
**Nächster Schritt:** Fixes implementieren (5 Stellen in PanelView.tsx)
