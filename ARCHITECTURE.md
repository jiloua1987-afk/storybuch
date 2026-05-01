# MyComicStory — Architecture & Status Summary
*Stand: 1. Mai 2026*

## Overview

A web app that generates personalized comic books from user stories and family photos.
Users describe moments (e.g. "vacation in Tunisia with grandparents"), upload a family photo,
and the app generates a full comic book with consistent characters, speech bubbles, and a cover.

---

## Architecture

```
User (Browser / Vercel Frontend)
    ↓ Upload photo → /api/upload (Next.js API Route)
Supabase Storage (bucket: comic-panels)
    ↓ Returns persistent URL

User starts generation
    ↓ POST /api/comic/structure + /ending (parallel)
Railway Backend (Node.js Orchestrator)
    ↓ GPT-4.1: 1 call per story moment → page structure
    ↓ GPT-4.1: character extraction from story text
    ↓ GPT-4.1 Vision: photo analysis → who is in the photo?
    ↓ Characters with visual_anchors → Supabase character_ref_image table

    ↓ POST /api/comic/cover (sequential — must finish before pages)
    ↓ images.edit() with user photo → cover image
    ↓ Cover URL → Supabase

    ↓ POST /api/comic/page × N (batches of 3, parallel)
    ↓ Cover as reference (for characters in photo)
    ↓ User photo as style reference (for grandparents not in photo)
    ↓ Pages → Supabase last_page_image table
```

---

## Tech Stack

| Component | Technology | Purpose |
|---|---|---|
| Frontend | Next.js 15 / Vercel | Wizard, Preview, Speech bubbles |
| Backend | Node.js / Railway | Orchestration, prompts, API calls |
| Image generation | gpt-image-2 | Cover + comic pages |
| Text/Structure | GPT-4.1 | Story structure, character extraction |
| Storage | Supabase Storage | Photos, generated images |
| Database | Supabase PostgreSQL | character_ref_image, last_page_image |

---

## Prompt Strategy

```
COMIC_STYLE (constant, used everywhere):
"European graphic novel, similar to Blacksad or Bastien Vivès.
Warm cinematic colors, bold ink outlines, NOT photorealistic,
NOT manga, NOT anime. Every page IDENTICAL in style."

+ MOOD_MOD (per comicStyle: action / emotional / humor)
+ visual_anchors (per character, analyzed from photo)
+ outfit context (detected from page.location in English)
+ panel descriptions (from story moments)
```

---

## Key Design Decisions

### 1. One GPT call per story moment
Instead of asking GPT to generate all 7 pages at once (which caused mixing/skipping moments),
each moment gets its own GPT-4.1 call. This guarantees exactly one page per moment.

### 2. Photo analysis: who is in the photo?
GPT-4.1 Vision analyzes the uploaded family photo and determines which characters are visible
based on age and count. Characters IN the photo get visual_anchors from the photo.
Characters NOT in the photo (e.g. grandparents) get visual_anchors generated from the story description.

### 3. Reference image strategy per page
- Characters all in photo → use **cover** as images.edit() reference (consistent comic style)
- Page contains characters NOT in photo → use **user photo** as style-only reference
  (prompt explicitly says: "use photo for style only, draw characters from descriptions")
- Safety block (e.g. child falling) → retry with user photo as style reference
- All fallbacks → retry once after 20s on rate limit (429)

### 4. Cover generation
Cover uses images.edit() with user photo → faces recognizable but slightly photorealistic.
This is an intentional trade-off: realistic faces vs. pure comic style.
All subsequent pages use the cover as reference → consistent style across pages.

### 5. Supabase as memory
- `character_ref_image`: stores visual_anchors + cover_url + inPhoto flag per character
- `last_page_image`: stores each generated page with ref_source
- On regeneration: if visual_anchors missing from store → loaded from Supabase
- Supabase Storage: user photos stored as persistent URLs (no base64 in API calls)

---

## Open Challenges

### Style inconsistency
- **Cover**: images.edit() with user photo → slightly photorealistic
- **Pages with photo characters**: cover as reference → good comic style
- **Pages with grandparents**: user photo as style reference → sometimes watercolor-ish
- **Safety-blocked pages** (e.g. football/jubilation): fallback → sometimes manga style
- Root cause: images.edit() weights reference image heavily, text prompt is weakened

### Character consistency
- Papa/Mama look different across pages
- images.edit() interprets reference image slightly differently each call
- No mathematical face consistency (no face embeddings implemented)
- visual_anchors in prompt help but don't guarantee pixel-level consistency

### Speed
- ~12 minutes for 7 pages
- OpenAI Tier 1: max 5 images/minute, 1 concurrent request
- Cover is sequential → blocks page generation start
- Would improve significantly at Tier 2 ($50+ loaded)

### Clothing
- detectOutfitContext() works for beach/airport/garden/home
- No memory across pages (outfit_state table not yet implemented)
- Characters sometimes wear same clothes in different contexts

---

## Supabase Schema

```sql
-- Character references (visual descriptions + cover URL)
CREATE TABLE character_ref_image (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  character_name TEXT NOT NULL,
  character_age INT,
  visual_anchor TEXT,
  cover_url TEXT,
  in_photo BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Generated pages with quality tracking
CREATE TABLE last_page_image (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  page_number INT NOT NULL,
  image_url TEXT NOT NULL,
  characters_present TEXT[],
  quality_score INT DEFAULT 0,
  ref_source TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id, page_number)
);
```

---

## What Works Well

- All 7 story moments become separate pages ✅
- Grandparents appear correctly (generated from story description) ✅
- Cover shows all 6 characters including grandparents ✅
- Speech bubbles: add, delete, drag, resize, edit speaker ✅
- Supabase: photos, cover, pages, visual_anchors stored ✅
- Retry on rate limit (429) ✅
- visual_anchors loaded from Supabase on regeneration ✅
- Outfit context detection (beach/airport/garden/home) ✅
- Title above page (not in image) ✅
- Consistent 2:3 aspect ratio across all pages ✅

---

## Next Steps (Prioritized)

1. **Style consistency**: Replace Blacksad reference if football page still manga-style after current fix
2. **outfit_state table**: Remember clothing per character per context across pages
3. **Quality score**: GPT-4o Vision check after each page, retry if score < 70
4. **UI/UX redesign**: Cleaner wizard (less emojis, more whitespace)
5. **OpenAI Tier 2**: Load $50+ for faster generation (5 IPM → 50 IPM)
