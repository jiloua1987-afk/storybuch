# Offene Aufgaben - MyComicStory
*Stand: 2. Mai 2026*

## 🔴 Kritisch (sofort)

### 1. ⚠️ Multi-Photo System debuggen & fixen
**Aufwand:** 1-2 Stunden  
**Status:** Debug-Logging deployed, Test ausstehend  
**Dateien:** `backend-railway/src/routes/comic.js`, `MULTI-PHOTO-DEBUG-PLAN.md`

**Problem:**
- Fotos werden nicht verwendet → jede Seite erfindet neue Gesichter
- Character-Name-Matching schlägt fehl
- Logs: `"Jil: generated from story (no photo provided)"`

**Bereits implementiert:**
- ✅ Fuzzy Matching (partial match)
- ✅ Debug Logging (zeigt Labels vs. GPT-Namen)
- ✅ Composite Image für Multi-Photo Cover

**Nächster Schritt:**
1. Test durchführen wenn Railway Deployment fertig
2. Logs prüfen: `DEBUG: referenceImageUrls` und `DEBUG: characters from GPT`
3. Wenn Matching fehlschlägt → Plan B: Namen aus Labels erzwingen

**Details:** Siehe `MULTI-PHOTO-DEBUG-PLAN.md`

---

### 2. Multi-Person Photo System testen ⚡
**Aufwand:** 30 Minuten  
**Status:** ✅ Code deployed, nur noch testen  
**Dateien:** Keine Änderungen nötig  

**Was gelöst wurde:**
- Problem: 2 Fotos hochgeladen (Sally + Jil), nur 1 verwendet
- Lösung: Separate Analyse pro Foto, beide `photo_url` gespeichert
- Deployed: 2. Mai 2026

**Test-Szenario:**
1. Sally-Foto hochladen (Label: "Sally")
2. Jil-Foto hochladen (Label: "Jil")
3. Liebesgeschichte erstellen mit Momenten:
   - "Das erste Treffen"
   - "Unser Hochzeitstag mit vielen Gästen"
   - "Ein Tag am Main"
4. Comic generieren

**Erfolgs-Kriterien:**
- ✅ Railway Logs zeigen: "Multi-photo mode: analyzing each photo individually"
- ✅ Sally sieht aus wie im Foto (alle Seiten)
- ✅ Jil sieht aus wie im Foto (alle Seiten)
- ✅ Hochzeitsszene: Sally & Jil konsistent, Gäste im Hintergrund
- ✅ Keine "Detected in photo: (leer)" Fehler

**Wenn Test erfolgreich:** Task als erledigt markieren ✅

---

### 2. Age Modifier testen ⚡
**Aufwand:** 30 Minuten  
**Status:** ✅ Code deployed (2. Mai 2026, 20:30 Uhr)  
**Dateien:** Keine Änderungen nötig, nur testen  

**Was implementiert wurde:**
- Problem: Junge Szenen ohne Referenzfoto → System erfindet neue Gesichter
- Lösung: Cover + Age Modifier → behält Gesichtszüge, macht nur jünger
- Neue refSource: "cover-age-young", "cover-age-middle", "cover-age-current"
- Deployed: 2. Mai 2026, 20:30 Uhr

**Test-Szenario:**
1. Foto hochladen (60-jähriger Mann)
2. Biografie erstellen mit Momenten:
   - "Das erste Kennenlernen" (jung)
   - "Unsere Hochzeit" (mittel)
   - "Heute mit den Enkeln" (aktuell)
3. Comic generieren

**Erfolgs-Kriterien:**
- ✅ "Erstes Kennenlernen": Age context: young, Cover + Age Modifier verwendet
- ✅ "Hochzeit": Age context: middle, Cover + Age Modifier verwendet
- ✅ "Heute": Age context: current, Cover als Referenz verwendet
- ✅ Junge Charaktere sehen aus wie ältere Version (gleiche Gesichtszüge, nur jünger)

**Erwartete Logs:**
```
Generating page "Das erste Kennenlernen"
  → Age context: young (useReference: false)
  → Historical scene (young), using cover with age modifier
  → This keeps facial features consistent while making characters younger
```

---

## 🟡 Wichtig (morgen - nach Wizard-Umbau)

### 4. Wizard-Umstrukturierung 🎨
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

**Wichtig:**
- **Familienbild-Modus MUSS weiterhin funktionieren** (hat super geklappt!)
- Viel einfacher: nur 2 Content-Steps statt 3-4
- Backend fast unverändert (nur Mapping anpassen)

