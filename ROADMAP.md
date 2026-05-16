# ComicStyle.de - Roadmap

**Letzte Aktualisierung:** 16. Mai 2026

---

## 🔥 KRITISCHE PROBLEME (Sofort lösen)

### 1. **PDF Bubble-Position & Größe** ⚠️ HOCH
**Problem:** Sprechblasen im PDF haben andere Größe als in der Vorschau

**Status:** ⚠️ IN ARBEIT — Position verbessert, Größe noch nicht vollständig verifiziert
**Nächster Schritt:** Test mit `?debug=true` nach aktuellem Deploy

---

### 2. **Age-Mode: Geschlecht/Identität beibehalten** ✅ GEFIXT
**Problem:** Bei Kindheits-Szenen wurde das Referenzfoto übersprungen → gpt-image-2 erfand neue Charaktere (z.B. Mädchen statt Junge)

**Lösung (16. Mai 2026):**
- Age-Mode verwendet jetzt IMMER das User-Foto als Referenz (für Identität: Geschlecht, Gesichtsstruktur)
- Neuer dedizierter `refNote`-Block für `user-photo-age-*` mit expliziten Identitäts-Regeln
- Age-Modifier betont: "SAME gender, SAME face structure, SAME ethnicity"
- Stil-Enforcement im refNote: "REDRAW completely in ink+color style — reference is ONLY for identity"

### 3. **Cover zu photorealistisch** ✅ VERBESSERT
**Problem:** `images.edit()` mit Close-up-Foto übernimmt den fotografischen Look zu stark

**Lösung (16. Mai 2026):**
- Cover-Prompt massiv verstärkt: explizite "TRANSFORMATION INSTRUCTION" 
- Detaillierte Verbotsliste: keine Hauttextur, keine Foto-Beleuchtung, keine Tiefenunschärfe
- Positive Anweisungen: "simplify face into bold ink lines", "replace skin with flat color + ink outlines"
- `COMIC_STYLE`-Konstante erweitert: Haar als "solid color shapes", max 2-3 Farbwerte pro Fläche, keine weichen Gradienten
- **Limitation:** Bei extremen Close-ups bleibt ein gewisser Foto-Einfluss — das ist eine Eigenschaft von `images.edit()`. Für maximale Stilisierung: Foto mit mehr Abstand verwenden.

---

## 📋 WICHTIGE FEATURES (Bald)

### 2. **Mehr Seiten generieren** 📝 HOCH
**Problem:** 3 Momente = 3 Seiten — zu wenig für ein echtes Comic-Buch. Kunden zahlen nicht für 3 Seiten.

**Empfohlene Lösung: Hybrid-Ansatz**
- Jeden Moment automatisch in 2 Seiten aufteilen: Seite 1 = Aufbau/Ankunft, Seite 2 = Höhepunkt/Reaktion
- Automatische Intro-Seite (Charaktervorstellung) + Outro-Seite (Rückblick) = immer +2 Seiten ohne User-Input
- Ergebnis: 3 Momente → 8 Seiten, 5 Momente → 12 Seiten

**Aufwand:** Mittel (Backend GPT-Prompt + Frontend)
**Status:** ❌ OFFEN

---

### 3. **Seiten in der Vorschau ergänzen** 📝 MITTEL
**Problem:** User kann nach der Generierung keine neue Seite hinzufügen

**Lösung:** "Seite hinzufügen" Button in Step5Preview — öffnet Moment-Input, generiert neue Seite und fügt sie ein
**Aufwand:** ~1 Tag (Frontend + Backend)
**Status:** ❌ OFFEN

---

### 4. **Geschwindigkeit erhöhen** ⚡ HOCH
**Problem:** Generierung dauert sehr lange

**Maßnahmen (Priorität nach Impact):**
1. `quality: "standard"` statt `"high"` bei gpt-image-2 → halbiert Generierungszeit, Qualitätsunterschied bei Comic-Stil minimal
2. Verifizieren dass alle Seiten wirklich parallel generiert werden (nicht sequenziell)
3. Structure-Call cachen bei Neu-Illustrierung (Struktur muss nicht neu generiert werden)

**Aufwand:** Niedrig (1-2h für quality-Flag)
**Status:** ❌ OFFEN

---

### 5. **Dramaturgie verbessern (große Splash-Panels)** 🎨 MITTEL
**Problem:** Alle Panels gleich groß, keine visuelle Dramaturgie. Frühere Implementierung mit `size: splash` hat Probleme verursacht weil gpt-image-2 Panel-Größen-Anweisungen ignoriert.

**Lösung:** Splash-Panels als **separate Seite** generieren (1 Panel = ganze Seite), nicht als Teil einer Multi-Panel-Seite. Das ist zuverlässig weil gpt-image-2 dann einfach ein einzelnes Bild macht.
**Aufwand:** Mittel
**Status:** ❌ OFFEN — vorherige Implementierung war kaputt, neu angehen

---

## 💰 PREISMODELL

**Empfehlung:**

| Paket | Seiten | Preis | Zielgruppe |
|-------|--------|-------|------------|
| Mini | 5 | €39 | Testen, kleines Geschenk |
| Standard | 8 | €59 | Hauptprodukt ⭐ |
| Premium | 12 | €79 | Besondere Anlässe |

