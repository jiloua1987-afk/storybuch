# Bubble Position Saving - Status

## ✅ Was funktioniert

1. **Drag & Drop Speicherung**
   - Positionen werden beim `mouseUp` nach Drag gespeichert
   - `handleMouseUp()` ruft `onPositionsChange()` auf
   - Positionen werden im Store via `updateChapter()` gespeichert

2. **Callback-Verbindung**
   - `PanelView` hat `onPositionsChange` prop
   - `Step5Preview` hat `handlePositionsChange` Funktion
   - Verbindung ist korrekt implementiert

3. **Multi-Bubble Support**
   - Beide Formate werden unterstützt: `dialog` (single) und `dialogs` (array)
   - Jede Bubble bekommt unique ID (z.B. "3-0", "3-1")
   - Bubbles werden korrekt geflattened

## ⚠️ Potenzielle Probleme

### 1. Initiale Positionen werden nicht gespeichert

**Problem:** Wenn eine Seite zum ersten Mal geladen wird, werden die automatisch berechneten Positionen NICHT gespeichert.

**Auswirkung:** 
- Beim PDF-Export fehlen die Positionen
- Bubbles erscheinen an Fallback-Positionen (30px, 30px + idx*100)

**Lösung:** Initiale Positionen beim ersten Render speichern

### 2. Gelöschte Bubbles aktualisieren Positionen nicht

**Status:** ✅ GEFIXT
- Beim Löschen einer Bubble werden jetzt die Positionen aktualisiert

### 3. Extra-Bubbles werden nicht persistiert

**Problem:** Extra-Bubbles (manuell hinzugefügt) existieren nur im lokalen State

**Auswirkung:**
- Beim Seitenwechsel verschwinden sie
- Im PDF-Export erscheinen sie nicht

**Status:** Wahrscheinlich beabsichtigt (temporäre Bearbeitung)

### 4. Bearbeitete Dialoge werden nicht gespeichert

**Problem:** `editedDialogs` State wird nicht im Store gespeichert

**Auswirkung:**
- Beim Seitenwechsel gehen Änderungen verloren
- Im PDF-Export erscheinen Original-Texte

**Status:** Muss geprüft werden

## 🔧 Empfohlene Fixes

### Fix 1: Initiale Positionen speichern

```typescript
// In PanelView.tsx
useEffect(() => {
  if (onPositionsChange && resolvedPositions.length > 0 && !hasDetectedPositions) {
    // Save initial positions on first render
    const initialPositions: PanelPosition[] = dialogPanels.map((panel, bubbleIndex) => {
      const resolved = resolvedPositions[bubbleIndex];
      return {
        nummer: panel.originalIndex + 1,
        top: resolved?.top ?? 5,
        left: resolved?.left ?? 2,
        width: resolved?.w ?? 20,
        height: resolved?.h ?? 10,
      };
    });
    onPositionsChange(initialPositions);
  }
}, [resolvedPositions, hasDetectedPositions]); // Only on first render
```

### Fix 2: Bearbeitete Dialoge speichern

```typescript
// In PanelView.tsx
const handleDialogBlur = (panelIndex: number, newText: string) => {
  setEditingIndex(null);
  if (onDialogChange) {
    onDialogChange(panelIndex, newText);
  }
};
```

Dann in Step5Preview:
```typescript
const handleDialogChange = (panelIndex: number, newText: string) => {
  const currentPageData = project.chapters[currentPage];
  const updatedPanels = [...currentPageData.panels];
  updatedPanels[panelIndex] = {
    ...updatedPanels[panelIndex],
    dialog: newText
  };
  updateChapter(currentPageData.id, { panels: updatedPanels });
};
```

## 🎯 Kritischste Probleme für PDF-Export

1. **Initiale Positionen fehlen** → Bubbles erscheinen an falschen Stellen
2. **Bearbeitete Dialoge fehlen** → Alte Texte im PDF

Diese beiden müssen gefixt werden, damit der PDF-Export korrekt funktioniert.