**Nach Implementierung:** Multi-Photo System testen

---

### 5. ✅ Supabase Unique Constraint hinzugefügen
**Status:** ✅ ERLEDIGT  
**Aufwand:** 5 Minuten  

~~**Problem:** `saveCharacterRefs` schlägt fehl weil Unique Constraint fehlt~~

**Fix wurde ausgeführt:**
```sql
ALTER TABLE character_ref_image
ADD CONSTRAINT character_ref_image_project_character_unique
UNIQUE (project_id, character_name);
```

---

## 🟡 Wichtig (nach Tests)

### 4. ✅ Luca-Größenanker implementieren
**Status:** ✅ ERLEDIGT  
**Aufwand:** 30 Minuten  

~~**Problem:** 3-jähriger Luca wirkt manchmal zu groß~~

**Fix wurde implementiert:** Explizite Höhenangaben in Character-Extraktion-Prompt

---

### 5. ✅ Outfit-State in Supabase
**Status:** ✅ ERLEDIGT  
**Aufwand:** 2-3 Tage  

~~**Problem:** Charaktere tragen manchmal gleiche Kleidung in verschiedenen Kontexten~~

**Implementiert:** Outfit-Kontext-Erkennung mit `getOutfit()` Funktion

---

## 🟢 Nice-to-Have (später)

### 6. ✅ PDF-Export für Testdrucke 📄
**Status:** ✅ IMPLEMENTIERT (3. Mai 2026, 21:30 Uhr)  
**Aufwand:** ~5 Stunden (erledigt)  
**Dateien:** `PDF-EXPORT-USAGE.md`, `backend-railway/src/lib/pdf-generator.js`

**Was implementiert wurde:**
- Button "📄 Als PDF exportieren (Testdruck)" - NUR für dich sichtbar (`?debug=true`)
- Exportiert: Cover + alle Seiten + Ending
- Format: A4 mit Titel oben + Seitenzahl unten
- Download als einzelne PDF-Datei

**Verwendung:**
1. `cd backend-railway && npm install` (PDFKit installieren)
2. Backend neu starten
3. App mit `?debug=true` öffnen
4. Comic erstellen
5. In Step5Preview: Gelbe Debug-Box mit PDF-Button
6. PDF herunterladen und bei Flyeralarm/Cewe Testdruck bestellen

**Nächster Schritt:**
- Testdruck bestellen (€10-15)
- Qualität prüfen
- Entscheiden: AI Upscaling nötig oder nicht?

**Details:** Siehe `PDF-EXPORT-USAGE.md`

---

### 7. Orts-/Situationsfotos hinzufügen 📸
**Aufwand:** 2-3 Stunden  
**Status:** Konzept erstellt, noch nicht implementiert  
**Priorität:** Niedrig (nach Wizard-Umbau & Tests)

**Konzept:**
- User kann Fotos von besonderen Orten hochladen (z. B. Strand, Restaurant, Hochzeitslocation)
- Orts-Fotos werden als Hintergrund/Setting-Referenz für spezifische Seiten verwendet
- Personen-Fotos bleiben für Charaktere (Cover → Konsistenz)

**Empfohlene Implementierung:**
- **Option 1:** Separate Sektion in Step 1 (nach Personen-Fotos)
  - "4. Orts-Fotos (optional)"
  - Upload mit Label (z. B. "Strand am Main", "Restaurant")
  - Max. 3-5 Fotos
- **Option 2:** Pro Moment in Step 2
  - Jeder Moment kann optional ein Orts-Foto haben
  - Spezifischer, aber komplexer

**Backend-Verwendung:**
- Cover Generation: Orts-Fotos NICHT verwendet (nur Personen)
- Page Generation: GPT matched `page.location` mit `locationImages[].label`
- Wenn Match → Orts-Foto als zusätzliche Referenz für Hintergrund
- Charaktere bleiben vom Cover (Konsistenz!)

**Offene Fragen:**
- Welche Option? (Step 1 vs. Step 2)
- Wie viele Fotos? (Unbegrenzt vs. Max. 3-5)
- Label-System? (Freitext vs. Dropdown)
- Verwendung? (Nur Hintergrund vs. auch Objekte)

**Dateien:**
- `src/components/steps/Step1Basics.tsx` (Option 1)
- `src/components/steps/Step2Content.tsx` (Option 2)
- `src/store/bookStore.ts` (locationImages Array)
- `backend-railway/src/routes/comic.js` (Location matching)

