# Multi-Age Photo System - Feature Specification 🎯

## Problem Statement

**Aktuelles System (v1):**
- User lädt 1 Foto hoch (z.B. 60 Jahre alt)
- Junge Szenen: System erfindet Gesichter (NICHT wie echte Person)
- Risiko: Sally jung sieht NICHT aus wie Sally alt
- Konsistenz geht verloren

**Gewünschtes System (v2):**
- User lädt mehrere Fotos aus verschiedenen Lebensabschnitten hoch
- System wählt automatisch passendes Foto für jede Szene
- Sally jung = echtes Foto von Sally mit 25
- Sally alt = echtes Foto von Sally mit 60
- Perfekte Konsistenz über alle Altersgruppen

---

## Warum nicht aus bestehendem Foto ableiten?

### Technische Limitation von gpt-image-2:

**Versuch 1: Verjüngung mit Prompt**
```javascript
prompt: "Make this 60-year-old man look 30 years younger"
reference: foto-60-jahre.jpg
// ❌ Ergebnis: Sieht immer noch alt aus, nur etwas geglättet
```

**Versuch 2: Ohne Foto (nur Text)**
```javascript
prompt: "25-year-old man, dark hair, no wrinkles"
reference: null
// ❌ Ergebnis: Sieht jung aus, aber NICHT wie die echte Person
```

**Lösung: Echte junge Fotos verwenden**
```javascript
prompt: "Draw this person in comic style"
reference: foto-25-jahre.jpg
// ✅ Ergebnis: Sieht jung aus UND wie die echte Person!
```

---

## Lösung: Hybrid Multi-Age Photo System (Option C)

### Konzept:

**Wenn User 1 Foto hochlädt:**
→ System verwendet Alters-Modifier (wie aktuell)
→ Kann Gesichter erfinden, aber funktioniert

**Wenn User mehrere Fotos hochlädt:**
→ System wählt alters-spezifisches Foto
→ Verwendet echte Gesichter aus verschiedenen Lebensabschnitten

### Vorteile:
- ✅ Keine Breaking Changes (1 Foto funktioniert weiterhin)
- ✅ Bessere Qualität mit mehreren Fotos
- ✅ User entscheidet selbst
- ✅ Schrittweise Migration möglich

---

## User Experience

### Upload-Flow:

```
Step 2: Fotos hochladen

┌─────────────────────────────────────┐
│ Sally                               │
├─────────────────────────────────────┤
│ [📷 Junges Foto] (optional)         │
│ Label: Sally-jung                   │
│ Alter: ~25 Jahre                    │
│                                     │
│ [📷 Aktuelles Foto]                 │
│ Label: Sally-heute                  │
│ Alter: ~60 Jahre                    │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Jil                                 │
├─────────────────────────────────────┤
│ [📷 Junges Foto] (optional)         │
│ Label: Jil-jung                     │
│ Alter: ~27 Jahre                    │
│                                     │
│ [📷 Aktuelles Foto]                 │
│ Label: Jil-heute                    │
│ Alter: ~62 Jahre                    │
└─────────────────────────────────────┘

💡 Tipp: Lade Fotos aus verschiedenen 
   Lebensabschnitten hoch für beste Ergebnisse!
```

### Automatische Foto-Auswahl:

| Szene | Keywords | Foto verwendet |
|-------|----------|----------------|
| "Das erste Kennenlernen" | kennenlernen, first met | Sally-jung + Jil-jung |
| "Unsere Hochzeit" | hochzeit, wedding | Sally-jung + Jil-jung (oder middle falls vorhanden) |
| "Geburt der Kinder" | kinder, children | Sally-heute + Jil-heute (oder middle) |
| "Heute mit Enkeln" | heute, enkel | Sally-heute + Jil-heute |

---

## Technische Implementierung

### 1. Frontend Changes

#### Step2Upload.tsx

```tsx
interface PhotoUpload {
  characterName: string;
  ageContext: "young" | "middle" | "current";
  file: File;
  label: string;
}

// UI für mehrere Fotos pro Charakter
<div className="character-photos">
  <h3>{characterName}</h3>
  
  <div className="photo-slot">
    <label>Junges Foto (optional)</label>
    <input 
      type="file" 
      onChange={(e) => handlePhotoUpload(characterName, "young", e.target.files[0])}
    />
    <span className="hint">z.B. 20-30 Jahre</span>
  </div>
  
  <div className="photo-slot">
    <label>Mittleres Alter (optional)</label>
    <input 
      type="file" 
      onChange={(e) => handlePhotoUpload(characterName, "middle", e.target.files[0])}
    />
    <span className="hint">z.B. 35-50 Jahre</span>
  </div>
  
  <div className="photo-slot">
    <label>Aktuelles Foto</label>
    <input 
      type="file" 
      onChange={(e) => handlePhotoUpload(characterName, "current", e.target.files[0])}
    />
    <span className="hint">Aktuelles Alter</span>
  </div>
</div>
```