- Kein 3-Seiten-Starter — wirkt zu dünn, rechtfertigt Preis nicht
- PDF-Download als optionales Add-on für €9 (viele Kunden wollen digitale Nutzung)
- Hardcover-Upgrade: +€15 (später)
- Extra Kopien: -20% ab 2. Exemplar (später)

**Status:** ⏳ Entscheidung ausstehend

---

## ✅ ERLEDIGT

### PDF-Export
- ✅ Cover-Titel dynamische Schriftgröße + mittig zwischen goldenen Linien (lineGap 24pt)
- ✅ Seitenzahl außerhalb des Bildes (rechts unten)
- ✅ Bangers Comic-Font für Sprechblasen (Preview + PDF identisch)
- ✅ Extra-Bubbles (user-hinzugefügte) werden exportiert
- ✅ Hidden Bubbles werden gefiltert
- ✅ fit:contain — Panels werden nicht abgeschnitten
- ✅ Cover ohne schwarzen Balken (goldene Linien)
- ✅ Bubble-Fallback-Position: gleiches Grid wie Vorschau (nicht mehr gestapelt)
- ✅ Widmung: "dedication"-Feld entfernt, Schriftgröße passt sich Textlänge an, THE END fest am unteren Rand

### Sprechblasen (Frontend)
- ✅ Text-Bearbeitung per Doppelklick
- ✅ Größe speichern/laden (% von Referenz-Container 400×600px)
- ✅ Hidden Bubbles persistieren über Seitenwechsel
- ✅ Position per Drag&Drop
- ✅ Touch-Resize für Mobile (Handles 16×16px, immer sichtbar auf Touch-Geräten)
- ✅ Neue Bubbles: Mindestgröße beim Bearbeiten, Textarea wächst mit Text

### Backend / Bildgenerierung
- ✅ CORS fix
- ✅ Duplicate Characters Prompt
- ✅ Multi-Photo Composite Metadata Bug fix
- ✅ Multi-Photo Fallback wählt szenen-passendes Foto
- ✅ visual_anchor ohne Kleidung (nur Gesicht/Körper)
- ✅ getOutfit() mit pageTitle + deutschen Keywords
- ✅ Safety-Rewriter (4 Schichten: Sanitize → Classify → Style Guard → GPT-Rewrite)
- ✅ BD_STYLE_ANCHOR_STRONG in Tier-3 Graceful Fallback
- ✅ Face-Consistency Prompts verstärkt
- ✅ Supabase Timeout Fix (Foto als Base64 an OpenAI, kein URL-Fetch durch OpenAI)
- ✅ Safety-Block graceful degradation (kein harter Fehler mehr)
- ✅ Safety-Keywords bereinigt (crowd, wild, party nicht mehr geblockt)

### FLUX.1 Kontext (experimentell)
- ✅ `/api/comic-flux` Route gebaut (Production unberührt)
- ✅ Health-Check Endpoint `/api/comic-flux/health`
- ⚠️ Qualität nicht ausreichend für Production (Multi-Panel-Problem, Stil-Drift)
- 💤 Deaktiviert (`NEXT_PUBLIC_USE_FLUX=false`)

---

## ❌ BEKANNTE LIMITATIONEN (kein Fix möglich mit gpt-image-2)

### Kleidungs-Konsistenz
Charaktere tragen auf verschiedenen Seiten unterschiedliche Kleidung. gpt-image-2 gewichtet Referenzbild stärker als Text-Prompt. Prompt-Engineering löst das nicht zuverlässig.
**Lösung nur durch Modell-Wechsel** (FLUX.1 Kontext pro wenn Qualität besser wird)

### Nicht-Foto-Charaktere inkonsistent
Charaktere ohne Foto (Oma, Opa) sehen auf jeder Seite anders aus — kein visueller Anker.
**Lösung:** Referenzfoto für alle Charaktere anfordern (UX-Änderung)

### Dialog-Zuordnung zu Panels
Dialoge passen manchmal nicht zum Panel-Inhalt. Nur durch Panel-by-Panel Generierung lösbar (4x teurer, langsamer).
**Status:** Langfristig / nicht prioritär

---

## 💡 EVALUIEREN (Mittelfristig)

### FLUX.1 Kontext pro (BFL API)
Wenn die Qualität des pro-Modells besser ist als dev, könnte es Kleidungs- und Gesichts-Konsistenz lösen. ~$0.05/Bild (ähnlich wie gpt-image-2 standard).
**Ansatz:** Cover weiter mit gpt-image-2, Seiten mit FLUX pro testen

### Testing-Environment
Railway Preview Deployments (Branch-basiert) oder Feature-Flags für sichere Tests ohne Production-Risiko.

---

## 🧹 TODO: Dokumentation aufräumen
Zu viele separate .md Dateien im Root. Archivieren:
- Alle `*-FIX.md`, `*-COMPLETE.md`, `*-DEPLOYED.md` Dateien
- `QUALITY-IMPROVEMENTS-STATUS.md` (in diese Roadmap integriert)
- `DRUCK-UND-PREISMODELL.md` (in diese Roadmap integriert)

---

**Erstellt:** 10. Mai 2026
**Letztes Update:** 16. Mai 2026
