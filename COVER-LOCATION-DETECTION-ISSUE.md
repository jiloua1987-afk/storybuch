# Cover Location Detection Issue

**Date:** May 9, 2026  
**Status:** ❌ WRONG LOCATION DETECTED

## User Report

From test on May 9, 2026:
- ❌ Berge im Hintergrund auf Cover passt gar nicht

## Log Evidence

```
→ Story text preview: die überraschung: gemeinsamer besuch im indoorspielplatz, spielen, rutschen, spaß haben, pizza essen | die feier: feier im schrebergarten mit der familie...
→ Cover location: "mountain landscape"
```

**Expected:** Indoor playground or garden setting  
**Actual:** Mountain landscape

## Root Cause Analysis

### Location Extraction Logic

**File:** `backend-railway/src/routes/comic.js` (lines ~730-780)

```javascript
// Extract location from story context
let coverLocation = location || "";
if (!coverLocation && (storyInput || guidedAnswers.location || guidedAnswers.specialMoments)) {
  const storyText = `${storyInput} ${guidedAnswers.location || ""} ${guidedAnswers.specialMoments || ""}`.toLowerCase();
  
  // German cities
  if (storyText.includes("frankfurt")) coverLocation = "Frankfurt cityscape...";
  // ... more cities ...
  
  // Generic locations
  else if (storyText.includes("strand") || storyText.includes("beach")) 
    coverLocation = "beautiful beach with ocean";
  else if (storyText.includes("berg") || storyText.includes("mountain")) 
    coverLocation = "mountain landscape";
  else if (storyText.includes("park") || storyText.includes("garten")) 
    coverLocation = "park with trees and flowers";
  else 
    coverLocation = "beautiful park with trees and flowers";
}
```

### The Problem

**Story contained:**
- "indoorspielplatz" (indoor playground)
- "schrebergarten" (allotment garden)

**But system detected:** "mountain landscape"

**Why?**

1. **Keyword matching is too simplistic**
   - Checks for "berg" substring
   - "schrebergarten" contains "berg" → FALSE MATCH
   - "Schrebergarten" = allotment garden, NOT mountain

2. **Order of checks matters**
   - More specific locations should be checked FIRST
   - Generic locations should be checked LAST
   - Currently: cities → generic → fallback

3. **Missing specific location types**
   - No check for "indoorspielplatz" (indoor playground)
   - No check for "schrebergarten" (allotment garden)
   - No check for "spielplatz" (playground)

4. **Substring matching is dangerous**
   - "berg" matches: berg, schrebergarten, eisberg, hamburger, etc.
   - Need word boundary checks: `\bberg\b` not just `berg`

## Recommended Fixes

### Fix 1: Add Word Boundary Checks

```javascript
// Use regex with word boundaries instead of simple includes()
const hasWord = (text, word) => new RegExp(`\\b${word}\\b`, 'i').test(text);

// Then use:
if (hasWord(storyText, "berg") || hasWord(storyText, "mountain")) {
  coverLocation = "mountain landscape";
}
```

### Fix 2: Add Specific Location Types BEFORE Generic Ones

```javascript
// SPECIFIC LOCATIONS FIRST (before generic checks)
if (storyText.includes("indoorspielplatz") || storyText.includes("indoor playground"))
  coverLocation = "colorful indoor playground with slides and play equipment";
else if (storyText.includes("schrebergarten") || storyText.includes("allotment garden"))
  coverLocation = "cozy allotment garden with small garden house and vegetable beds";
else if (storyText.includes("spielplatz") || storyText.includes("playground"))
  coverLocation = "outdoor playground with swings and slides";
else if (storyText.includes("zoo") || storyText.includes("tierpark"))
  coverLocation = "zoo with animals and nature";
else if (storyText.includes("museum"))
  coverLocation = "museum interior with exhibits";
else if (storyText.includes("schwimmbad") || storyText.includes("swimming pool"))
  coverLocation = "swimming pool area";

// THEN generic locations with word boundaries
else if (hasWord(storyText, "berg") || hasWord(storyText, "mountain"))
  coverLocation = "mountain landscape";
else if (hasWord(storyText, "strand") || hasWord(storyText, "beach"))
  coverLocation = "beautiful beach with ocean";
// ... etc
```

### Fix 3: Use GPT for Location Extraction (Better Solution)

Instead of keyword matching, use GPT to extract location:

```javascript
// Use GPT-4o-mini to extract location from story
const locationPrompt = `Extract the main location/setting from this story in English. 
Return ONLY the location description, nothing else.

Story: ${storyText.substring(0, 500)}

Examples:
- "indoor playground"
- "allotment garden"
- "beach"
- "home living room"
- "park"

Location:`;

const locationRes = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: locationPrompt }],
  temperature: 0.3,
  max_tokens: 50,
});

const extractedLocation = locationRes.choices[0].message.content.trim();
console.log(`  → GPT extracted location: "${extractedLocation}"`);

// Then map to detailed description
const locationMap = {
  "indoor playground": "colorful indoor playground with slides, ball pit, and play equipment",
  "allotment garden": "cozy allotment garden with small garden house, vegetable beds, and flowers",
  "playground": "outdoor playground with swings, slides, and sandbox",
  "beach": "beautiful beach with ocean and sand",
  "park": "park with trees, flowers, and green grass",
  "home": "cozy home interior",
  "garden": "beautiful garden with flowers and trees",
  // ... etc
};

coverLocation = locationMap[extractedLocation.toLowerCase()] || extractedLocation;
```

## Implementation Priority

**Option A: Quick Fix (Keyword Improvement)**
- Add word boundary checks
- Add specific locations before generic ones
- Reorder checks: specific → generic → fallback
- **Time:** 15 minutes
- **Reliability:** 70% (still prone to edge cases)

**Option B: GPT Extraction (Robust Solution)**
- Use GPT-4o-mini to extract location
- Map to detailed descriptions
- **Time:** 30 minutes
- **Reliability:** 95% (much more robust)
- **Cost:** ~$0.0001 per cover (negligible)

## Recommended Approach

**Use Option B (GPT Extraction)** because:
1. More reliable - understands context, not just keywords
2. Handles compound words correctly (schrebergarten)
3. Handles typos and variations
4. Minimal cost increase
5. Future-proof - works for any location

## Files to Modify

- `backend-railway/src/routes/comic.js` (lines ~730-780 in `/api/comic/cover` endpoint)

## Testing

After fix, test with these stories:
1. "indoorspielplatz" → should detect "indoor playground"
2. "schrebergarten" → should detect "allotment garden" NOT "mountain"
3. "berg wandern" → should detect "mountain"
4. "hamburger essen" → should NOT detect "mountain" (contains "burger" not "berg")
5. "eisberg titanic" → should detect "ocean" or "ship" NOT "mountain"
