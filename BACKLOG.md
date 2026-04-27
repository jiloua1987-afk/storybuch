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

### 3b. Architektur-Erweiterungen für bessere Qualität & Konsistenz

**Schnelle Einordnung der Schlagworte:**

| Begriff | Was ist das? | Wo einsetzen? | Priorität |
|---------|--------------|---------------|-----------|
| **Railway** | Decision Engine | Entscheidet welche Referenz, welcher Prompt, welche Validierung | ✅ Jetzt |
| **Supabase** | Memory Layer | Speichert character_ref_image, last_page_image, style_reference, outfit_state, face_embedding | ✅ Jetzt |
| **Character Memory** | Charakter-Infos über Seiten hinweg | Railway Backend + Supabase Tabellen | ✅ Phase 1 |
| **Reference Stack** | Verwaltung mehrerer Referenzbilder | Railway Backend + Supabase `last_page_image` | ✅ Phase 1 |
| **Consistency Validation** | Qualitätsprüfung nach Generation | Railway Backend (GPT-4o Vision) | ✅ Phase 1 |
| **SDXL** | Alternative Bildgenerierung | GPU Service (optional) | ⏳ Phase 3 |
| **ControlNet** | Layout/Pose-Kontrolle für SDXL | GPU Service (nur mit SDXL) | ⏳ Phase 3 |
| **GPU Endpoint** | Server für SDXL + ControlNet | Replicate/RunPod/Modal | ⏳ Phase 3 |
| **Image Worker** | Asynchrone Job-Verarbeitung | Separate Service (BullMQ + Redis) | 🔶 Phase 2 |

**Kernaussage:** 
- **Railway = Gehirn** (entscheidet alles)
- **Supabase = Gedächtnis** (speichert alles)
- **GPU Service = optional** (nur wenn gpt-image-1.5 nicht reicht)

---

#### **SDXL (Stable Diffusion XL)**
**Was ist das:** Open-Source Bildgenerierungs-Modell, Alternative zu DALL-E

**Vorteile:**
- ✅ Bessere Kontrolle über Konsistenz
- ✅ Kann mit LoRA/ControlNet erweitert werden
- ✅ Günstiger bei hohem Volumen
- ✅ Eigene Infrastruktur = keine API-Limits

**Nachteile:**
- ❌ Braucht eigene GPU-Infrastruktur
- ❌ Komplexere Implementierung
- ❌ Qualität nicht immer besser als gpt-image-1.5

**Einsatz:** Mittelfristige Alternative zu OpenAI

---

#### **ControlNet**
**Was ist das:** Zusatzmodell für Stable Diffusion, das Layout/Pose/Struktur kontrolliert

**Wie es hilft:**
- ✅ Panel-Layout exakt vorgeben (wo welches Panel ist)
- ✅ Character-Posen kontrollieren (keine doppelten Charaktere)
- ✅ Konsistente Komposition über Seiten

**Beispiel:**
```
Input: Sketch mit 4 Panel-Boxen
ControlNet: Generiert Bild mit exakt dieser Layout-Struktur
Result: Perfekte Panel-Grenzen, keine Überlappungen
```

**Voraussetzung:** SDXL oder Stable Diffusion
**Aufwand:** Hoch (braucht GPU-Service)

---

#### **Character Memory**
**Was ist das:** System, das Charakter-Eigenschaften über Generierungen hinweg speichert

**Konzept:**
```javascript
characterMemory = {
  "Opa Ahmed": {
    referenceImage: "cover-url",
    visualAnchor: "80 years old, grey beard...",
    appearedInPages: [1, 2, 3, 4],
    lastSeenFeatures: "beige shirt, warm smile"
  }
}
```

**Wie es hilft:**
- ✅ Jede neue Seite nutzt akkumuliertes Wissen
- ✅ Kann erkennen: "Opa sah auf Seite 2 anders aus als Cover"
- ✅ Kann korrigieren: "Nutze Cover-Version, nicht Seite-2-Version"

**Implementierung:**
- Datenbank-Tabelle `character_memory`
- Nach jeder Seite: Vision API analysiert generierte Charaktere
- Speichert: "Wie sah Charakter X auf dieser Seite aus?"
- Nächste Seite: Nutzt beste/konsistenteste Version als Referenz

**Aufwand:** Mittel-Hoch

---

#### **Empfohlene Architektur: Railway + Supabase Memory Layer**

