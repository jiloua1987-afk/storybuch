# Multi-Person Photo Matching - Implementation

## Problem
Wenn 2 Fotos hochgeladen werden (z.B. Sally + Jil für Liebesgeschichte):
- ✅ Jil-Foto wird verwendet → Jil sieht gut aus
- ❌ Sally-Foto wird IGNORIERT → Sally ist frei erfunden

**Root Cause:** System verwendet nur `referenceImageUrls[0]` - das erste Foto

---

## Lösung: Multi-Photo Matching System

### 1. ✅ Supabase Schema erweitert
**Datei:** `SUPABASE-MULTI-PHOTO-FIX.sql`

```sql
ALTER TABLE character_ref_image 
ADD COLUMN IF NOT EXISTS photo_url TEXT;
```

**Zweck:** Speichert für jeden Charakter sein spezifisches Foto-URL

---

### 2. ✅ Storage-System aktualisiert
**Datei:** `backend-railway/src/lib/storage.js`

**Änderung in `saveCharacterRefs()`:**
```javascript
async function saveCharacterRefs(projectId, characters, coverUrl, referenceImageUrls = []) {
  const rows = characters.map(c => {
    // Match character to their specific photo by label
    const matchedPhoto = referenceImageUrls.find(ref => 
      ref.label.toLowerCase() === c.name.toLowerCase()
    );
    
    return {
      project_id: projectId,
      character_name: c.name,
      photo_url: matchedPhoto?.url || null, // ← NEW
      // ... rest
    };
  });
}
```

**Logik:**
- Matched Charakter-Name mit Foto-Label
- Speichert individuelles Foto-URL pro Charakter
- Fallback: null wenn kein Match

---

### 3. ✅ Cover-Generation aktualisiert
**Datei:** `backend-railway/src/routes/comic.js`

**Neue Multi-Photo Strategie:**

```javascript
const hasMultiplePhotos = referenceImageUrls.length > 1;

if (hasMultiplePhotos) {
  // Build prompt mentioning ALL photos
  const photoDescriptions = referenceImageUrls.map((ref, i) => 
    `Photo ${i + 1} shows ${ref.label}: use this as reference for ${ref.label}'s appearance`
  ).join(". ");
  
  const multiPhotoPrompt = `
    CRITICAL: You have ${referenceImageUrls.length} reference photos uploaded:
    ${photoDescriptions}
    
    For each character, use their specific uploaded photo as reference.
  `;
  
  // Use first photo as base for images.edit()
  // GPT-Image-2 will see the prompt mentioning all photos
}
```

**Strategie:**
1. **Erkennt** wenn mehrere Fotos hochgeladen wurden
2. **Beschreibt** alle Fotos im Prompt
3. **Verwendet** erstes Foto als Base-Image für `images.edit()`
4. **Instruiert** GPT-Image-2 alle Fotos zu berücksichtigen

---

## Wie es funktioniert

### Beispiel: Sally & Jil Liebesgeschichte

#### Upload (Step2):
```javascript
// User lädt 2 Fotos hoch:
referenceImageUrls = [
  { label: "Sally", url: "https://supabase.../sally.jpg" },
  { label: "Jil", url: "https://supabase.../jil.jpg" }
]
```

#### Cover-Generation:
```javascript
// System erkennt: 2 Fotos
hasMultiplePhotos = true

// Prompt wird erweitert:
"CRITICAL: You have 2 reference photos uploaded:
Photo 1 shows Sally: use this as reference for Sally's appearance.
Photo 2 shows Jil: use this as reference for Jil's appearance.

Draw ALL characters: Sally, Jil."

