# ComicStyle.de - Roadmap

**Letzte Aktualisierung:** 10. Mai 2025

---

## 🔥 KRITISCHE PROBLEME (Sofort)

### 1. **Clothing-Consistency** ⚠️ HOCH
**Problem:** Charaktere tragen unterschiedliche Kleidung auf verschiedenen Seiten
- Cover: Mama braunes Shirt, Papa grünes Shirt, Rania blaues Kleid
- Seite 1: Andere Kleidung
- Seite 2: Noch andere Kleidung

**Lösung:**
- Nach Cover-Generierung: Kleidung jedes Charakters extrahieren/speichern
- In jeden Seiten-Prompt einbauen: "Mama wears brown button-up shirt, Papa wears dark green shirt..."
- Prompt: "CRITICAL: Maintain EXACT same clothing as reference image"

**Impact:** Hoch - Konsistenz ist Kernfeature
**Aufwand:** Mittel (2-3h)

---

### 2. **Character-Presence-Check** ⚠️ HOCH
**Problem:** Papa fehlt auf manchen Seiten, obwohl er in der Szene sein sollte

**Lösung:**
- Story-Analyse: Welche Charaktere sind in welcher Szene?
- Explizit im Prompt erwähnen: "Characters in scene: Mama, Papa, Rania, Aymen"
- Warnung wenn Charakter fehlt

**Impact:** Hoch - Charaktere müssen präsent sein
**Aufwand:** Mittel (2-3h)

---

### 3. **Duplicate Characters in Panel** ⚠️ KRITISCH
**Problem:** GPT bildet manchmal eine Figur ZWEIMAL im gleichen Panel ab
- Beispiel: Aymen erscheint links UND rechts im gleichen Panel
- Verwirrt Leser, sieht unprofessionell aus

**Lösung:**
- Strikter Prompt: "CRITICAL: Each character appears EXACTLY ONCE per panel. Never show the same character multiple times in one panel."
- Panel-Beschreibung präziser: "Rania in center, Aymen on left, Papa on right" (klare Positionen)
- Post-Generation-Check: Warnung wenn möglich

**Impact:** Kritisch - zerstört Immersion
**Aufwand:** Niedrig (Prompt-Änderung)

---

### 4. **Face-Consistency nimmt ab** ⚠️ HOCH
**Problem:** 
- Cover: ✅ Perfekt
- Seite 1: ✅ Gut
- Seite 2+: ❌ Gesichter ändern sich immer mehr

**Lösung:**
- Stärkere Prompts: "CRITICAL: Maintain EXACT same facial features as reference image"
- Evtl. Cover-Reference mehrfach verwenden (nicht nur einmal)
- Face-Locking mit OpenAI's neue Features (falls verfügbar)

**Impact:** Hoch - Konsistenz ist Kernfeature
**Aufwand:** Mittel-Hoch (3-4h)

---

## 📋 WICHTIGE FEATURES (Bald)

### 5. **Speaker bearbeiten** 📝 MITTEL
**Problem:** Beim Text-Bearbeiten kann man nur Dialog ändern, nicht den Speaker
- User will "Papa:" → "Mama:" ändern können

**Lösung:**
- Input-Feld für Speaker im Edit-Modus hinzufügen
- Speichern in `dialogs[].speaker`

**Impact:** Mittel - Nice-to-have für Flexibilität
**Aufwand:** Niedrig (1-2h)

---

### 6. **Bubble-Positionierung 100% perfekt** 📍 NIEDRIG
**Problem:** Positionen werden "etwas besser" gespeichert, aber nicht 100% perfekt

**Status:** Aktuell "gut genug" - einfaches 2-Spalten-Grid funktioniert

**Lösung (falls nötig):**
- Mehr Logging in `resolvedPositions`
- `dragPositions` auch in Store speichern?

**Impact:** Niedrig - funktioniert bereits "gut genug"
**Aufwand:** Mittel (2-3h)

---

## ✅ ERLEDIGTE FEATURES

### ✅ Bubble-Größe speichern (10. Mai 2025)
- Frontend: `useEffect` in `ResizableBubble` aktualisiert State
- Backend: PDF verwendet gespeicherte Größen
- **Status:** Funktioniert ✅

### ✅ Hidden Bubbles persistieren (10. Mai 2025)
- `hiddenBubbles` Feld in Store
- Gelöschte Bubbles bleiben gelöscht nach Navigation
- PDF filtert hidden bubbles
- **Status:** Funktioniert ✅

### ✅ Text-Bearbeitung (10. Mai 2025)
- Double-Click öffnet Edit-Modus
- Textarea verwendet `editedDialogs` State (nicht `displayDialog`)
- Speichert in Store
- **Status:** Funktioniert ✅

### ✅ PDF-Export (10. Mai 2025)
- Cover ohne schwarzen Balken (nur goldene Linien)
- Bubbles skaliert (70%) für PDF
- Hidden bubbles gefiltert
- Gespeicherte Größen verwendet
- **Status:** Funktioniert ✅

### ✅ CORS-Fix (10. Mai 2025)
- Alle Vercel-Domains erlaubt
- Dynamische Origin-Funktion
- **Status:** Funktioniert ✅

---

## 🎯 LANGFRISTIGE VISION

### Panel-by-Panel Generation
**Idee:** Jedes Panel einzeln generieren statt ganze Seiten
- **Pro:** Höhere Konsistenz, bessere Kontrolle
- **Contra:** Langsamer, teurer
- **Status:** Evaluieren

### Face-Locking mit AI
**Idee:** OpenAI's neue Consistency-Features nutzen
- **Status:** Warten auf OpenAI-Updates

### Clothing-Override per Panel
**Idee:** User kann Kleidung pro Szene überschreiben
- Beispiel: "Rania trägt Partykleid auf Geburtstag"
- **Status:** Nice-to-have

---

## 📊 Prioritäten-Matrix

| Feature | Impact | Aufwand | Priorität |
|---------|--------|---------|-----------|
| Duplicate Characters Fix | Kritisch | Niedrig | 🔥 **SOFORT** |
| Clothing-Consistency | Hoch | Mittel | 🔥 **SOFORT** |
| Character-Presence | Hoch | Mittel | 🔥 **SOFORT** |
| Face-Consistency | Hoch | Hoch | ⚠️ **BALD** |
| Speaker bearbeiten | Mittel | Niedrig | 📋 **BALD** |
| Bubble-Position 100% | Niedrig | Mittel | 💤 **SPÄTER** |

---

## 🚀 Nächste Schritte

1. **Duplicate Characters Fix** (30 Min)
   - Prompt-Änderung: "Each character appears EXACTLY ONCE per panel"
   
2. **Clothing-Consistency** (2-3h)
   - Cover-Kleidung extrahieren
   - In Seiten-Prompts einbauen

3. **Character-Presence** (2-3h)
   - Story-Analyse für Charakter-Präsenz
   - Explizite Charakter-Liste in Prompts

4. **Face-Consistency** (3-4h)
   - Stärkere Prompts
   - Evtl. Cover mehrfach als Reference

---

**Geschätzte Zeit für kritische Fixes:** 6-8 Stunden  
**Geschätzte Zeit für alle Features:** 12-15 Stunden

---

**Erstellt:** 10. Mai 2025  
**Nächstes Review:** Nach kritischen Fixes