---

### 8. ✅ OpenAI Tier 2 upgraden
**Status:** ✅ ERLEDIGT  
**Aufwand:** 5 Minuten  

**Benefit:**
- 5 IPM → 50 IPM
- 12 Minuten → 2-3 Minuten Generierungszeit
- Style-Master-Panel wird möglich

---

### 9. ✅ "Neu illustrieren" mit Freitextfeld
**Status:** ✅ ERLEDIGT  
**Aufwand:** 3-4 Stunden  

**Implementiert:** Textarea unter jeder Seite für konkrete Änderungswünsche

---

### 10. Multi-Age Photo System implementieren 📸
**Aufwand:** 1-2 Wochen  
**Spezifikation:** `MULTI-AGE-PHOTO-SYSTEM-SPEC.md`  
**Status:** Nur Spezifikation, noch nicht implementiert

**WICHTIG:** Das ist NICHT das Multi-Person System (das ist fertig)!

**Unterschied:**
- **Multi-Person** (✅ fertig): 2 Personen, je 1 Foto → Sally-Foto + Jil-Foto
- **Multi-Age** (📋 spec): 1 Person, mehrere Fotos → Sally-jung + Sally-alt

**Konzept:**
- User lädt mehrere Fotos PRO Charakter hoch (jung + alt)
- System wählt automatisch passendes Foto für jede Szene
- Perfekte Konsistenz über alle Altersgruppen

**Phasen:**
1. Backend Support (1 Woche)
2. Frontend UI (1 Woche)
3. Testing & Refinement
4. Documentation & Launch

---

### 11. UI/UX Redesign 🎨
**Aufwand:** 1-2 Tage  
**Dateien:** `Step1-6.tsx`, `page.tsx`, `ueber-uns/page.tsx`  

**Ziel:**
- Ruhigeres Design
- Weniger Emojis
- Mehr Weißraum
- Große weiße Boxen mit Nummern-Kreisen
- Warme Farbpalette beibehalten

**Wichtig:** Keine Funktionalitäten entfernen!

---

### 12. Lulu-Integration + Druckspezifikation 🖨️
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

**Lulu-Anforderungen:**
- PDF/X-1a Format
- 200+ DPI (mit Upscaling erreichbar)
- CMYK Farbprofil
- Seitenanzahl durch 4 teilbar

**Implementierung:**
1. Testdruck bestellen (ohne Upscaling) → Qualität prüfen
2. Falls nötig: Replicate API für Upscaling integrieren
3. PDF-Export mit CMYK
4. Lulu API Integration
5. Payment-Integration (Stripe)

**Details:** Siehe `A4-FORMAT-UND-LULU-ANALYSE.md`

---

## 📋 Backlog (nicht priorisiert)

Diese Features sind dokumentiert aber noch nicht geplant:

- ~~**Consistency Validation**~~ ✅ ERLEDIGT - Quality Score System implementiert
- ~~**Reference Stack**~~ ✅ ERLEDIGT - Cover als Referenz für alle Seiten
- **Face Embeddings** - Mathematische Gesichts-Konsistenz
- **SDXL + ControlNet** - Alternative zu OpenAI
- **Image Worker** - Asynchrone Job-Queue

---

## ✅ Kürzlich erledigt

- ✅ Multi-Person Photo Matching System
- ✅ Age-Based Character Rendering
- ✅ Syntax-Fehler behoben (Backend startet)
- ✅ Crowd Scene Handling
- ✅ Quality Score + Auto-Retry (Consistency Validation)
- ✅ "Neu illustrieren" mit Freitextfeld
- ✅ Seite löschen Feature
- ✅ Visual Polish (Bronze Design)
- ✅ Anti-Manga Prompts verstärkt
- ✅ Opa/Oma Fix (erscheinen nicht in falschen Szenen)
- ✅ Supabase Unique Constraint
- ✅ Luca-Größenanker (Kinder-Höhenangaben)
- ✅ Outfit-State (getOutfit Funktion)
- ✅ OpenAI Tier 2 Upgrade
- ✅ Reference Stack (Cover als Referenz)
- ✅ PDF-Export für Testdrucke (Debug-Modus)

---

**Nächster Schritt:** Multi-Photo System testen (Task #1)  
**Danach:** Age Modifier testen (Task #2)  
**Dann:** Supabase Constraint hinzufügen (Task #3)
