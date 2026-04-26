# Product Backlog - MyComicStory

## 🔴 Kritische Qualitätsprobleme

### 1. Charaktere - Kleidung & Kontext
**Problem:** Charaktere tragen immer die gleichen Klamotten, auch in unpassenden Situationen

**Beispiel aus Test:** 
- Papa im Meer mit Jeans statt Badehose
- Mama am Strand mit Jeans statt Strandkleidung
- Aber: Strand-Panels zeigen teilweise richtige Badekleidung (inkonsistent!)

**Lösung:**
- Prompt anpassen: "Characters wear context-appropriate clothing (swimwear at beach, casual at home, etc.)"
- Visual Anchor erweitern: "Typical clothing: [casual/formal], but adapts to scene context"
- Szenen-Beschreibung spezifischer: "Papa in swim shorts" statt nur "Papa at beach"

**Priorität:** Hoch
**Aufwand:** Mittel (Prompt-Anpassung + GPT-4o Szenen-Beschreibungen)

---

### 1b. Charakter-Accessoires inkonsistent
**Problem:** Oma Fatima mal mit, mal ohne Kopftuch

**Lösung:**
- Visual Anchor muss Accessoires explizit erwähnen: "always wears hijab" oder "never wears hijab"
- Prompt: "Keep character accessories consistent across all panels"

**Priorität:** Mittel
**Aufwand:** Gering

---

### 2. Doppelte Charaktere in einem Panel
**Problem:** Manchmal erscheint derselbe Charakter mehrfach im gleichen Panel

**Beispiel aus Test:** Seite 2, großes Panel unten - Opa + Luca erscheinen doppelt

**Lösung:**
- Prompt verstärken: "Each character appears ONLY ONCE per panel"
- GPT-4o Szenen-Beschreibungen prüfen lassen: "Verify no character appears twice"
- Post-Processing: Vision API prüft auf Duplikate

**Priorität:** Kritisch
**Aufwand:** Mittel

---

### 2b. Identische/sehr ähnliche Panels auf einer Seite
**Problem:** Zwei Panels zeigen fast die gleiche Szene (z.B. Flughafen Seite 1, Panel 3+4)

**Lösung:**
- GPT-4o Struktur-Prompt verstärken: "Each panel must show a DISTINCTLY DIFFERENT moment, not just a different angle of the same moment"
- Beispiel: Nicht 2× "Familie am Gate", sondern "Familie am Gate" + "Luca am Fenster schaut Flugzeug an"

**Priorität:** Hoch
**Aufwand:** Mittel (Prompt-Anpassung)

---

### 3. Qualitätsverlust über Seiten hinweg
**Problem:** Cover hat beste Qualität, jede Folgeseite wird schlechter

**Beobachtung aus Test:**
- Cover: Sehr gut
- Seite 1 (Flughafen): Gut, aber Hintergrund-Personen verschwommen
- Seite 2 (Ankunft): Opa sieht in jedem Panel anders aus
- Seite 3 (Strand): Qualität OK, aber Kleidung falsch
- Seite 4 (Grillen): Opa wieder anders

**Frage:** Wird Cover-Referenz korrekt an ALLE Seiten weitergegeben?

**Zu prüfen:**
- Ist `coverAsReference` korrekt implementiert?
- Wird Cover-Bild als Base64 oder URL weitergegeben?
- Funktioniert `images.edit()` mit Cover-URL?
- Wird bei jeder Seite die gleiche Referenz genutzt oder "driftet" es ab?

**Mögliche Lösungen:**
- Debug-Logging: Welche Referenz wird pro Seite genutzt?
- Character Reference Sheet NACH Cover generieren und für alle Seiten nutzen
- Jede Seite nutzt Cover + Character Sheet als Doppel-Referenz

**Priorität:** Kritisch
**Aufwand:** Hoch (Debugging + potentiell neue Architektur)

---

### 4. Sprechblasen ohne sichtbaren Speaker
**Problem:** Dialog wird einem Charakter zugeordnet, der im Panel nicht zu sehen ist

**Lösung:**
- GPT-4o Validierung: "Only assign dialog to characters visible in this panel"
- Frontend: Warnung wenn Speaker nicht in Panel-Beschreibung vorkommt
- Fallback: Dialog als "Narrator" oder "Off-screen"

**Priorität:** Mittel
**Aufwand:** Mittel

---

### 5. Kapitel-Titel verschwunden
**Problem:** Titel der Kapitel werden nicht mehr oben angezeigt

**Bestätigt im Test:** Keine Titel sichtbar ("Auf dem Weg zum Traumurlaub" etc. fehlen)

**Zu prüfen:**
- Wurde `page.title` aus PanelView entfernt?
- Ist es im Code noch vorhanden aber CSS versteckt?

**Lösung:**
- Titel wieder einblenden über Bild
- Design: Dezent, nicht störend
- Optional: User kann Titel ein/ausblenden

**Priorität:** Mittel
**Aufwand:** Gering

---

## 🟡 Features & Verbesserungen

### 6. Mehrere Bilder hochladen - aktueller Umgang?
**Frage:** Was passiert wenn User 3-4 Bilder hochlädt?

**Aktueller Stand:**
- Code unterstützt `referenceImages[]` Array
- Nur `referenceImages[0]` wird genutzt
- Weitere Bilder werden ignoriert

**Szenarien:**
1. **Mehrere Personen, ein Bild pro Person**
   - z.B. Bild 1: Papa, Bild 2: Mama, Bild 3: Oma
   - Wie ordnen wir zu: Welches Bild für welchen Charakter?

2. **Eine Person, mehrere Bilder**
   - z.B. 3 Fotos von Opa aus verschiedenen Winkeln
   - Sollen alle kombiniert werden für bessere Konsistenz?