**Konzept:** Railway Backend wird "intelligent" und entscheidet basierend auf Memory Layer

**Architektur-Übersicht:**
```
┌─────────────────────────────────────────────────────────────┐
│ Frontend (Next.js)                                          │
│ - User Input                                                │
│ - Zeigt Ergebnisse                                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Railway Backend (Express) - DECISION ENGINE                 │
│                                                             │
│ Komponenten:                                                │
│ ✓ Character Memory: Speichert & nutzt Charakter-Infos     │
│ ✓ Reference Stack: Entscheidet welche Referenz(en)        │
│ ✓ Consistency Validation: Prüft Qualität nach Generation  │
│ ✓ Context-Aware Prompts: Passt Kleidung/Pose an Szene an │
│                                                             │
│ Entscheidet für jede Seite:                                │
│ ✓ Welche Referenz nutzen? (Cover/User-Photo/Last Page)    │
│ ✓ Welcher Charakter in welchem Panel?                     │
│ ✓ Welche Pose/Outfit basierend auf Kontext?               │
│ ✓ Konsistenz-Check mit Memory Layer                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Supabase - MEMORY LAYER (PostgreSQL)                       │
│                                                             │
│ Tabellen:                                                   │
│                                                             │
│ 1. character_ref_image                                     │
│    - character_id                                          │
│    - project_id                                            │
│    - reference_image_url (Cover oder User-Upload)          │
│    - visual_anchor (detaillierte Beschreibung)            │
│    - created_at                                            │
│                                                             │
│ 2. last_page_image (= Reference Stack)                     │
│    - project_id                                            │
│    - page_number                                           │
│    - image_url                                             │
│    - characters_present (Array: ["Opa", "Luca"])          │
│    - quality_score (0-100 von Consistency Validation)     │
│    - created_at                                            │
│                                                             │
│ 3. style_reference                                         │
│    - project_id                                            │
│    - category (urlaub/familie/etc)                        │
│    - comic_style (emotional/action/humor)                 │
│    - color_palette                                         │
│    - mood_keywords                                         │
│                                                             │
│ 4. outfit_state                                            │
│    - character_id                                          │
│    - project_id                                            │
│    - page_number                                           │
│    - context (beach/home/airport)                         │
│    - outfit_description ("swim shorts, no shirt")         │
│    - should_change_next (boolean)                         │
│                                                             │
│ 5. face_embedding                                          │
│    - character_id                                          │
│    - project_id                                            │
│    - embedding_vector (512-dim array)                     │
│    - source (cover/page1/page2)                           │
│    - confidence_score                                      │
│                                                             │
└─────────────────────┬────────────────────────────────────────┘
                     │
                     ▼ (Optional: Langfristig)
┌─────────────────────────────────────────────────────────────┐
│ GPU Service / Image Worker (für SDXL + ControlNet)         │
│                                                             │
│ - Job Queue (Redis/BullMQ)                                 │
│ - GPU Endpoint (Replicate/RunPod/Modal)                   │
│ - SDXL + ControlNet für bessere Kontrolle                 │
│ - Background Processing                                     │
└─────────────────────────────────────────────────────────────┘
```

**Komponenten-Zuordnung:**

| Schlagwort | Wo implementiert | Funktion |
|------------|------------------|----------|
| **Character Memory** | Railway Backend + Supabase Tabellen 1, 4, 5 | Speichert Charakter-Eigenschaften über alle Seiten |
| **Reference Stack** | Railway Backend + Supabase Tabelle 2 | Verwaltet welche Referenzbilder für welche Seite |
| **Consistency Validation** | Railway Backend (GPT-4o Vision) | Prüft Qualität nach jeder Generation, speichert Score |
| **SDXL** | GPU Service (optional, langfristig) | Alternative zu gpt-image-1.5 mit mehr Kontrolle |
| **ControlNet** | GPU Service (optional, langfristig) | Kontrolliert Layout/Pose/Struktur bei SDXL |
| **GPU Endpoint** | Externe Infrastruktur (Replicate/RunPod) | Führt SDXL + ControlNet aus |
| **Image Worker** | Background Job Processor (BullMQ) | Verarbeitet Generierungs-Jobs asynchron |

---

### **Detaillierte Erklärung der Komponenten**

#### **1. Character Memory** 
**Was:** System das Charakter-Eigenschaften über alle Seiten hinweg speichert und nutzt

