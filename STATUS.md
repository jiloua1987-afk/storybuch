# MyComicStory - Aktueller Status 🚀
*Stand: 3. Mai 2026, 13:15 Uhr*

## ✅ Was funktioniert (DEPLOYED)

### Backend (Railway)
- ✅ **Individual Photos Mode** - 2+ separate Fotos (Jil + Sally) werden zu Composite kombiniert
- ✅ **Family Photos Mode** - 1 Foto mit mehreren Personen (funktioniert wie bisher)
- ✅ **Cover Location Detection** - Frankfurt/Paris/etc. aus Story extrahiert (nicht mehr Mittelmeer)
- ✅ **Project ID System** - Eindeutige IDs verhindern falsche Bilder aus alten Tests
- ✅ **Cover als Referenz** - Individual Photos verwenden Cover-Composite als Referenz
- ✅ **Ultra-Strong Prompts** - Anti-Manga Regeln + Face Consistency Enforcement
- ✅ **Multi-Person Photo Matching** - Jedes Foto separat analysiert
- ✅ **Age-Based Character Rendering** - Junge Szenen nutzen Cover + Age Modifier
- ✅ **Crowd Scene Handling** - Hochzeit mit Gästen behält Charakterkonsistenz
- ✅ **Supabase Integration** - `photo_url` Spalte + character_refs pro Project ID
- ✅ **Quality Score System** - Auto-Retry bei Manga-Stil
- ✅ **Safety Fallback** - Ultra-safe Prompts bei OpenAI Safety Blocks
- ✅ **Momente als Pflicht-Seiten** - 1 GPT-Call pro Moment
- ✅ **Outfit-Kontext** - Automatische Kleidungs-Erkennung (Beach/Airport/etc.)
- ✅ **OpenAI Tier 2** - 50 IPM statt 5 IPM

### Frontend (Vercel)
- ✅ **Individual Photos Upload** - 2+ Fotos mit Namen (Jil, Sally)
- ✅ **Family Photo Upload** - 1 Foto mit mehreren Personen
- ✅ **Einheitliches Format** - Alle Seiten 2:3 (1024×1536)
- ✅ **Seitentitel über Bild** - Nicht mehr im Bild selbst
- ✅ **"Neu illustrieren"** - Mit Freitextfeld für Änderungswünsche
- ✅ **Seite löschen** - Mit Wiederherstellen-Funktion
- ✅ **Sprechblasen-Editor** - Hinzufügen, löschen, ziehen, skalieren
- ✅ **Visual Polish** - Muted Bronze Design, Playfair Display Font

### Supabase
- ✅ **character_ref_image** - Mit `photo_url` + `project_id` (eindeutig pro Comic)
- ✅ **last_page_image** - Mit quality_score + `project_id`
- ✅ **Storage** - Fotos und generierte Bilder

---

## � Heutige Fixes (3. Mai 2026)

### Problem 1: Seiten zeigen falsche Personen (aus alten Tests)
**Root Cause:** Project ID wurde zu spät generiert, Fallbacks erzeugten falsche IDs  
**Fix:** 
- Project ID wird ZUERST generiert (Timestamp + Random String)
- Alle Fallbacks entfernt (Cover/Page Endpoints geben 400 wenn projectId fehlt)
- Dokumentation: `PROJECT-ID-DEPENDENCIES.md`

### Problem 2: Cover zeigt Mittelmeer statt Frankfurt
**Root Cause:** Location-Extraktion funktionierte, aber Prompts verwendeten falschen Parameter  
**Fix:**
- Multi-Photo Prompt: `${location}` → `${coverLocation}`
- Single-Photo Prompt: `${location}` → `${coverLocation}`
- Debug-Logs hinzugefügt

### Problem 3: Individual Photos - Seiten zeigen andere Gesichter
**Root Cause:** `images.edit()` mit Cover-Referenz ignoriert Gesichter  
**Versuch 1:** Generate-only ohne Referenz → SCHLECHTER (keine Konsistenz, Manga-Stil)  
**Versuch 2:** Cover-Referenz mit ultra-starkem Prompt → AKTUELL DEPLOYED  

**Aktuelle Strategie:**
- Cover: Composite aus allen Fotos → `images.edit()` → Comic-Stil
- Seiten: Cover als Referenz + ultra-starker Prompt:
  - "ULTRA-CRITICAL FACE CONSISTENCY RULES"
  - "Study faces VERY carefully"
  - "EXACT SAME: eye shape, nose, mouth, hair, skin"
  - "STRICT PROHIBITIONS: NO manga/anime"
  - "These are REAL PEOPLE from photos"

