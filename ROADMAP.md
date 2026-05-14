# ComicStyle.de - Roadmap

**Letzte Aktualisierung:** 14. Mai 2026

---

## 🔥 KRITISCHE PROBLEME (Sofort lösen)

### 1. **PDF Bubble-Position & Größe stimmt nicht mit Vorschau überein** ⚠️ HOCH
**Problem:** Sprechblasen im PDF haben andere Position und Größe als in der Vorschau
- Vorschau: Bubble korrekt platziert, richtige Größe
- PDF: Bubble an anderer Stelle, andere Größe

**Root Cause:** Koordinaten-Mapping zwischen Vorschau-Container (variable Breite je nach Bildschirm) und PDF-Bildbereich (fix 510×765px nach Letterboxing) funktioniert nicht 1:1.

**Status:** ⏳ IN ARBEIT
**Aufwand:** Mittel (2-3h)

---

### 2. **Kleidungs-Konsistenz** ⚠️ HOCH
**Problem:** Charaktere tragen auf verschiedenen Seiten unterschiedliche Kleidung (z.B. Mama mal blaues Minikleid, mal langes Kleid)

**Root Cause:** gpt-image-2 gewichtet Referenzbild stärker als Text-Prompt. Prompt-basierte Lösungen (getOutfit, Hash-Funktionen) funktionieren nicht zuverlässig — das Modell interpretiert Kleidung frei.

**Bisherige Versuche (alle gescheitert):**
- Hash-basierte deterministische Kleidung
- Szenen-spezifische Kleidung
- "CRITICAL CLOTHING RULES" im Prompt
- visual_anchor ohne Kleidung

**Ehrliche Einschätzung:** Nicht lösbar mit Prompt-Engineering allein. Fundamentale Limitation von gpt-image-2.

**Mögliche Lösung:** FLUX.2 Kontext (bessere Konsistenz-Kontrolle)

**Status:** ❌ NICHT GELÖST — Modell-Limitation
**Aufwand:** Nur durch Modell-Wechsel lösbar

---

### 3. **Gesichts-/Stil-Konsistenz** ⚠️ HOCH
**Problem:**
- Nicht-Foto-Charaktere (Oma, Opa) sehen auf jeder Seite anders aus
- Stil-Drift zwischen Seiten
- Safety-Rejections erzwingen Fallback ohne Referenz → komplett andere Charaktere

**Teilweise gelöst:**
- ✅ Stärkere Face-Consistency Prompts
- ✅ Cover als Referenz für alle Seiten
- ❌ Nicht-Foto-Charaktere bleiben inkonsistent (kein Foto = kein Anker)
- ❌ Safety-Rejections zerstören Konsistenz komplett

**Status:** ⚠️ TEILWEISE GELÖST
**Aufwand:** Nur durch Modell-Wechsel oder Panel-by-Panel vollständig lösbar

---

## 📋 WICHTIGE FEATURES (Bald)

### 4. **Speaker bearbeiten** 📝 MITTEL
**Problem:** Beim Text-Bearbeiten kann man nur Dialog ändern, nicht den Speaker

**Lösung:** Input-Feld für Speaker im Edit-Modus
**Status:** ⏳ OFFEN
**Aufwand:** Niedrig (1-2h)

---

### 5. **GPT generiert Text ins Bild** � MITTEL
**Problem:** Trotz "NO text" im Prompt generiert GPT manchmal Seitenangaben oder Text ins Bild (z.B. "Seite 1: Aufregung am Flughafen")

**Status:** ⏳ OFFEN — schwer zu verhindern, Modell-Limitation

---

### 6. **Dialog-Zuordnung zu Panels** � NIEDRIG
**Problem:** Dialoge passen manchmal nicht zum Panel-Inhalt (z.B. "Das riecht lecker" auf Panel ohne Essen)

**Root Cause:** GPT generiert 1 Bild pro Seite und interpretiert Panel-Beschreibungen frei. Dialoge sind fest zugeordnet, aber Bild-Inhalt weicht ab.

**Lösung:** Nur durch Panel-by-Panel Generierung lösbar
**Status:** ⏳ OFFEN — Langfristig

---

## ✅ ERLEDIGT

### PDF-Export
- ✅ Cover-Titel dynamische Schriftgröße + mittig zwischen Linien
- ✅ Seitenzahl außerhalb des Bildes (rechts unten)
- ✅ Bangers Comic-Font für Sprechblasen
- ✅ Extra-Bubbles (user-hinzugefügte) werden exportiert
- ✅ Hidden Bubbles werden gefiltert
- ✅ fit:contain — Panels werden nicht abgeschnitten
- ✅ Cover ohne schwarzen Balken (goldene Linien)

### Sprechblasen (Frontend)
- ✅ Text-Bearbeitung per Doppelklick
- ✅ Größe speichern/laden
- ✅ Hidden Bubbles persistieren über Seitenwechsel
- ✅ Position per Drag&Drop

### Backend / Bildgenerierung
- ✅ CORS fix
- ✅ Duplicate Characters Prompt
- ✅ Multi-Photo Composite Metadata Bug fix
- ✅ Multi-Photo Fallback wählt szenen-passendes Foto
- ✅ visual_anchor ohne Kleidung (nur Gesicht/Körper)
- ✅ getOutfit() mit pageTitle + deutschen Keywords (Flughafen, Geburtstag etc.)
- ✅ Safety-Rewriter
- ✅ Face-Consistency Prompts verstärkt

---

## 💡 EVALUIEREN (Mittelfristig)

### **FLUX.2 Kontext statt gpt-image-2**
**Warum:** Löst potenziell Kleidungs- UND Gesichts-Konsistenz
- ✅ Explizit für Character Consistency gebaut
- ✅ 5-10x günstiger ($0.03 vs $0.15-0.41 pro Bild)
- ✅ Weniger Safety-Rejections
- ✅ Mehrere Referenzbilder gleichzeitig
- ⚠️ Anderer API-Ansatz (kein images.edit)
- ⚠️ 1-2 Tage Umbau

**Ansatz:** Branch erstellen, Seiten-Generierung mit FLUX testen, Cover bei OpenAI lassen
**Status:** 💤 Evaluieren wenn stabil

---

### **Panel-by-Panel Generierung**
**Warum:** Löst Dialog-Zuordnung + bessere Kontrolle
- Pro: Jedes Panel exakt wie beschrieben
- Contra: 4x API-Calls, 4x Kosten, langsamer
**Status:** 💤 Langfristig

---

### **Testing-Environment**
**Warum:** Änderungen sicher testen ohne Production zu riskieren
- Railway Preview Deployments (Branch-basiert)
- Oder Feature-Flags
**Status:** 💤 Aufsetzen wenn nächster großer Umbau ansteht

---

## 🧹 TODO: Dokumentation aufräumen
Zu viele separate .md Dateien. Zusammenführen/archivieren:
- PRODUCTION-ROADMAP-MAY-9.md
- LAUNCH-ROADMAP-MAY-9.md
- Alle *-FIX.md und *-COMPLETE.md Dateien

---

**Erstellt:** 10. Mai 2025  
**Letztes Update:** 14. Mai 2026