**Wo implementiert:** 
- Railway Backend (Logik)
- Supabase Tabellen: `character_ref_image`, `outfit_state`, `face_embedding`

**Wie es funktioniert:**
```javascript
// Nach Cover-Generierung
await saveCharacterMemory({
  character: "Opa Ahmed",
  referenceImage: coverUrl,
  visualAnchor: "80 years old, grey beard, warm smile...",
  faceEmbedding: extractedEmbedding
});

// Bei Seite 2 Generierung
const memory = await getCharacterMemory("Opa Ahmed");
// Nutzt gespeicherte Infos für konsistente Darstellung
```

**Löst:** Charaktere sehen auf jeder Seite anders aus

---

#### **2. Reference Stack**
**Was:** Verwaltung mehrerer Referenzbilder mit Prioritäten

**Wo implementiert:**
- Railway Backend (Entscheidungslogik)
- Supabase Tabelle: `last_page_image` (speichert alle generierten Seiten mit Quality Score)

**Wie es funktioniert:**
```javascript
// Railway entscheidet: Welche Referenz für Seite 3?
const referenceStack = [
  { source: "user_upload", priority: 1, url: userPhoto },      // Höchste Priorität
  { source: "cover", priority: 2, url: coverImage },           // Fallback 1
  { source: "page_1", priority: 3, url: page1, score: 85 },   // Fallback 2 (gute Qualität)
  { source: "page_2", priority: 4, url: page2, score: 62 }    // Fallback 3 (schlechte Qualität)
];

// Nutze beste verfügbare Referenz
const bestReference = referenceStack.find(ref => ref.score > 70) || referenceStack[0];
```

**Löst:** Qualitätsverlust über Seiten hinweg

---

#### **3. Consistency Validation**
**Was:** Automatische Qualitätsprüfung nach jeder Bildgenerierung

**Wo implementiert:**
- Railway Backend (GPT-4o Vision API Call)
- Speichert Score in Supabase `last_page_image.quality_score`

**Wie es funktioniert:**
```javascript
// Nach Generierung von Seite 2
const validation = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [{
    role: "user",
    content: [
      { type: "image_url", image_url: { url: coverImage } },
      { type: "image_url", image_url: { url: generatedPage2 } },
      { type: "text", text: `
        Compare characters in both images:
        1. Is "Opa Ahmed" consistent? (face, clothing, accessories)
        2. Any character appears twice in one panel?
        3. Are panels clearly separated?
        4. Is clothing appropriate for context (beach = swimwear)?
        5. Any GPT-generated text/speech bubbles in image?
        
        Return JSON: { score: 0-100, issues: [...] }
      `}
    ]
  }]
});

const result = JSON.parse(validation.choices[0].message.content);

if (result.score < 70) {
  console.log("Quality too low, regenerating with improved prompt...");
  // Retry mit Cover statt last_page als Referenz
}

// Speichere Score für Reference Stack
await saveQualityScore(projectId, pageNumber, result.score);
```

**Löst:** 
- Doppelte Charaktere
- Falsche Kleidung
- Inkonsistente Gesichter
- GPT-Text in Bildern

**Kosten:** ~$0.01 pro Seite (GPT-4o Vision)

---

#### **4. SDXL (Stable Diffusion XL)**
**Was:** Open-Source Bildgenerierungs-Modell als Alternative zu gpt-image-1.5

**Wo implementiert:** GPU Service (optional, langfristig)

**Vorteile gegenüber gpt-image-1.5:**
- ✅ Kann mit ControlNet erweitert werden (siehe unten)
- ✅ Unterstützt LoRA (Character Training für perfekte Konsistenz)
- ✅ Unterstützt IP-Adapter (bessere Referenzbild-Nutzung)
- ✅ Günstiger bei hohem Volumen
- ✅ Keine API-Limits

**Nachteile:**
- ❌ Braucht eigene GPU-Infrastruktur (siehe GPU Endpoint)
- ❌ Komplexere Implementierung
- ❌ Qualität nicht immer besser als gpt-image-1.5

**Wann sinnvoll:** Wenn gpt-image-1.5 Konsistenz-Probleme nicht lösen kann

**Aufwand:** Hoch (2-3 Wochen)

---

#### **5. ControlNet**
**Was:** Zusatzmodell für Stable Diffusion das Layout/Pose/Struktur kontrolliert