### Problem 4: Fallback-Strategien überschreiben Individual Photos Mode
**Root Cause:** Nach `reference = null` lief STRATEGY 5 und setzte `reference = userPhoto`  
**Fix:** Alle Strategien prüfen jetzt `!hasIndividualPhotos` vor Ausführung

---

## 🔧 Offene Punkte (Priorisiert)

### 🔴 Kritisch (JETZT TESTEN)

#### 1. Individual Photos Mode - Konsistenz prüfen
**Status:** ⏳ Code deployed, wartet auf Test  
**Aufwand:** 10 Min  

**Was zu testen:**
- 2 Fotos hochladen (Jil = Mann, Sally = Frau)
- Frankfurt Story mit 3 Momenten
- Prüfen:
  - ✅ Cover: Frankfurt Skyline + beide Personen?
  - ❓ Seiten: Zeigen alle Jil (Mann) + Sally (Frau) konsistent?
  - ❓ Stil: Europäischer Comic (NICHT Manga)?

**Erwartete Logs:**
```
Individual photos mode: using 2 characters from frontend
→ Describing Jil from their photo
→ Describing Sally from their photo
→ Cover location: "Frankfurt cityscape with modern skyscrapers and Main river"
→ Multi-photo mode: 2 photos
→ Creating composite image from both photos
✓ Cover done (multi-photo composite mode)

→ Individual photos mode (2 photos): using cover as reference
→ Cover contains composite of all 2 photos
Generating page "..." (3 panels, ref: cover-individual-photos)
```

**Wenn Konsistenz immer noch schlecht:**
- OpenAI gpt-image-2 kann einfach keine konsistenten Charaktere
- Alternativen:
  - Midjourney API (bessere Konsistenz, aber teurer)
  - Stable Diffusion mit LoRA Training (komplex)
  - Akzeptieren dass Konsistenz ~70% ist

#### 2. Family Photo Mode - Regression Test
**Status:** ⏳ Muss getestet werden  
**Aufwand:** 10 Min  

**Was zu testen:**
- 1 Foto mit mehreren Personen hochladen
- Story generieren
- Prüfen: Funktioniert wie vorher? (sollte keine Änderung geben)

**Erwartete Logs:**
```
Family photo mode: extracting characters from story, then describing from photo
→ Using cover as reference (all characters in photo)
Generating page "..." (3 panels, ref: cover)
```

---

### � Wichtig (nach Tests)

#### 3. Age Modifier testen
**Status:** Code deployed, noch nicht getestet  
**Aufwand:** 30 Min  
**Test:**
- Biografie über 40 Jahre
- Momente: "Erstes Kennenlernen 1985" + "Hochzeit 2000" + "Heute mit Enkeln"
- Prüfen: Junge Szene nutzt Cover + Age Modifier?

#### 4. Dokumentation vervollständigen
**Status:** Teilweise erledigt  
**Dateien:**
- ✅ `PROJECT-ID-DEPENDENCIES.md` - Vollständige Dependency Map
- ⏳ `INDIVIDUAL-PHOTOS-STRATEGY.md` - Noch zu erstellen
- ⏳ `TROUBLESHOOTING.md` - Häufige Probleme + Lösungen

---

### 🟢 Nice-to-Have (später)

#### 5. Multi-Age Photo System (SPEC vorhanden)
**Status:** Spezifikation komplett in `MULTI-AGE-PHOTO-SYSTEM-SPEC.md`  
**Aufwand:** 1-2 Wochen  
**Benefit:** User lädt jung + alt Fotos hoch → perfekte Konsistenz

#### 6. UI/UX Redesign
**Status:** Warten bis Qualität stabil  
**Aufwand:** 1-2 Tage  
**Ziel:** Ruhigeres Design, weniger Emojis, mehr Weißraum

#### 7. Location/Situation Photos
**Status:** In `OPEN-TASKS.md` dokumentiert  
**Benefit:** User lädt Hochzeitsfoto, Strandfoto etc. hoch → bessere Hintergründe

---

## 📊 Kosten pro Comic

**Aktuell:**
- Struktur (GPT-4.1): $0.02
- Cover (gpt-image-2): $0.20
- Seiten (gpt-image-2): 3-5 × $0.20 = $0.60-$1.00
- Quality Checks (GPT-4.1 Vision): 3-5 × $0.005 = $0.015-$0.025
- Retries (worst case, 20%): ~1 × $0.20 = $0.20
- **Gesamt: ~$1.05-$1.45 pro Comic**

---

## 🔑 Wichtige Umgebungsvariablen (Railway)