#### bookStore.ts

```typescript
interface CharacterPhoto {
  characterName: string;
  ageContext: "young" | "middle" | "current";
  url: string;
  label: string;
}

interface BookProject {
  // ... existing fields
  characterPhotos: CharacterPhoto[];  // NEW
}
```

---

### 2. Backend Changes

#### routes/comic.js - Photo Selection Logic

```javascript
// ── Select age-appropriate photo for character ────────────────────────────────
function selectPhotoForCharacter(characterName, ageContext, referenceImageUrls) {
  const charPhotos = referenceImageUrls.filter(ref => 
    ref.label.toLowerCase().includes(characterName.toLowerCase())
  );
  
  if (charPhotos.length === 0) return null;
  if (charPhotos.length === 1) return charPhotos[0].url; // Only one photo available
  
  // Multiple photos available - select based on age context
  const ageKeywords = {
    young: ["jung", "young", "youth", "teenager"],
    middle: ["middle", "mittel", "wedding", "hochzeit"],
    current: ["heute", "today", "current", "now", "alt", "old"]
  };
  
  // Try to find exact match
  const exactMatch = charPhotos.find(ref => 
    ageKeywords[ageContext].some(keyword => 
      ref.label.toLowerCase().includes(keyword)
    )
  );
  
  if (exactMatch) return exactMatch.url;
  
  // Fallback strategy
  if (ageContext === "young") {
    // Prefer youngest-looking photo (first uploaded or labeled "jung")
    return charPhotos[0].url;
  }
  
  if (ageContext === "current") {
    // Prefer most recent photo (last uploaded or labeled "heute")
    return charPhotos[charPhotos.length - 1].url;
  }
  
  // Middle age - try to find middle photo or use current
  return charPhotos[Math.floor(charPhotos.length / 2)].url;
}

// ── Modified page generation ──────────────────────────────────────────────────
router.post("/page", async (req, res) => {
  // ... existing code ...
  
  const ageContext = getAgeContext(page.title, panelDescriptions);
  
  // NEW: Select age-appropriate photos for each character
  const characterPhotos = finalCharacters.map(char => ({
    name: char.name,
    photoUrl: selectPhotoForCharacter(char.name, ageContext.ageContext, referenceImageUrls)
  }));
  
  console.log(`  → Age context: ${ageContext.ageContext}`);
  console.log(`  → Selected photos:`, characterPhotos.map(c => `${c.name}: ${c.photoUrl ? 'found' : 'none'}`));
  
  // Use age-appropriate photos instead of single reference
  let reference = null;
  
  if (characterPhotos.every(c => c.photoUrl)) {
    // All characters have age-appropriate photos
    // Use first character's photo as base (or create composite)
    reference = await fetchBuffer(characterPhotos[0].photoUrl);
    refSource = `age-specific-${ageContext.ageContext}`;
    console.log(`  → Using age-specific photos for ${ageContext.ageContext} scene`);
  } else if (!ageContext.useReference) {
    // Historical scene but no age-specific photos available
    // Fall back to text-only generation
    reference = null;
    refSource = "generate-only-age-modified";
    console.log(`  → No age-specific photos, using text-only generation`);
  } else {
    // Current age scene - use existing logic
    // ... existing reference strategy ...
  }
  
  // ... rest of generation ...
});
```

---

### 3. Database Changes

#### Supabase Schema Extension

```sql
-- Add age_context column to character_ref_image
ALTER TABLE character_ref_image 
ADD COLUMN IF NOT EXISTS age_context TEXT CHECK (age_context IN ('young', 'middle', 'current'));

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_char_ref_age 
ON character_ref_image(project_id, character_name, age_context);

-- Example data:
-- project_id | character_name | age_context | photo_url
-- proj-123   | Sally          | young       | https://supabase.../sally-25.jpg
-- proj-123   | Sally          | current     | https://supabase.../sally-60.jpg
-- proj-123   | Jil            | young       | https://supabase.../jil-27.jpg
-- proj-123   | Jil            | current     | https://supabase.../jil-62.jpg
```

#### storage.js