**Wo implementiert:** GPU Service (nur mit SDXL, nicht mit gpt-image-1.5)

**Wie es hilft:**
```
Problem: gpt-image-1.5 generiert manchmal 3 Panels statt 4, oder Panels überlappen

Lösung mit ControlNet:
1. Erstelle Sketch: 4 Panel-Boxen in exakter Position
2. ControlNet zwingt SDXL diese Struktur einzuhalten
3. Result: Perfekte Panel-Grenzen, keine Überlappungen
```

**Weitere Anwendungen:**
- **Pose Control:** "Opa sitzt, Luca steht" → ControlNet erzwingt diese Posen
- **Depth Control:** Vordergrund/Hintergrund-Trennung
- **Line Art:** Comic-Stil mit klaren Linien

**Voraussetzung:** SDXL (funktioniert nicht mit gpt-image-1.5)

**Aufwand:** Hoch (braucht GPU Service)

---

#### **6. GPU Endpoint / GPU Service**
**Was:** Eigene Server-Infrastruktur für Bildgenerierung (statt OpenAI API)

**Wo implementiert:** Externe Infrastruktur (Replicate, RunPod, Modal, oder eigene EC2)

**Architektur:**
```
Railway Backend → Redis Job Queue → GPU Worker Pool → Supabase Storage
                                    (SDXL + ControlNet)
```

**Komponenten:**

**A) GPU Endpoint:**
- Server mit NVIDIA GPU (A100, H100)
- Läuft SDXL + ControlNet + LoRA
- REST API: `POST /generate { prompt, controlnet_image, lora_weights }`
- Returns: Generated image URL

**B) Anbieter-Optionen:**

| Anbieter | Kosten | Vorteile | Nachteile |
|----------|--------|----------|-----------|
| **Replicate** | $0.02/Bild | Einfach, managed | Weniger Kontrolle |
| **RunPod** | $0.40/h GPU | Günstig, flexibel | Mehr DevOps |
| **Modal** | $0.01/Bild | Serverless, skaliert | Vendor Lock-in |
| **Eigene EC2** | $3-10/h | Volle Kontrolle | Hoher Aufwand |

**Wann sinnvoll:**
- Wenn >500 Comics/Monat (dann günstiger als OpenAI)
- Wenn ControlNet/LoRA nötig für Qualität
- Wenn volle Kontrolle über Modell gewünscht

**Aufwand:** Sehr hoch (2-4 Wochen Setup + laufendes Monitoring)

---

#### **7. Image Worker**
**Was:** Background Job Processor für asynchrone Bildgenerierung

**Wo implementiert:** Separate Service (Node.js + BullMQ + Redis)

**Warum nötig:**
- Comic-Generierung dauert 2-5 Minuten
- User soll nicht warten müssen
- Mehrere Comics parallel generieren

**Architektur:**
```javascript
// Frontend sendet Request
POST /api/generate/comic
→ Railway Backend erstellt Job
→ Job in Redis Queue
→ Image Worker nimmt Job
→ Ruft GPU Endpoint auf (oder OpenAI)
→ Speichert Result zu Supabase
→ Sendet WebSocket Update an Frontend
```

**Vorteile:**
- ✅ User kann Browser schließen, Comic wird trotzdem fertig
- ✅ Retry-Logic bei Fehlern
- ✅ Priorisierung (zahlende Kunden zuerst)
- ✅ Skaliert horizontal (mehr Worker = mehr Kapazität)

**Technologie-Stack:**
- **Job Queue:** BullMQ (Redis-basiert)
- **Worker:** Node.js oder Python
- **Monitoring:** Bull Board (UI für Jobs)

**Aufwand:** Mittel-Hoch (1-2 Wochen)

---

### **Zusammenfassung: Wie alles zusammenspielt**

**Kurzfristig (mit gpt-image-1.5):**
```
1. User startet Comic-Generierung
2. Railway Backend:
   - Erstellt Character Memory (Tabelle 1)
   - Generiert Cover mit gpt-image-1.5
   - Speichert Cover in Reference Stack (Tabelle 2)
3. Für jede Seite:
   - Reference Stack entscheidet: Cover oder User-Foto?
   - Generiert Seite mit gpt-image-1.5
   - Consistency Validation prüft Qualität (GPT-4o Vision)
   - Wenn Score < 70: Retry mit anderem Prompt
   - Speichert Result + Score in Tabelle 2
4. Character Memory wird mit jeder Seite besser
```

