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

### 6. ✅ OpenAI Tier 2 upgraden
**Status:** ✅ ERLEDIGT  
**Aufwand:** 5 Minuten  

**Benefit:**
- 5 IPM → 50 IPM
- 12 Minuten → 2-3 Minuten Generierungszeit
- Style-Master-Panel wird möglich

---

### 7. ✅ "Neu illustrieren" mit Freitextfeld
**Status:** ✅ ERLEDIGT  
**Aufwand:** 3-4 Stunden  

**Implementiert:** Textarea unter jeder Seite für konkrete Änderungswünsche

---

### 8. Multi-Age Photo System implementieren 📸
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

### 9. UI/UX Redesign 🎨
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

### 10. PDF-Export + Druckspezifikation 📄
**Aufwand:** 1 Tag  
**Status:** Warten auf Format-Entscheidung  

**Optionen:**
- A4 Querformat (21×29.7cm)
- Quadratisch (20×20cm)
- US Letter (8.5×11")

**Features:**
- Hochauflösende Bilder (300 DPI)
- Sprechblasen als Vektoren
- Druckmarken und Beschnitt

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

---

**Nächster Schritt:** Multi-Photo System testen (Task #1)  
**Danach:** Age Modifier testen (Task #2)  
**Dann:** Supabase Constraint hinzufügen (Task #3)