```javascript
async function saveCharacterRefs(projectId, characters, coverUrl, referenceImageUrls = []) {
  const rows = [];
  
  for (const char of characters) {
    // Find all photos for this character
    const charPhotos = referenceImageUrls.filter(ref => 
      ref.label.toLowerCase().includes(char.name.toLowerCase())
    );
    
    for (const photo of charPhotos) {
      // Detect age context from label
      let ageContext = "current"; // default
      if (photo.label.match(/jung|young|youth/i)) ageContext = "young";
      if (photo.label.match(/middle|mittel|wedding/i)) ageContext = "middle";
      
      rows.push({
        project_id: projectId,
        character_name: char.name,
        character_age: char.age || null,
        visual_anchor: char.visual_anchor || null,
        cover_url: coverUrl,
        in_photo: true,
        photo_url: photo.url,
        age_context: ageContext,  // NEW
      });
    }
  }
  
  const { error } = await supabase
    .from("character_ref_image")
    .upsert(rows, { onConflict: "project_id,character_name,age_context" });
  
  if (error) throw error;
  console.log(`✓ Saved ${rows.length} character refs (multi-age) for project ${projectId}`);
}
```

---

## Label-Konventionen

### Automatische Erkennung:

| Label | Erkannt als | Beispiele |
|-------|-------------|-----------|
| `Name-jung` | young | Sally-jung, Jil-jung |
| `Name-young` | young | Sally-young, Jil-young |
| `Name-youth` | young | Sally-youth |
| `Name-middle` | middle | Sally-middle |
| `Name-wedding` | middle | Sally-wedding |
| `Name-heute` | current | Sally-heute, Jil-heute |
| `Name-today` | current | Sally-today |
| `Name-current` | current | Sally-current |
| `Name-alt` | current | Sally-alt |
| `Name` (ohne Suffix) | current | Sally, Jil |

### User-Friendly Labels (UI):

```tsx
<select>
  <option value="young">Junges Foto (20-30 Jahre)</option>
  <option value="middle">Mittleres Alter (35-50 Jahre)</option>
  <option value="current">Aktuelles Foto</option>
</select>
```

---

## Migration Strategy

### Phase 1: Backend Support (Week 1)
- ✅ Implement `selectPhotoForCharacter()` function
- ✅ Extend Supabase schema with `age_context` column
- ✅ Update `saveCharacterRefs()` to handle multiple photos per character
- ✅ Modify page generation to use age-specific photos
- ✅ Backward compatible: single photo still works

### Phase 2: Frontend UI (Week 2)
- ✅ Add multiple photo upload slots per character
- ✅ Add age context selector (young/middle/current)
- ✅ Update bookStore to handle multiple photos
- ✅ Add visual feedback showing which photo is used for which scene

### Phase 3: Testing & Refinement (Week 3)
- ✅ Test with real biographical stories
- ✅ Verify photo selection logic
- ✅ Optimize UI/UX based on feedback
- ✅ Add tooltips and help text

### Phase 4: Documentation & Launch (Week 4)
- ✅ Update user documentation
- ✅ Create tutorial video
- ✅ Add example stories showcasing feature
- ✅ Announce feature to users

---

## Example User Stories

### Story 1: Liebesgeschichte über 40 Jahre

**User uploads:**
- Sally-jung.jpg (25 Jahre, lange dunkle Haare)
- Sally-heute.jpg (60 Jahre, kurze graue Haare)
- Jil-jung.jpg (27 Jahre, dunkle Haare, kein Bart)
- Jil-heute.jpg (62 Jahre, graue Haare, Bart)

**Moments:**
1. "Das erste Kennenlernen im Café"
2. "Unsere Hochzeit im Sommer"
3. "Geburt unserer Tochter"
4. "Heute mit den Enkeln im Garten"

**System behavior:**
- Moment 1 → Sally-jung + Jil-jung ✅
- Moment 2 → Sally-jung + Jil-jung ✅
- Moment 3 → Sally-heute + Jil-heute ✅
- Moment 4 → Sally-heute + Jil-heute ✅

**Result:** Perfekte Konsistenz, echte Gesichter in allen Altersgruppen!

---

### Story 2: Biografie mit 3 Lebensabschnitten

**User uploads:**
- Opa-jung.jpg (20 Jahre, Soldat)
- Opa-middle.jpg (45 Jahre, Geschäftsmann)
- Opa-heute.jpg (80 Jahre, Rentner)

**Moments:**
1. "Kriegszeit als junger Soldat"
2. "Aufbau der Firma in den 70ern"
3. "Ruhestand und Reisen"

**System behavior:**
- Moment 1 → Opa-jung ✅
- Moment 2 → Opa-middle ✅
- Moment 3 → Opa-heute ✅

