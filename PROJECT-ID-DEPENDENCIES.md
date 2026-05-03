# Project ID Dependencies - Critical Documentation

## ⚠️ CRITICAL: Project ID Must Be Unique Per Comic Generation

**Problem**: If multiple comic generations use the same `projectId`, they will load each other's images from Supabase, causing wrong characters to appear in pages.

**Solution**: Generate a unique `projectId` BEFORE any API calls and pass it to ALL endpoints.

---

## 1. Frontend: Project ID Generation

**Location**: `src/components/steps/Step4Generate.tsx`

```typescript
// ✅ CORRECT: Generate FIRST, before any API calls
const newProjectId = `proj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Clear old data immediately
updateProject({ chapters: [], coverImageUrl: undefined, id: newProjectId });

// Then pass to ALL API calls
await post("/api/comic/structure", { projectId: newProjectId, ... });
await post("/api/comic/cover", { projectId: newProjectId, ... });
await post("/api/comic/page", { projectId: newProjectId, ... });
```

**Why timestamp + random?**
- `Date.now()` alone is NOT enough (two users could start at same millisecond)
- Adding random string ensures uniqueness even with concurrent requests

---

## 2. Backend: Project ID Usage

### 2.1 Structure Endpoint
**Location**: `backend-railway/src/routes/comic.js` - `/api/comic/structure`

```javascript
router.post("/structure", async (req, res) => {
  const { projectId } = req.body;  // ✅ Receives projectId (not used, just for consistency)
  // ... generates pages and characters ...
  res.json({ pages, characters });
});
```

**Note**: Structure endpoint doesn't USE projectId, but receives it for consistency.

---

### 2.2 Cover Endpoint
**Location**: `backend-railway/src/routes/comic.js` - `/api/comic/cover`

```javascript
router.post("/cover", async (req, res) => {
  // ✅ CRITICAL: No fallback! Must come from frontend
  if (!req.body.projectId) {
    return res.status(400).json({ error: "projectId is required" });
  }
  
  // Save character references with projectId
  await saveCharacterRefs(req.body.projectId, characters, coverUrl, referenceImageUrls);
  
  res.json({ coverImageUrl, projectId: req.body.projectId });
});
```

**What it saves**:
- Character visual descriptions (`visual_anchor`)
- Cover URL
- Individual photo URLs (for individual photos mode)
- Stored in Supabase table: `character_ref_image`

**Why critical**: Pages will load these character_refs using projectId!

---

### 2.3 Page Endpoint
**Location**: `backend-railway/src/routes/comic.js` - `/api/comic/page`

```javascript
router.post("/page", async (req, res) => {
  const { projectId } = req.body;  // ✅ MUST come from frontend, no fallback
  
  // Load character_refs from Supabase if missing
  if (missingAnchors && projectId) {
    const refs = await getCharacterRefs(projectId);  // ← Uses projectId to load!
    // Enrich characters with visual_anchor from Supabase
  }
  
  // Save page with projectId
  await savePage(projectId, pageNumber, imageUrl, ...);
});
```

**What it loads**:
- Character visual descriptions from Supabase (if missing in request)
- Uses `projectId` to query: `SELECT * FROM character_ref_image WHERE project_id = ?`

**Why critical**: Wrong projectId → loads wrong character descriptions → wrong faces!

---

## 3. Supabase Storage

### 3.1 Character References Table
**Table**: `character_ref_image`

**Schema**:
```sql
CREATE TABLE character_ref_image (
  project_id TEXT NOT NULL,
  character_name TEXT NOT NULL,
  visual_anchor TEXT,
  cover_url TEXT,
  in_photo BOOLEAN,
  photo_url TEXT,
  PRIMARY KEY (project_id, character_name)
);
```

**Saved by**: Cover endpoint
**Loaded by**: Page endpoint

---

### 3.2 Page Images Table
**Table**: `last_page_image`

**Schema**:
```sql
CREATE TABLE last_page_image (
  project_id TEXT NOT NULL,
  page_number INTEGER NOT NULL,
  image_url TEXT,
  characters_present TEXT[],
  ref_source TEXT,
  quality_score INTEGER,
  PRIMARY KEY (project_id, page_number)
);
```

**Saved by**: Page endpoint
**Used for**: Quality tracking, regeneration

---

## 4. Individual Photos Mode - Cover as Reference

### How It Works:

1. **Frontend uploads 2 photos**: "Jil" and "Sally"
2. **Structure endpoint**: Describes each character from their photo
3. **Cover endpoint**: Creates composite image from both photos → saves as cover
4. **Page endpoint**: Uses cover as reference for ALL pages

### Why Cover is Used:

```javascript
// In page endpoint:
const hasCharNotInPhoto = finalCharacters.some(c => c.inPhoto === false);

// Individual photos mode: ALL characters have inPhoto: true
// → hasCharNotInPhoto = false
// → Cover is used as reference ✅
```

**Result**: All pages show consistent faces because they all reference the same cover.

---

## 5. Common Mistakes to Avoid

### ❌ WRONG: Generate projectId in backend
```javascript
// Backend
const projectId = req.body.projectId || `proj-${Date.now()}`;  // ❌ BAD!
```
**Problem**: Each endpoint generates different ID → character_refs saved under one ID, pages load under another ID.

### ❌ WRONG: Use page.id as fallback
```javascript
const projectId = req.body.projectId || page.id?.split("-")[0];  // ❌ BAD!
```
**Problem**: `page.id` is like "page-1" → `projectId = "page"` → loads wrong data!

### ❌ WRONG: Generate projectId after structure call
```javascript
// Frontend
await post("/api/comic/structure", { ... });  // No projectId yet
const newProjectId = `proj-${Date.now()}`;    // ❌ Too late!
await post("/api/comic/cover", { projectId: newProjectId, ... });
```
**Problem**: Structure doesn't know the projectId, inconsistent state.

---

## 6. Testing Checklist

Before deploying changes:

- [ ] Generate new comic with family photo → check pages show correct people
- [ ] Generate new comic with 2 individual photos → check pages show correct people
- [ ] Generate 2 comics back-to-back → check second comic doesn't show first comic's people
- [ ] Check Railway logs: `projectId` should be same across all endpoints for one comic
- [ ] Check Supabase: `character_ref_image` table should have unique `project_id` per comic

---

## 7. Debugging

### Check Railway Logs:
```
Individual photos mode: using 2 characters from frontend
✓ Characters: 2 (photoMode: individual)
✓ Saved 2 character refs for project proj-1777803414616-abc123def  ← Check this ID
Generating page "..." (3 panels, ref: cover)
  → Using cover as reference (all characters in photo)
```

### Check Supabase:
```sql
-- See all projects
SELECT DISTINCT project_id FROM character_ref_image ORDER BY project_id DESC LIMIT 10;

-- Check specific project
SELECT * FROM character_ref_image WHERE project_id = 'proj-1777803414616-abc123def';
```

---

## 8. Summary

**Golden Rule**: 
1. Generate `projectId` FIRST in frontend
2. Pass to ALL endpoints
3. NEVER use fallbacks in backend
4. One comic = One unique projectId = One set of character_refs

**Individual Photos Mode**:
- Cover is created from composite of all photos
- All pages use cover as reference
- Ensures consistent faces across all pages
