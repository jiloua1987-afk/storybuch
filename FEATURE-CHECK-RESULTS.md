# Feature Check Results
*Stand: 5. Mai 2026*

## 📋 Geprüfte Punkte

### 1. ❌ Multi-Bubble Dialoge (Immer noch nur 1 Bubble pro Panel)

**Status:** Backend implementiert, Frontend implementiert, **ABER GPT generiert nicht**

**Was funktioniert:**
- ✅ Backend GPT-Prompt hat Multi-Bubble Support (`dialogs: [{speaker, text}]`)
- ✅ Frontend kann Multi-Bubbles rendern (Individual control)
- ✅ TypeScript Interfaces aktualisiert

**Was NICHT funktioniert:**
- ❌ GPT gibt trotzdem nur `dialog` + `speaker` zurück (legacy format)
- ❌ Keine `dialogs` Arrays in der Response

**Warum:**
GPT-4.1 ignoriert die Anweisung oder bevorzugt das einfachere Format.

**Lösung:**
Prompt muss stärker sein:
```javascript
CRITICAL: You MUST use the "dialogs" array format for conversations.
NEVER use single "dialog" + "speaker" for multi-character scenes.

Example CORRECT format:
{
  "nummer": 1,
  "dialogs": [
    {"speaker": "Maria", "text": "Schau mal!"},
    {"speaker": "Marc", "text": "Wow!"}
  ]
}

Example WRONG format (DO NOT USE):
{
  "nummer": 1,
  "dialog": "Schau mal!",
  "speaker": "Maria"
}
```

---

### 2. ❌ Positionierung der Sprechblasen wird nicht gespeichert

**Status:** Code vorhanden, **ABER nicht verbunden**

**Was funktioniert:**
- ✅ `PanelView.tsx` hat `onPositionsChange` Callback
- ✅ `handleMouseUp()` ruft `onPositionsChange()` auf
- ✅ `Step5Preview.tsx` hat `panelPositions` im State

**Was NICHT funktioniert:**
- ❌ `PanelView` bekommt KEINEN `onPositionsChange` Callback übergeben
- ❌ Positionen werden nicht in Store gespeichert

**Code in Step5Preview.tsx:**
```tsx
<PanelView
  imageUrl={page.imageUrl || ""}
  panels={page.panels || []}
  panelPositions={page.panelPositions}
  pageId={page.id}
  pageNumber={currentPage + 1}
  // ❌ FEHLT: onPositionsChange={handlePositionsChange}
/>
```

**Lösung:**
1. Handler in Step5Preview.tsx erstellen
2. Als Prop an PanelView übergeben
3. In Store speichern

---

### 3. ✅ ?debug zeigt Export-Möglichkeit

**Status:** Funktioniert korrekt

**Code:**
```tsx
// Debug-Modus aktivieren mit ?debug=true in URL
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  setShowDebugTools(params.get('debug') === 'true');
}, []);

{showDebugTools && (
  <div className="border-2 border-yellow-300 bg-yellow-50 rounded-2xl p-4">
    <p className="text-xs text-yellow-700 font-semibold">🔧 DEBUG-TOOLS</p>
    <button onClick={handleExportPDF}>
      📄 Als PDF exportieren
    </button>
  </div>
)}
```

**Verwendung:** `http://localhost:3000/wizard?debug=true`

**Wenn nicht sichtbar:**
- URL prüfen: Muss `?debug=true` enthalten
- Browser-Cache leeren
- React DevTools: `showDebugTools` State prüfen

---

### 4. ✅ Weißer Rand zwischen Panels und am Rand

**Status:** Implementiert

**Code in `sharp-compositor.ts`:**
```typescript
const border = 12; // 12px weißer Rand

// Beispiel 3-Panel Layout:
{ x: border, y: titleH, width: usableW, height: usableH * 0.5 },
{ x: border, y: titleH + usableH * 0.5 + border, width: usableW / 2 - border / 2, height: usableH * 0.5 - border },
```

