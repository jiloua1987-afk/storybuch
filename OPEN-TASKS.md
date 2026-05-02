# Offene Aufgaben - MyComicStory
*Stand: 2. Mai 2026*

## 🔴 Kritisch (sofort)

### 1. Multi-Person Photo System testen ⚡
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
**Dateien:** Keine Änderungen nötig, nur testen  

**Test-Szenario:**
1. Foto hochladen (60-jähriger Mann)
2. Biografie erstellen mit Momenten:
   - "Das erste Kennenlernen" (jung)
   - "Unsere Hochzeit" (mittel)
   - "Heute mit den Enkeln" (aktuell)
3. Comic generieren

**Erfolgs-Kriterien:**
- ✅ "Erstes Kennenlernen": Age context: young, kein Referenzfoto
- ✅ "Hochzeit": Age context: middle, kein Referenzfoto
- ✅ "Heute": Age context: current, mit Referenzfoto
- ✅ Charaktere sehen in verschiedenen Altern aus

---

### 3. Supabase Unique Constraint hinzufügen 🔧
**Aufwand:** 5 Minuten  
**Datei:** Supabase SQL Editor  

**Problem:** `saveCharacterRefs` schlägt fehl weil Unique Constraint fehlt

**Fix:**
```sql
ALTER TABLE character_ref_image
ADD CONSTRAINT character_ref_image_project_character_unique
UNIQUE (project_id, character_name);
```

**Verifizierung:**
```sql
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'character_ref_image' 
AND constraint_type = 'UNIQUE';
```

---

## 🟡 Wichtig (nach Tests)

### 4. Luca-Größenanker implementieren 👶
**Aufwand:** 30 Minuten  
**Datei:** `backend-railway/src/routes/comic.js`  

**Problem:** 3-jähriger Luca wirkt manchmal zu groß

**Fix:** Im Character-Extraktion-Prompt ergänzen:
```javascript
// Zeile ~150, im charPromise System-Prompt:
content: `Extract ALL characters from the story...

CRITICAL — HEIGHT AND SIZE FOR CHILDREN:
- Children under 5: "toddler, approximately 85-95cm tall" — always visibly much smaller than older children and adults
- Children 5-8: "young child, approximately 110-120cm tall" — clearly shorter than teenagers and adults
- Children 9-13: "child, approximately 130-145cm tall" — noticeably shorter than adults
- Teenagers 14-17: "teenager, approximately 160-170cm tall" — close to adult height
- ALWAYS add relative size: "visibly smaller than [older sibling/parent name]"
- Example: "Luca: 3-year-old boy, toddler, approximately 90cm tall, visibly much smaller than his 8-year-old sister Maria and half the height of adults"
- Size ratios MUST be maintained in every panel — a 3-year-old must never appear as tall as an 8-year-old

Respond ONLY with JSON...`
```

**Test:** Comic mit 3-jährigem Kind generieren, Größenverhältnisse prüfen

---

### 5. Outfit-State in Supabase 👔
**Aufwand:** 2-3 Tage  
**Dateien:** Supabase Schema + `backend-railway/src/routes/comic.js`  

**Problem:** Charaktere tragen manchmal gleiche Kleidung in verschiedenen Kontexten

**Lösung:**
```sql
CREATE TABLE outfit_state (
  project_id TEXT NOT NULL,
  character_name TEXT NOT NULL,
  page_number INT NOT NULL,
  context TEXT,           -- 'beach', 'home', 'airport', 'garden'
  outfit_description TEXT, -- "blue swim shorts, white t-shirt"
  PRIMARY KEY (project_id, character_name, page_number)
);
```

**Backend-Integration:**
```javascript
// Vor jeder Seite: Outfit aus letzter Seite laden
const lastOutfit = await getLastOutfit(projectId, charName);
if (lastOutfit?.context === currentContext) {
  prompt += `${charName} wears: ${lastOutfit.outfit_description}. Keep this exact outfit.`;
}
```

---

## 🟢 Nice-to-Have (später)

### 6. Multi-Age Photo System implementieren 📸
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

### 7. UI/UX Redesign 🎨
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

### 8. OpenAI Tier 2 upgraden ⚡
**Aufwand:** 5 Minuten  
**Kosten:** $50+ laden  

**Benefit:**
- 5 IPM → 50 IPM
- 12 Minuten → 2-3 Minuten Generierungszeit
- Style-Master-Panel wird möglich

**Wann:** Sobald erste zahlende Kunden da sind

---

### 9. PDF-Export + Druckspezifikation 📄
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

- **Consistency Validation** - GPT-4.1 Vision vergleicht Seiten mit Cover
- **Reference Stack** - Beste vorherige Seite als Referenz
- **Face Embeddings** - Mathematische Gesichts-Konsistenz
- **SDXL + ControlNet** - Alternative zu OpenAI
- **Image Worker** - Asynchrone Job-Queue

---

## ✅ Kürzlich erledigt

- ✅ Multi-Person Photo Matching System
- ✅ Age-Based Character Rendering
- ✅ Syntax-Fehler behoben (Backend startet)
- ✅ Crowd Scene Handling
- ✅ Quality Score + Auto-Retry
- ✅ "Neu illustrieren" mit Freitextfeld
- ✅ Seite löschen Feature
- ✅ Visual Polish (Bronze Design)
- ✅ Anti-Manga Prompts verstärkt
- ✅ Opa/Oma Fix (erscheinen nicht in falschen Szenen)

---

**Nächster Schritt:** Multi-Photo System testen (Task #1)  
**Danach:** Age Modifier testen (Task #2)  
**Dann:** Supabase Constraint hinzufügen (Task #3)
