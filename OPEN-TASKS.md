# Offene Aufgaben - MyComicStory
*Stand: 4. Mai 2026*

## 🔴 Kritisch (vor Go-Live)

### 1. Bubble-Positionen speichern testen ⚡
**Aufwand:** 10 Minuten Testing  
**Status:** ✅ Code deployed, muss getestet werden  
**Dateien:** `src/components/comic/PanelView.tsx`, `src/components/steps/Step5Preview.tsx`

**Was implementiert wurde:**
- Bubble-Positionen werden beim Drag-Ende in Store gespeichert
- `onPositionsChange` Callback ruft `updateChapter()` auf
- Positionen bleiben beim Navigieren erhalten

**Test-Szenario:**
1. Comic öffnen in Step5Preview
2. Sprechblase verschieben
3. Zu anderer Seite navigieren
4. Zurück zur ersten Seite
5. **Erwartung:** Bubble ist an neuer Position

**Wenn Test fehlschlägt:**
- Browser Console öffnen (F12)
- Nach Fehlermeldungen suchen
- Issue melden

---

### 2. Cover-Location-Problem lösen 🗺️
**Aufwand:** User-Testing  
**Status:** ✅ Cover-Regenerate mit Freitext implementiert  
**Dateien:** `src/components/steps/Step5Preview.tsx`, `backend-railway/src/routes/comic.js`

**Problem:**
- Story sagt "Lissabon" aber Cover zeigt Frankfurt
- Location-Extraktion priorisiert erste Stadt im Text

**Lösung implementiert:**
- Textarea unter Cover: "Was soll anders sein?"
- User kann eingeben: "Lissabon mit bunten Häusern und Tejo-Fluss"
- Button "Cover neu generieren"
- `coverRegenNote` überschreibt automatische Location-Erkennung

**Test:**
1. Cover mit falscher Stadt öffnen
2. Textarea: "Lissabon mit Tejo-Fluss und Straßenbahn"
3. "Cover neu generieren" klicken
4. **Erwartung:** Neues Cover zeigt Lissabon

---

### 3. PDF-Qualität final prüfen 📄
**Aufwand:** 1 Testdruck  
**Status:** Letzte Verbesserungen deployed  
**Dateien:** `backend-railway/src/lib/pdf-generator.js`

**Was verbessert wurde:**
- ✅ Weißer Rand konsistent (15px Padding)
- ✅ Bubble-Tails (Schwänzchen) hinzugefügt
- ✅ Speaker fett, Dialog normal
- ✅ Dünner Rahmen (1.5px)
- ✅ '& entfernt bei WIDMUNG und THE END
- ✅ Seitentitel größer (22pt)
- ✅ Cover-Titel schöner (32pt mit Hintergrund)

**Noch nicht perfekt:**
- ⚠️ Bubbles haben perfekte Rechtecke (nicht handgezeichnet wie Vorschau)
- Grund: PDFKit unterstützt keine komplexen SVG-Pfade
- Lösung: SVG→PNG→PDF (später, nach Go-Live)

**Nächster Schritt:**
- Testdruck bestellen
- Qualität prüfen
- Entscheiden: Go-Live oder weitere Anpassungen?

---

## 🟡 Wichtig (nach Go-Live)

### 4. Comic-Qualität verbessern 📚
**Aufwand:** Siehe `QUALITY-IMPROVEMENTS.md`  
**Status:** Analyse fertig, Implementierung in Phasen  
**Priorität:** Hoch (fundamentale Qualitätsverbesserung)

**Identifizierte Probleme:**
1. "1 Panel = 1 Satz" - keine echten Dialoge
2. Künstliches Wortlimit (15 Wörter)
3. Keine visuelle Dramaturgie
4. "1 Moment = 1 Seite" - zu wenig Seiten (5 statt 10-20)
5. Charaktere zu groß - nur Close-ups, keine Shot-Variation

**Lösungs-Roadmap:**
- **Phase 1 (Woche 1):** Mehr Momente (3→8) + Shot-Variation
- **Phase 2 (Monat 1):** Multi-Bubble-Dialoge + Panel-Größen
- **Phase 3 (Monat 3):** Momente aufteilen + Dramaturgie

**Details:** Siehe `QUALITY-IMPROVEMENTS.md`

---

### 5. Handgezeichnete Bubbles im PDF 🎨
**Aufwand:** 2-3 Stunden  
**Status:** Geplant für nach Go-Live  
**Priorität:** Hoch (Kunde erwartet identisches Aussehen)

**Problem:**
- Vorschau: Handgezeichnete Bubbles mit unregelmäßigem Rand
- PDF: Perfekte Rechtecke mit gleichmäßigem Rand
- Sieht nicht identisch aus

**Lösung:**
1. Bubble-Rendering-Logik aus `PanelView.tsx` extrahieren
2. Server-side SVG-zu-PNG Konvertierung mit Sharp
3. PNG-Bubbles ins PDF compositen
4. Identisches Aussehen wie Vorschau

**Dateien:**
- `backend-railway/src/lib/bubble-renderer.js` (neu)
- `backend-railway/src/lib/pdf-generator.js`
- `src/components/comic/PanelView.tsx` (Logik extrahieren)

---