**Langfristig (mit SDXL + ControlNet):**
```
1. User startet Comic-Generierung
2. Railway Backend erstellt Job in Redis Queue
3. Image Worker nimmt Job:
   - Lädt Character Memory aus Supabase
   - Erstellt ControlNet Sketch (Panel-Layout)
   - Ruft GPU Endpoint auf:
     POST /generate {
       model: "sdxl",
       prompt: "...",
       controlnet_image: sketch,
       reference_images: [cover, userPhoto],
       lora_weights: "character-consistency-v1"
     }
   - Consistency Validation
   - Speichert Result
4. Frontend erhält WebSocket Update
```

---

**Railway Backend Logic:**

```javascript
// Pseudo-Code für Seiten-Generierung

async function generatePage(pageNumber, pageData, projectId) {
  
  // 1. Memory Layer abfragen
  const memory = await getMemoryLayer(projectId);
  
  // 2. Entscheidung: Welche Referenz?
  let referenceImage;
  if (memory.userUploadedPhoto) {
    referenceImage = memory.userUploadedPhoto; // User-Foto hat Priorität
  } else if (pageNumber === 1) {
    referenceImage = memory.coverImage; // Erste Seite: Cover
  } else {
    // Ab Seite 2: Beste vorherige Seite (höchster quality_score)
    const bestPreviousPage = await getBestPreviousPage(projectId);
    referenceImage = bestPreviousPage.image_url;
  }
  
  // 3. Entscheidung: Outfit basierend auf Kontext
  const outfits = {};
  for (const character of pageData.characters) {
    const context = detectContext(pageData.location); // "beach", "home", etc.
    const lastOutfit = await getLastOutfit(character.id, projectId);
    
    if (context === "beach" && lastOutfit.context !== "beach") {
      outfits[character.name] = "swimwear (swim shorts, no shirt)";
      await updateOutfitState(character.id, projectId, pageNumber, "beach", outfits[character.name]);
    } else {
      outfits[character.name] = lastOutfit.outfit_description;
    }
  }
  
  // 4. Prompt erweitern mit Outfit-Info
  const enhancedPrompt = buildPrompt(pageData, outfits);
  
  // 5. Bild generieren
  const generatedImage = await openai.images.edit({
    model: "gpt-image-1.5",
    image: referenceImage,
    prompt: enhancedPrompt,
    size: "1024x1536"
  });
  
  // 6. Consistency Validation
  const validation = await validateConsistency(
    generatedImage.url,
    memory.coverImage,
    pageData.characters
  );
  
  // 7. Bei schlechter Qualität: Retry mit anderem Ansatz
  if (validation.score < 70) {
    console.log(`Page ${pageNumber} quality low (${validation.score}), retrying...`);
    // Nutze Cover statt last page
    referenceImage = memory.coverImage;
    generatedImage = await openai.images.edit({...}); // Retry
  }
  
  // 8. Memory Layer updaten
  await saveToMemoryLayer(projectId, pageNumber, {
    image_url: generatedImage.url,
    characters_present: pageData.characters.map(c => c.name),
    quality_score: validation.score
  });
  
  // 9. Optional: Face Embeddings extrahieren für zukünftige Vergleiche
  if (validation.score > 80) {
    const embeddings = await extractFaceEmbeddings(generatedImage.url);
    await saveFaceEmbeddings(projectId, embeddings);
  }
  
  return generatedImage.url;
}

// Helper: Kontext erkennen
function detectContext(location) {
  const beachKeywords = ["strand", "beach", "meer", "sea", "pool", "planschbecken"];
  const homeKeywords = ["haus", "home", "wohnzimmer", "küche", "hof"];
  
  if (beachKeywords.some(kw => location.toLowerCase().includes(kw))) {
    return "beach";
  }
  if (homeKeywords.some(kw => location.toLowerCase().includes(kw))) {
    return "home";
  }
  return "casual";
}
```

**Supabase Schema (SQL):**