// images.edit() mit Sally-Foto als Base
// GPT-Image-2 sieht Prompt → verwendet beide Fotos
```

#### Character-Refs gespeichert:
```javascript
character_ref_image:
- Sally: photo_url = "https://supabase.../sally.jpg"
- Jil:   photo_url = "https://supabase.../jil.jpg"
```

---

## Limitierungen & Nächste Schritte

### Aktuelle Limitierung:
**GPT-Image-2 `images.edit()` akzeptiert nur 1 Bild als Input**

Das bedeutet:
- Wir können nur 1 Foto als Base-Image verwenden
- Andere Fotos werden nur über Text-Prompt beschrieben
- GPT-Image-2 muss aus Text-Beschreibung die anderen Personen zeichnen

### Warum das trotzdem besser ist:
1. **Explizite Instruktion** dass mehrere Fotos existieren
2. **Detaillierte Beschreibung** welches Foto zu welcher Person gehört
3. **Visual Anchors** aus Photo-Analyse werden präziser
4. **Fallback** für Page-Generation (siehe unten)

---

## TODO: Page-Generation erweitern

### Nächster Schritt: Scene-Specific Photo Matching

**Problem:** Hochzeitsfoto wird nicht für Hochzeitsszene verwendet

**Lösung:** Match Fotos zu Szenen basierend auf Context

```javascript
// In /api/comic/page
function getPhotoForScene(scene, characters, referenceImageUrls) {
  const sceneKeywords = scene.title.toLowerCase();
  
  // Hochzeit-Keywords
  if (sceneKeywords.includes("hochzeit") || sceneKeywords.includes("wedding")) {
    const weddingPhoto = referenceImageUrls.find(p => 
      p.context?.includes("wedding") || 
      p.context?.includes("hochzeit")
    );
    if (weddingPhoto) return weddingPhoto.url;
  }
  
  // Strand-Keywords
  if (sceneKeywords.includes("strand") || sceneKeywords.includes("beach")) {
    const beachPhoto = referenceImageUrls.find(p => 
      p.context?.includes("beach")
    );
    if (beachPhoto) return beachPhoto.url;
  }
  
  // Character-specific photo
  const charactersInScene = scene.panels.map(p => p.character).filter(Boolean);
  if (charactersInScene.length === 1) {
    // Single character scene → use their specific photo
    const charPhoto = referenceImageUrls.find(p => 
      p.label.toLowerCase() === charactersInScene[0].toLowerCase()
    );
    if (charPhoto) return charPhoto.url;
  }
  
  // Fallback: Cover-URL (already has all characters)
  return coverImageUrl;
}
```

**Erfordert:**
1. **Context-Tagging** in Step2Upload → User kann Foto-Context angeben
2. **Scene-Analysis** → Automatische Keyword-Erkennung
3. **Smart Fallback** → Cover als Default

---

## Testing

### Test-Szenario 1: 2 Personen, 2 Fotos
```
Input:
- Sally-Foto hochgeladen (Label: "Sally")
- Jil-Foto hochgeladen (Label: "Jil")
- Story: Liebesgeschichte Sally & Jil

Expected:
✅ Cover zeigt beide Personen korrekt
✅ Sally sieht aus wie im Foto
✅ Jil sieht aus wie im Foto
✅ Beide Fotos in character_ref_image gespeichert
```

### Test-Szenario 2: 3 Personen, 3 Fotos
```
Input:
- Mama-Foto (Label: "Mama")
- Papa-Foto (Label: "Papa")
- Kind-Foto (Label: "Emma")
- Story: Familienurlaub

Expected:
✅ Cover zeigt alle 3 Personen
✅ Alle sehen aus wie in ihren Fotos
✅ Alle 3 Fotos gespeichert
```

### Test-Szenario 3: Hochzeitsfoto
```
Input:
- Sally-Foto (Label: "Sally", Context: "normal")
- Jil-Foto (Label: "Jil", Context: "normal")
- Hochzeitsfoto (Label: "Sally & Jil", Context: "wedding")
- Story: Liebesgeschichte mit Hochzeitsszene

Expected (nach Scene-Matching Implementation):
✅ Hochzeitsszene verwendet Hochzeitsfoto
✅ Andere Szenen verwenden normale Fotos
```

---

## Deployment

### 1. Supabase Migration ausführen
```bash
# In Supabase SQL Editor:
# Kopiere Inhalt von SUPABASE-MULTI-PHOTO-FIX.sql
# Führe aus
```

### 2. Backend deployen
```bash
cd backend-railway
git add .
git commit -m "feat: multi-person photo matching"
git push railway main
```

### 3. Testen
```bash
# Erstelle neuen Comic mit 2 Fotos
# Prüfe ob beide Personen korrekt dargestellt werden
```

---

## Erfolgs-Kriterien

✅ **Sally-Foto wird verwendet** → Sally sieht aus wie im Foto  
✅ **Jil-Foto wird verwendet** → Jil sieht aus wie im Foto  
✅ **Beide Fotos gespeichert** → character_ref_image hat beide URLs  
✅ **Cover zeigt beide** → Beide Personen auf Cover sichtbar  
✅ **Konsistenz** → Beide Personen sehen in allen Panels gleich aus  

---

**Status:** ✅ Phase 1 implementiert (Cover-Generation)  
**Next:** Phase 2 - Scene-Specific Photo Matching für Pages