### 5. Bubble-Tail-Positionierung in Vorschau 🎯
**Aufwand:** 3-4 Stunden  
**Status:** Geplant für nach Go-Live  
**Priorität:** Mittel

**Problem:**
- Bubble-Tail zeigt immer nach unten links
- Manchmal zeigt Tail nicht zum Sprecher

**Lösung:**
- Drag-Handle für Tail-Spitze
- User kann Tail-Richtung anpassen
- Position wird im Store gespeichert
- PDF verwendet gespeicherte Tail-Position

**Dateien:**
- `src/components/comic/PanelView.tsx`
- `src/store/bookStore.ts` (tailPosition hinzufügen)

---

### 6. Wizard-Umstrukturierung 🎨
**Aufwand:** 3-5 Stunden  
**Status:** Spezifikation aktualisiert  
**Dateien:** `WIZARD-REDESIGN-SPEC.md`

**Neue Struktur (5 Steps):**
1. **Geschichte, Stil & Bilder** - Kategorie + Stil + Foto-Upload (Familie/Einzeln/Keine)
2. **Inhalt** - Titel + Momente/Freitext + Dialoge
3. **Widmung** - (unverändert)
4. **Vorschau & Bearbeiten** - (unverändert)
5. **Bestellen** - (unverändert)

**Was raus ist:**
- ❌ Alle spezifischen Fragen (Kennenlernen, Zusammen, Personen, Zeitraum)
- ❌ Freitext/Geführt Toggle in Step 1
- ❌ Separater Upload-Step

**Was neu ist:**
- ✅ Bilder direkt in Step 1 (Familie/Einzeln/Keine)
- ✅ Momente-Vorschläge per Klick
- ✅ Fokus auf Momente & Dialoge in Step 2
- ✅ Freitext als Option in Step 2

---

## 🟢 Nice-to-Have (später)

### 7. Orts-/Situationsfotos hinzufügen 📸
**Aufwand:** 2-3 Stunden  
**Status:** Konzept erstellt, noch nicht implementiert  
**Priorität:** Niedrig (nach Wizard-Umbau & Tests)

**Konzept:**
- User kann Fotos von besonderen Orten hochladen (z. B. Strand, Restaurant, Hochzeitslocation)
- Orts-Fotos werden als Hintergrund/Setting-Referenz für spezifische Seiten verwendet
- Personen-Fotos bleiben für Charaktere (Cover → Konsistenz)

---

### 8. Multi-Age Photo System implementieren 📸
**Aufwand:** 1-2 Wochen  
**Spezifikation:** `MULTI-AGE-PHOTO-SYSTEM-SPEC.md`  
**Status:** Nur Spezifikation, noch nicht implementiert

**WICHTIG:** Das ist NICHT das Multi-Person System (das ist fertig)!

**Unterschied:**
- **Multi-Person** (✅ fertig): 2 Personen, je 1 Foto → Sally-Foto + Jil-Foto
- **Multi-Age** (📋 spec): 1 Person, mehrere Fotos → Sally-jung + Sally-alt

---

### 9. UI/UX Redesign 🎨
**Aufwand:** 1-2 Tage  
**Dateien:** `Step1-6.tsx`, `page.tsx`, `ueber-uns/page.tsx`  

**Ziel:**
- Ruhigeres Design
- Weniger Emojis
- Mehr Weißraum
- Große weiße Boxen mit Nummern-Kreisen
- Warme Farbpalette beibehalten

---

### 10. Lulu-Integration + Druckspezifikation 🖨️
**Aufwand:** 2-3 Tage  
**Status:** Analyse fertig, Implementierung später  
**Dateien:** `A4-FORMAT-UND-LULU-ANALYSE.md`

**Aktueller Stand:**
- ⚠️ Keine Lulu-Integration vorhanden
- Checkout ist Demo-Modus (keine echte Bestellung)
- gpt-image-2 liefert nur 1024×1536 px (max. 123 DPI auf A4)

**Lösungsoptionen:**
1. **Mit AI Upscaling:** 2048×3072 px → 246 DPI (sehr gut, +$0.05 pro Comic)
2. **Ohne Upscaling:** 1024×1536 px → 123 DPI (grenzwertig, Testdruck nötig)
3. **A5-Format:** 176 DPI ohne Upscaling (kleiner, aber bessere Qualität)

---

## ✅ Kürzlich erledigt (4. Mai 2026)

- ✅ PDF-Export mit Sprechblasen
- ✅ Bubble-Tails im PDF
- ✅ Weißer Rand konsistent (15px Padding)
- ✅ Speaker fett, Dialog normal im PDF
- ✅ '& entfernt bei WIDMUNG und THE END
- ✅ Seitentitel größer und schöner
- ✅ Cover-Titel mit Hintergrund
- ✅ Cover-Regenerate mit Freitext-Anweisung
- ✅ Bubble-Positionen speichern (Code implementiert)
- ✅ Multi-Person Photo Matching System
- ✅ Age-Based Character Rendering
- ✅ Quality Score + Auto-Retry
- ✅ "Neu illustrieren" mit Freitextfeld
- ✅ Seite löschen Feature
- ✅ Visual Polish (Bronze Design)

---

**Nächster Schritt:** Bubble-Positionen testen (Task #1)  
**Danach:** Cover-Regenerate testen (Task #2)  
**Dann:** Testdruck bestellen (Task #3)