```sql
-- 1. Character Reference Images
CREATE TABLE character_ref_image (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL,
  character_id TEXT NOT NULL,
  character_name TEXT NOT NULL,
  reference_image_url TEXT NOT NULL,
  visual_anchor TEXT,
  source TEXT, -- 'cover', 'user_upload', 'page_1'
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Page History (für Reference Stack)
CREATE TABLE last_page_image (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL,
  page_number INT NOT NULL,
  image_url TEXT NOT NULL,
  characters_present TEXT[], -- Array von Character-Namen
  quality_score INT, -- 0-100
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id, page_number)
);

-- 3. Style Reference
CREATE TABLE style_reference (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL UNIQUE,
  category TEXT, -- 'urlaub', 'familie', etc.
  comic_style TEXT, -- 'emotional', 'action', 'humor'
  color_palette JSONB,
  mood_keywords TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Outfit State (kontextabhängige Kleidung)
CREATE TABLE outfit_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL,
  character_id TEXT NOT NULL,
  page_number INT NOT NULL,
  context TEXT, -- 'beach', 'home', 'airport', 'casual'
  outfit_description TEXT,
  should_change_next BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id, character_id, page_number)
);

-- 5. Face Embeddings (für Konsistenz-Checks)
CREATE TABLE face_embedding (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL,
  character_id TEXT NOT NULL,
  embedding_vector VECTOR(512), -- pgvector extension
  source TEXT, -- 'cover', 'page_1', 'page_2'
  confidence_score FLOAT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index für schnelle Queries
CREATE INDEX idx_character_ref_project ON character_ref_image(project_id);
CREATE INDEX idx_last_page_project ON last_page_image(project_id);
CREATE INDEX idx_outfit_state_project_char ON outfit_state(project_id, character_id);
```

**Vorteile dieser Architektur:**

✅ **Railway = Smart Decision Engine**
- Entscheidet dynamisch welche Referenz
- Passt Outfits an Kontext an
- Kann Qualität validieren und retry

✅ **Supabase = Persistent Memory**
- Speichert alle Zwischenstände
- Ermöglicht "Zurückspulen" zu besserer Version
- Face Embeddings für Konsistenz-Checks

✅ **Skalierbar**
- Jedes Projekt hat eigenen Memory Layer
- Kann parallel mehrere Projekte generieren
- Memory bleibt erhalten für spätere Edits

✅ **Debuggable**
- Jede Entscheidung ist nachvollziehbar
- Quality Scores zeigen wo Probleme sind
- Kann A/B-Tests fahren (verschiedene Strategien)

**Aufwand:** Hoch (1-2 Wochen)
**Nutzen:** Sehr hoch (löst alle Konsistenz-Probleme)

---

#### **Reference Stack**
**Was ist das:** Mehrere Referenzbilder gleichzeitig nutzen, nicht nur eins

**Konzept:**
```javascript
referenceStack = [
  { type: "cover", weight: 0.5, url: "cover.jpg" },
  { type: "user-photo", weight: 0.3, url: "family.jpg" },
  { type: "previous-page", weight: 0.2, url: "page3.jpg" }
]
```

**Wie es hilft:**
- ✅ Cover (50%) + User-Foto (30%) + vorherige Seite (20%)
- ✅ Verhindert "Drift" über Seiten
- ✅ Kombiniert beste Eigenschaften mehrerer Referenzen

**Problem:** gpt-image-1.5 unterstützt nur 1 Referenzbild

**Lösungen:**
- A) Collage aus allen Referenzen erstellen
- B) Zu SDXL + ControlNet wechseln (unterstützt multiple references)
- C) Sequenziell: Erst mit Cover generieren, dann mit Result + User-Foto verfeinern

**Aufwand:** Mittel (A), Hoch (B, C)

---

#### **Consistency Validation**
**Was ist das:** Automatische Qualitätsprüfung nach jeder Generierung

**Ablauf:**
```
1. Seite generiert
2. GPT-4o Vision analysiert:
   - "Ist Opa Ahmed konsistent mit Cover?"
   - "Erscheint ein Charakter doppelt?"
   - "Sind Panels klar getrennt?"
3. Score: 0-100%
4. Wenn < 70%: Automatisch neu generieren mit verbessertem Prompt
```

**Checks:**
- ✅ Character Consistency (Gesicht, Kleidung, Accessoires)
- ✅ No Duplicates (kein Charakter 2× im Panel)
- ✅ Panel Separation (klare Grenzen)
- ✅ Text in Image (keine GPT-generierten Sprechblasen)
- ✅ Clothing Context (Badehose am Strand, nicht Jeans)

