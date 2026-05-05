# Speech Bubbles im PDF Export - Debug

## Problem

Sprechblasen werden **nicht im PDF-Export angezeigt**, obwohl sie in der Vorschau sichtbar sind.

## Aktuelle Implementierung

### Backend (pdf-generator.js)

Die Bubble-Rendering-Logik ist bereits vorhanden (Zeilen 150-260):

1. **Flatten multi-bubble panels** - Unterstützt beide Formate:
   - `panel.dialogs` array (multi-bubble)
   - `panel.dialog` string (legacy single bubble)

2. **Position Mapping** - Konvertiert Prozent zu Pixel:
   ```javascript
   bubbleX = imgX + (pos.left / 100) * imgWidth;
   bubbleY = imgY + (pos.top / 100) * imgHeight;
   ```

3. **Rendering** - Zeichnet Bubble mit:
   - Weißer Hintergrund (#FFFEF8)
   - Dünner schwarzer Rand (1.5px)
   - Tail (Schwänzchen)
   - Speaker fett + Dialog normal

### Frontend (Step5Preview.tsx)

- `handleExportPDF()` sendet `project` mit allen `chapters`
- Jedes `chapter` sollte enthalten:
  - `panels` - Array mit Dialog-Daten
  - `panelPositions` - Array mit Position-Daten

## Mögliche Ursachen

1. **Daten fehlen im Export**
   - `panels` werden nicht mitgeschickt
   - `panelPositions` werden nicht gespeichert

2. **Datenstruktur stimmt nicht**
   - `panels` haben keine `dialog` oder `dialogs` Felder
   - `panelPositions` haben falsche `nummer` Werte

3. **Koordinaten-Problem**
   - Positionen sind außerhalb des sichtbaren Bereichs
   - Prozent-zu-Pixel-Konvertierung ist falsch

## Debug-Schritte

1. **Backend-Logs prüfen:**
   ```
   Page X: "Title"
     - panels: X
     - panelPositions: X
     - panels with dialog: X
     → Rendering bubbles for page X
     → Found X bubbles to render
     ✓ Rendered X bubbles
   ```

2. **Frontend-Daten prüfen:**
   - Console.log in `handleExportPDF()` vor dem Senden
   - Prüfen ob `project.chapters[i].panels` existiert
   - Prüfen ob `project.chapters[i].panelPositions` existiert

3. **PDF-Koordinaten prüfen:**
   - Sind `bubbleX` und `bubbleY` innerhalb von `imgX/imgY` + `imgWidth/imgHeight`?
   - Werden Bubbles vielleicht außerhalb des Bildes gerendert?

## Nächste Schritte

1. Logs im Backend aktivieren (bereits vorhanden)
2. Frontend-Daten vor Export loggen
3. Test-PDF generieren und Logs analysieren
4. Fix implementieren basierend auf Logs