**Was passiert:**
- 12px Rand außen (links, rechts, zwischen Panels)
- Panels haben Abstand zueinander
- Cream Background (#F5EDE0) füllt Lücken

**Wenn nicht sichtbar:**
- Prüfen: Wird `sharp-compositor.ts` verwendet?
- Prüfen: Sind Bilder zu groß (füllen ganze Fläche)?
- Backend-Logs checken: "Compositing X panels"

---

### 5. ✅ Cover: Freitextfeld und "Neu generieren"

**Status:** Implementiert und sichtbar

**Code in Step5Preview.tsx:**
```tsx
<div className="absolute bottom-4 right-4 left-4 bg-white/95 border rounded-xl p-3">
  <textarea
    value={coverRegenNote}
    onChange={(e) => setCoverRegenNote(e.target.value)}
    placeholder="Was soll anders sein? z.B. 'Lissabon statt Frankfurt' (optional)"
    className="w-full text-xs border rounded-lg px-3 py-2"
  />
  <button onClick={handleRegenerateCover}>
    🎨 Cover neu generieren
  </button>
</div>
```

**Position:** Unten auf dem Cover-Bild (absolute positioning)

**Wenn nicht sichtbar:**
- Prüfen: Ist Cover vorhanden?
- Prüfen: CSS `absolute` positioning korrekt?
- Browser-Inspektor: Element vorhanden?

---

## 🔧 Fixes Needed

### Fix 1: Multi-Bubble Dialoge erzwingen

**Datei:** `backend-railway/src/routes/comic.js`

**Änderung im GPT-Prompt:**
```javascript
CRITICAL INSTRUCTION - READ CAREFULLY:

For panels with multiple characters talking, you MUST use the "dialogs" array format.
DO NOT use single "dialog" + "speaker" for conversations.

CORRECT format (use this):
{
  "nummer": 1,
  "szene": "...",
  "dialogs": [
    {"speaker": "Maria", "text": "Schau mal, wie schön!"},
    {"speaker": "Marc", "text": "Wow, das ist ja toll!"}
  ],
  "bubble_type": "speech"
}

WRONG format (NEVER use this for conversations):
{
  "nummer": 1,
  "szene": "...",
  "dialog": "Schau mal, wie schön!",
  "speaker": "Maria",
  "bubble_type": "speech"
}

Use single "dialog" + "speaker" ONLY for:
- Silent panels (empty dialog)
- Narrator captions
- Single character monologues

For 2+ characters interacting: ALWAYS use "dialogs" array.
```

---

### Fix 2: Position Saving verbinden

**Datei:** `src/components/steps/Step5Preview.tsx`

**Hinzufügen:**
```tsx
// Handler für Bubble-Position-Änderungen
const handlePositionsChange = useCallback((positions: PanelPosition[]) => {
  if (!project?.chapters) return;
  
  const currentPageData = project.chapters[currentPage];
  if (!currentPageData) return;
  
  // Update chapter with new positions
  updateChapter(currentPageData.id, {
    panelPositions: positions
  });
  
  console.log(`✓ Saved ${positions.length} bubble positions for page ${currentPage + 1}`);
}, [currentPage, project?.chapters, updateChapter]);

// In PanelView Komponente:
<PanelView
  imageUrl={page.imageUrl || ""}
  panels={page.panels || []}
  panelPositions={page.panelPositions}
  pageId={page.id}
  pageNumber={currentPage + 1}
  onPositionsChange={handlePositionsChange}  // ← NEU
/>
```

---

## 📊 Zusammenfassung

| Feature | Status | Fix Needed |
|---------|--------|------------|
| Multi-Bubble Dialoge | ❌ | Ja - GPT Prompt verstärken |
| Position Saving | ❌ | Ja - Callback verbinden |
| ?debug Export | ✅ | Nein |
| Weißer Rand Panels | ✅ | Nein |
| Cover Freitext | ✅ | Nein |

**Priorität:**
1. **Position Saving** - Kritisch für UX
2. **Multi-Bubble Dialoge** - Wichtig für Qualität

**Aufwand:**
- Position Saving: 5 Minuten
- Multi-Bubble Prompt: 10 Minuten
- **Total: 15 Minuten**