3. **Situationsbilder**
   - z.B. Bild 1: Familie am Strand, Bild 2: Haus der Großeltern
   - Sollen Locations als Referenz genutzt werden?

4. **Personen sehen unterschiedlich aus**
   - z.B. Oma mit/ohne Brille, Papa mit/ohne Bart
   - Welches Bild ist "richtig"?

**Mögliche Lösungen:**

**A) Nur 1 Bild erlauben** (einfachste Lösung)
- UI: "Bitte lade EIN Gruppenfoto hoch"
- Vorteil: Keine Komplexität
- Nachteil: Weniger flexibel

**B) Mehrere Bilder → Character-spezifisch zuordnen**
- UI: User ordnet zu: "Bild 1 = Papa, Bild 2 = Mama"
- Dann: Jeder Charakter bekommt sein eigenes Referenzbild
- Vorteil: Beste Konsistenz pro Charakter
- Nachteil: Komplexe UI, aufwendig

**C) Mehrere Bilder → Collage als Referenz**
- Alle Bilder in ein Grid packen
- Als eine Referenz an gpt-image-1.5 übergeben
- Vorteil: Einfach
- Nachteil: Unklar ob es funktioniert

**D) User wählt: "Welches Bild für welchen Charakter?"**
- Nach Upload: "Wir haben 3 Charaktere erkannt: Papa, Mama, Luca"
- User klickt auf Gesichter im Bild: "Das ist Papa, das ist Mama..."
- Dann: Crop + separate Referenzen
- Vorteil: Präzise
- Nachteil: Sehr aufwendig (Face Detection, Cropping, UI)

**E) Intelligente Auto-Zuordnung**
- GPT-4o Vision analysiert alle Bilder
- Ordnet automatisch zu: "Bild 1 enthält Papa + Mama, Bild 2 enthält Opa"
- Erstellt Character-spezifische Crops
- Vorteil: Automatisch, keine User-Interaktion
- Nachteil: Kann falsch zuordnen

**F) Mehrere Bilder → Character Reference Sheet**
- Alle Bilder analysieren
- Daraus ein Character Reference Sheet generieren
- Dieses als Referenz für alle Seiten
- Vorteil: Kombiniert alle Infos
- Nachteil: Extra Generierungs-Schritt

**Empfehlung:**
1. **Kurzfristig:** Lösung A (nur 1 Bild) - einfach, funktioniert
2. **Mittelfristig:** Lösung E (Auto-Zuordnung) - beste UX
3. **Langfristig:** Lösung D (manuelle Zuordnung) als Fallback wenn Auto-Zuordnung unsicher ist

**Priorität:** Mittel
**Aufwand:** Variiert stark (A=Gering, E=Hoch, D=Sehr hoch)

---

## 🔵 Strategische Fragen

### 7. Alternative Geschäftsmodelle / Technologien
**Frage:** Gibt es andere Lösungen außer OpenAI gpt-image-1.5?

**Alternativen zu prüfen:**

#### A) **Midjourney** (beste Qualität, aber kompliziert)
- ✅ Beste Bildqualität
- ✅ Konsistente Charaktere via `--cref`
- ❌ Keine offizielle API
- ❌ Discord-basiert (umständlich)
- ❌ Teurer
- **Aufwand:** Sehr hoch (Discord Bot Integration)

#### B) **Stable Diffusion + LoRA Training**
- ✅ Perfekte Charakter-Konsistenz
- ✅ Volle Kontrolle
- ❌ Braucht Training pro Kunde (Zeit + Kosten)
- ❌ Eigene Infrastruktur nötig
- **Aufwand:** Sehr hoch

#### C) **Flux.1 Pro** (via Replicate/Together AI)
- ✅ Gute Qualität
- ✅ Schneller als DALL-E
- ⚠️ Charakter-Konsistenz unklar
- **Aufwand:** Mittel (API-Wechsel)

#### D) **DALL-E 3** (statt gpt-image-1.5)
- ✅ Bessere Qualität als 1.5
- ❌ Teurer
- ❌ Keine `images.edit()` → keine Referenzbilder
- **Aufwand:** Gering (nur Model-Wechsel)

#### E) **Hybrid-Ansatz**
- Cover: Midjourney (beste Qualität)
- Comic-Seiten: gpt-image-1.5 mit Cover als Referenz
- **Aufwand:** Hoch

#### F) **Geschäftsmodell-Alternativen**
- **Print-on-Demand Partner:** Printful, Blurb, Lulu
  - ✅ Kein Lager, kein Versand
  - ❌ Höhere Stückkosten
  
- **Subscription statt Einzelkauf:**
  - "3 Comics pro Monat für 29€"
  - Planbarere Einnahmen
  
- **B2B:** Firmen-Comics für Events, Jubiläen
  - Höhere Margen
  - Weniger Volumen

**Empfehlung:** 
1. Kurzfristig: Bei gpt-image-1.5 bleiben, Qualität optimieren
2. Mittelfristig: Flux.1 Pro testen
3. Langfristig: Midjourney für Premium-Tier

**Priorität:** Niedrig (erst Qualität mit aktuellem System optimieren)
**Aufwand:** Variiert stark

---

## 📊 Priorisierung

**Sofort (diese Woche):**
1. ✅ Qualitätsverlust über Seiten (Cover-Referenz prüfen)
2. ✅ Doppelte Charaktere vermeiden
3. ✅ Kleidung kontextabhängig

**Nächste Woche:**
4. Sprechblasen-Validierung
5. Mehrere Bilder - Strategie festlegen
6. Kapitel-Titel wieder einblenden

**Später:**
7. Alternative Technologien evaluieren
8. Geschäftsmodell-Varianten testen

---

**Letzte Aktualisierung:** 26. April 2026