**Result:** Drei verschiedene Lebensabschnitte, alle mit echten Fotos!

---

## Edge Cases & Fallbacks

### Case 1: Nur 1 Foto hochgeladen
```
User uploads: Sally-heute.jpg
System: Verwendet Alters-Modifier (wie aktuell)
Result: Funktioniert, aber junge Szenen erfinden Gesicht
```

### Case 2: Nur junge Fotos, keine aktuellen
```
User uploads: Sally-jung.jpg, Jil-jung.jpg
System: Verwendet junge Fotos für alle Szenen + Alters-Modifier
Result: Aktuelle Szenen zeigen "gealterte" Version (nicht perfekt)
```

### Case 3: Gemischte Verfügbarkeit
```
User uploads: Sally-jung.jpg, Sally-heute.jpg, Jil-heute.jpg (kein Jil-jung)
System: 
- Sally → verwendet alters-spezifische Fotos
- Jil → verwendet Jil-heute für alle Szenen + Alters-Modifier
Result: Sally perfekt, Jil suboptimal
```

### Case 4: Falsche Labels
```
User uploads: Sally-xyz.jpg (kein Alters-Keyword)
System: Behandelt als "current" (Fallback)
Result: Funktioniert, aber nicht optimal
```

---

## Performance Considerations

### Storage:
- Mehr Fotos = mehr Supabase Storage
- Limit: 5 Fotos pro Charakter (young, middle, current + 2 Backup)
- Compression: Alle Fotos auf max 2MB komprimieren

### Database:
- Mehr Rows in `character_ref_image` Tabelle
- Index auf `(project_id, character_name, age_context)` für schnelle Lookups
- Cleanup: Alte Projekte nach 90 Tagen löschen

### Generation Time:
- Keine Änderung - gleiche Anzahl API-Calls
- Foto-Auswahl ist instant (nur Lookup)

---

## Future Enhancements

### 1. AI-basierte Alters-Erkennung
```javascript
// Automatisch Alter aus Foto erkennen
const detectedAge = await detectAgeFromPhoto(photoUrl);
// → "Diese Person ist ca. 25 Jahre alt"
```

### 2. Foto-Interpolation
```javascript
// Zwischen zwei Fotos interpolieren für mittleres Alter
const middlePhoto = await interpolatePhotos(youngPhoto, oldPhoto, targetAge);
// → Generiert synthetisches Foto für Alter 40
```

### 3. Alters-Timeline UI
```tsx
<Timeline>
  <Photo age={25} src="sally-jung.jpg" />
  <Photo age={40} src="auto-generated" />
  <Photo age={60} src="sally-heute.jpg" />
</Timeline>
```

### 4. Batch-Upload
```tsx
<button>Alle Fotos aus Ordner hochladen</button>
// → System erkennt automatisch Personen und Alter
```

---

## Success Metrics

### Qualitative:
- ✅ Charaktere sehen in allen Altersgruppen wie echte Person aus
- ✅ Konsistenz zwischen jung/alt ist erkennbar
- ✅ User-Feedback: "Das sieht wirklich aus wie ich damals!"

### Quantitative:
- 📊 % der User die mehrere Fotos hochladen
- 📊 Durchschnittliche Anzahl Fotos pro Charakter
- 📊 User-Ratings für Alters-Darstellung (1-5 Sterne)
- 📊 Anzahl Regenerationen wegen falscher Altersdarstellung

---

## Open Questions

1. **UI/UX:** Wie machen wir Upload von mehreren Fotos intuitiv?
   - Drag & Drop Zone?
   - Separate Slots?
   - Timeline-Interface?

2. **Label-Erkennung:** Automatisch oder manuell?
   - User wählt Alters-Kontext aus Dropdown?
   - System erkennt aus Dateinamen?
   - Hybrid?

3. **Foto-Limit:** Wie viele Fotos pro Charakter?
   - 2 (jung + heute)?
   - 3 (jung + middle + heute)?
   - Unbegrenzt?

4. **Pricing:** Mehr Fotos = mehr Storage Kosten
   - Limit für Free Tier?
   - Premium Feature?

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-05-02 | Hybrid System (Option C) | Backward compatible, best UX |
| TBD | Label Convention | TBD after user testing |
| TBD | Photo Limit | TBD based on storage costs |
| TBD | UI Design | TBD after mockups |

---

**Status:** 📋 SPECIFICATION COMPLETE  
**Next Step:** Review & Approval  
**Implementation:** TBD  
**Priority:** HIGH (solves major UX issue)

---

**Erstellt:** 2026-05-02  
**Autor:** Kiro AI + User Feedback  
**Version:** 1.0