**Implementierung:**
```typescript
async function validateConsistency(
  generatedImage: string,
  coverImage: string,
  characters: Character[]
): Promise<ValidationResult> {
  const analysis = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{
      role: "user",
      content: [
        { type: "image_url", image_url: { url: coverImage } },
        { type: "image_url", image_url: { url: generatedImage } },
        { type: "text", text: `Compare characters in both images. 
          Check: Same faces? Same clothing style? Any duplicates? 
          Score 0-100. JSON only.` }
      ]
    }]
  });
  return JSON.parse(analysis.choices[0].message.content);
}
```

**Aufwand:** Mittel
**Kosten:** +$0.01 pro Seite (GPT-4o Vision)

---

#### **GPU Endpoint / GPU-Service / Image Worker**
**Was ist das:** Eigene Infrastruktur für Bildgenerierung statt OpenAI API

**Architektur:**
```
Frontend → Backend API → Job Queue (Redis)
                              ↓
                         GPU Worker Pool
                         (SDXL + ControlNet)
                              ↓
                         Supabase Storage
```

**Komponenten:**

**A) GPU Endpoint:**
- Replicate, RunPod, Modal, oder eigene EC2 GPU-Instanz
- Läuft SDXL + ControlNet + LoRA
- REST API: `POST /generate` → returns image

**B) Image Worker:**
- Background Job Processor (BullMQ, Celery)
- Nimmt Jobs aus Queue
- Ruft GPU Endpoint auf
- Speichert Result zu Supabase
- Updated Frontend via WebSocket

**C) Job Queue:**
- Redis/BullMQ
- Verwaltet: "Seite 1 generieren", "Seite 2 generieren"
- Retry-Logic bei Fehlern
- Priorisierung (zahlende Kunden zuerst)

**Vorteile:**
- ✅ Volle Kontrolle über Modell & Prompts
- ✅ Kann ControlNet, LoRA, IP-Adapter nutzen
- ✅ Günstiger bei Skalierung (>1000 Comics/Monat)
- ✅ Keine API-Limits

**Nachteile:**
- ❌ Hohe Komplexität
- ❌ DevOps-Aufwand (Monitoring, Scaling, Fehlerbehandlung)
- ❌ Initiale Kosten (GPU-Server)

**Wann sinnvoll:**
- Wenn >500 Comics/Monat generiert werden
- Wenn OpenAI-Qualität nicht ausreicht
- Wenn volle Kontrolle nötig ist

**Aufwand:** Sehr hoch (2-4 Wochen Entwicklung)

---

### 3c. Empfohlene Roadmap für Qualitätsverbesserung

**Phase 1: Quick Wins mit gpt-image-1.5 (1-2 Wochen)**

| Komponente | Implementierung | Aufwand | Nutzen |
|------------|-----------------|---------|--------|
| **Character Memory (Basic)** | Supabase Tabellen 1, 4 erstellen + Railway speichert Cover-Referenz | Mittel | Hoch |
| **Reference Stack (Basic)** | Railway entscheidet: User-Foto > Cover > Last Page | Gering | Hoch |
| **Consistency Validation** | GPT-4o Vision prüft nach jeder Generation | Mittel | Sehr hoch |
| **Bessere Prompts** | Kleidung kontextabhängig, keine Duplikate | Gering | Mittel |

**Kosten:** Nur Entwicklungszeit + $0.01/Seite für Validation
**Erwartete Verbesserung:** 40-60% weniger Qualitätsprobleme

---

**Phase 2: Erweiterte Konsistenz (2-4 Wochen)**

| Komponente | Implementierung | Aufwand | Nutzen |
|------------|-----------------|---------|--------|
| **Character Memory (Advanced)** | Face Embeddings (Tabelle 5) für Ähnlichkeits-Checks | Hoch | Sehr hoch |
| **Reference Stack (Multi)** | Collage aus mehreren Referenzen | Mittel | Mittel |
| **Image Worker** | BullMQ + Redis für asynchrone Generierung | Hoch | Hoch (UX) |
| **A/B-Test** | Flux.1 Pro vs. gpt-image-1.5 vergleichen | Mittel | Mittel |

**Kosten:** $500-1000 (Redis Hosting, Entwicklungszeit)
**Erwartete Verbesserung:** 70-80% weniger Qualitätsprobleme

---