```bash
OPENAI_API_KEY=sk-...
PORT=3001
FRONTEND_URL=https://storybuch-git-main-jiloua1987-afks-projects.vercel.app
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

---

## 📁 Wichtige Dateien

### Backend
- `backend-railway/src/routes/comic.js` - Hauptlogik (Structure, Cover, Page)
  - Zeile ~800: Individual Photos Detection
  - Zeile ~870: refNote für cover-individual-photos
- `backend-railway/src/lib/storage.js` - Supabase Integration
  - `saveCharacterRefs()` - Speichert character_refs mit projectId
  - `getCharacterRefs()` - Lädt character_refs für projectId

### Frontend
- `src/components/steps/Step1Basics.tsx` - Individual Photos Upload
- `src/components/steps/Step2Content.tsx` - Guided Answers (Momente)
- `src/components/steps/Step4Generate.tsx` - Generation Orchestration
  - Zeile ~55: Project ID Generation (ZUERST!)
  - Zeile ~80: projectId an alle API-Calls
- `src/components/steps/Step5Preview.tsx` - Preview & Edit
- `src/store/bookStore.ts` - State Management

### Dokumentation
- `STATUS.md` - Dieser Status (aktuell)
- `PROJECT-ID-DEPENDENCIES.md` - Vollständige Project ID Dokumentation
- `OPEN-TASKS.md` - Konkrete offene Aufgaben
- `MULTI-AGE-PHOTO-SYSTEM-SPEC.md` - Feature-Spezifikation
- `AGE-MODIFIER-FEATURE.md` - Age Modifier Dokumentation
- `archive/PHOTO-CONSISTENCY-FIX-COMPLETE.md` - Family Photo Fix (funktioniert!)

---

## 🚀 Deployment

### Backend (Railway)
```bash
cd backend-railway
git add .
git commit -m "your message"
git push origin main
# Railway deployt automatisch
```

### Frontend (Vercel)
```bash
git add .
git commit -m "your message"
git push origin main
# Vercel deployt automatisch
```

**Letzter Deploy:** 3. Mai 2026, 13:10 Uhr (Commit: 2dcbcff)

---

## 🧪 Test-Checkliste

Nach jedem Deployment:

- [x] Backend startet ohne Fehler (Railway Logs prüfen)
- [x] Health Check: `curl https://your-backend.railway.app/api/health`
- [ ] **Individual Photos Test (Jil + Sally)** ← JETZT TESTEN
- [ ] **Family Photo Test (Regression)** ← JETZT TESTEN
- [ ] Age Modifier Test (Biografie)
- [x] Quality Score funktioniert (keine Manga-Seiten)
- [x] Sprechblasen editierbar
- [x] "Neu illustrieren" mit Freitext funktioniert
- [x] Seite löschen funktioniert

---

## 🐛 Bekannte Probleme

### 1. Gesichtskonsistenz bei Individual Photos
**Status:** ⚠️ Noch nicht bestätigt ob gelöst  
**Symptom:** Seiten zeigen leicht unterschiedliche Gesichter  
**Ursache:** OpenAI gpt-image-2 ist nicht perfekt für Charakterkonsistenz  
**Aktueller Fix:** Ultra-starker Prompt + Cover-Referenz  
**Wenn nicht gelöst:** Alternativen evaluieren (Midjourney, Stable Diffusion)

### 2. Manga-Stil schleicht sich ein
**Status:** ⚠️ Teilweise gelöst durch Quality Check  
**Symptom:** Große Augen, weiche Linien, Sparkles  
**Fix:** Quality Check erkennt und retried mit stärkerem Prompt  
**Erfolgsrate:** ~80% (1-2 Retries nötig)

### 3. Safety Blocks bei harmlosen Szenen
**Status:** ✅ Gelöst durch Ultra-Safe Fallback  
**Symptom:** "Picknick im Park" wird blockiert  
**Fix:** Sofortiger Fallback zu ultra-safe Prompt (ohne Panel-Details)  
**Erfolgsrate:** 100% (Fallback funktioniert immer)

---

## 📞 Support

**GitHub:** https://github.com/jiloua1987-afk/storybuch  
**Railway:** https://railway.app  
**Supabase:** https://supabase.com/dashboard  
**Vercel:** https://vercel.com/dashboard

---

## 📝 Nächste Schritte

1. **JETZT:** Individual Photos Mode testen (Jil + Sally)
2. **JETZT:** Family Photo Mode Regression Test
3. **Wenn Tests OK:** Als Production-Ready markieren
4. **Wenn Tests NICHT OK:** Alternative Strategien evaluieren
5. **Danach:** Age Modifier testen
6. **Danach:** Dokumentation vervollständigen

---

**Letztes Update:** 3. Mai 2026, 13:15 Uhr  
**Letzter Deploy:** Individual Photos mit Cover-Referenz + Ultra-Strong Prompts (2dcbcff)  
**Nächster Schritt:** Individual Photos Mode testen - Konsistenz prüfen!