**Phase 3: GPU Service mit SDXL + ControlNet (2-3 Monate)**

| Komponente | Implementierung | Aufwand | Nutzen |
|------------|-----------------|---------|--------|
| **GPU Endpoint** | Replicate oder RunPod mit SDXL | Sehr hoch | Sehr hoch |
| **ControlNet** | Panel-Layout + Pose Control | Sehr hoch | Sehr hoch |
| **LoRA Training** | Pro Kunde trainiertes Modell (optional) | Sehr hoch | Perfekt |
| **Full Image Worker** | Komplettes Queue-System mit Monitoring | Hoch | Hoch |

**Kosten:** $3000-5000 (Setup) + $0.40/h GPU (laufend)
**Erwartete Verbesserung:** 90-95% weniger Qualitätsprobleme

---

**Empfehlung:**

1. **Sofort starten:** Phase 1 (Character Memory + Consistency Validation)
   - Löst die meisten aktuellen Probleme
   - Geringer Aufwand, hoher Nutzen
   - Bleibt bei gpt-image-1.5 (bekannte Technologie)

2. **Nach 2 Wochen evaluieren:** 
   - Sind Probleme zu 70%+ gelöst? → Bei Phase 1 bleiben
   - Immer noch große Probleme? → Phase 2 starten

3. **Phase 3 nur wenn:**
   - >500 Comics/Monat (dann wirtschaftlich sinnvoll)
   - Phase 1+2 reichen nicht für gewünschte Qualität
   - Team hat DevOps-Kapazität für GPU-Infrastruktur

---

**Kosten-Nutzen-Analyse:**

| Phase | Entwicklung | Laufende Kosten | Qualität | ROI |
|-------|-------------|-----------------|----------|-----|
| **Phase 1** | 1-2 Wochen | +$0.01/Seite | 70-80% | ⭐⭐⭐⭐⭐ |
| **Phase 2** | 2-4 Wochen | +$50/Monat | 80-90% | ⭐⭐⭐⭐ |
| **Phase 3** | 2-3 Monate | +$500/Monat | 90-95% | ⭐⭐⭐ |

**Klare Empfehlung:** Start mit Phase 1, dann evaluieren.

---

### **Entscheidungsbaum: Welche Technologie wann?**

```
START: Qualitätsprobleme mit gpt-image-1.5
│
├─ Sind es Konsistenz-Probleme? (Charaktere sehen anders aus)
│  ├─ JA → Phase 1: Character Memory + Reference Stack
│  │      ├─ Gelöst? → FERTIG ✅
│  │      └─ Nicht gelöst? → Phase 2: Face Embeddings
│  │                         ├─ Gelöst? → FERTIG ✅
│  │                         └─ Nicht gelöst? → Phase 3: SDXL + LoRA
│  │
│  └─ NEIN → Weiter zu nächster Frage
│
├─ Sind es Layout-Probleme? (Panels überlappen, falsche Anzahl)
│  ├─ JA → Phase 3: ControlNet (braucht SDXL)
│  └─ NEIN → Weiter zu nächster Frage
│
├─ Sind es Duplikat-Probleme? (Charakter 2× im Panel)
│  ├─ JA → Phase 1: Consistency Validation + bessere Prompts
│  │      ├─ Gelöst? → FERTIG ✅
│  │      └─ Nicht gelöst? → Phase 3: ControlNet Pose Control
│  │
│  └─ NEIN → Weiter zu nächster Frage
│
├─ Sind es Kontext-Probleme? (Falsche Kleidung, falsche Objekte)
│  ├─ JA → Phase 1: Context-Aware Prompts + outfit_state Tabelle
│  │      ├─ Gelöst? → FERTIG ✅
│  │      └─ Nicht gelöst? → Prompts weiter verfeinern
│  │
│  └─ NEIN → Weiter zu nächster Frage
│
└─ Ist es generelle Bildqualität? (Verschwommen, unrealistisch)
   ├─ JA → A/B-Test: Flux.1 Pro oder DALL-E 3
   │      ├─ Besser? → Wechsel zu besserem Modell
   │      └─ Nicht besser? → Phase 3: SDXL mit Custom Training
   │
   └─ NEIN → Problem unklar, mehr Analyse nötig
```

**Wichtig:** Die meisten aktuellen Probleme (Konsistenz, Duplikate, Kontext) können mit Phase 1 gelöst werden!

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
