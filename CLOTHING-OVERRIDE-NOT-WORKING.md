# Clothing Override Not Working

**Date:** May 9, 2026  
**Status:** ❌ NOT WORKING - Characters wearing wrong/similar clothing

## User Report

From test on May 9, 2026:
- ❌ Klamotten von Kind sieht aus wie das von der Mutter
- Previous issues: "Klamotten zu ähnlich zu Cover", "Hochzeit mit falschen Klamotten"

## What Was Implemented

### 1. Enhanced getOutfit() Function
**File:** `backend-railway/src/routes/comic.js` (lines 84-115)

```javascript
function getOutfit(location = "", panelDescriptions = "") {
  const loc = location.toLowerCase();
  const desc = panelDescriptions.toLowerCase();
  const combined = `${loc} ${desc}`;
  
  // Wedding detection
  if (["wedding", "hochzeit", "heirat", "marriage", "bride", "groom", "ceremony"].some(k => loc.includes(k)))
    return "WEDDING ATTIRE — bride in white wedding dress with veil, groom in dark formal suit with tie. NO casual clothes, NO everyday outfits.";
  
  // Season detection
  const isWinter = ["winter", "schnee", "snow", "kalt", "cold", "weihnachten", "christmas", "skiing", "ski"].some(k => combined.includes(k));
  
  if (isWinter) {
    return "warm winter clothes — coats, jackets, sweaters, scarves, long trousers. NO t-shirts, NO shorts.";
  }
  
  // ... more outfit logic
}
```

### 2. Stronger CLOTHING Prompts
Changed from:
```
CLOTHING — characters wear X OVERRIDE
```

To:
```
CRITICAL CLOTHING RULES:
- DO NOT copy clothing from reference photo
- IGNORE any clothing visible in the reference photo
- Characters MUST wear: [outfit from getOutfit()]
```

### 3. Cover Clothing Fix
Added to cover prompts:
```
IGNORE the specific clothing from the photo — use stylish casual attire instead
```

### 4. Updated refNote Sections
Added "IGNORE clothing from cover" to all 3 cover reference variants.

## Why It's Still Not Working

### Problem 1: gpt-image-2 Weights Reference Image Too Heavily

**How gpt-image-2 works:**
```
Final Image = Base Generation + Reference Image Influence
```

When you provide a reference photo, the model tries to:
1. Match facial features ✅ (GOOD - this is what we want)
2. Match pose/body type ✅ (GOOD)
3. Match clothing ❌ (BAD - we want to override this)
4. Match background ❌ (BAD - we want scene-appropriate background)

**The issue:** Text prompts have LESS weight than visual reference image.

### Problem 2: Prompt Structure May Be Wrong

Current prompt structure:
```
COMIC_STYLE
Scene description
Characters with visual_anchor
CRITICAL CLOTHING RULES: ...
```

**Issue:** Clothing rules are at the END of prompt, after character descriptions.

**Better structure:**
```
COMIC_STYLE
CRITICAL CLOTHING RULES: ... (FIRST, before anything else)
Scene description
Characters with visual_anchor (WITHOUT clothing details)
```

### Problem 3: visual_anchor May Contain Clothing Details

When characters are described from photos, `visual_anchor` might include:
```
"woman with long brown hair, wearing blue shirt, friendly smile"
```

This REINFORCES the clothing from the photo, contradicting our override.

**Solution:** Strip clothing details from visual_anchor when using reference photos.

### Problem 4: Child and Mother Have Similar Clothing

**User report:** "Klamotten von Kind sieht aus wie das von der Mutter"

**Possible causes:**
1. Both characters use same reference photo (family photo)
2. Prompt doesn't specify DIFFERENT clothing for each character
3. Model defaults to similar clothing for family members

**Solution:** Add character-specific clothing instructions:
```
Character 1 (Mother): adult woman's outfit — [outfit description]
Character 2 (Child): child's outfit — [outfit description], DIFFERENT from mother
```

## Recommended Fixes

### Fix 1: Move CLOTHING Rules to TOP of Prompt

```javascript
// In gpt-image-2 prompt construction
const prompt = sanitizePrompt(`${COMIC_STYLE}

🚨 CRITICAL CLOTHING RULES (HIGHEST PRIORITY):
${outfit}
DO NOT copy any clothing from the reference photo.
IGNORE all clothing visible in reference images.
Each character MUST wear DIFFERENT clothing appropriate for their age and role.

Scene: ${szene}

Characters (match faces ONLY, NOT clothing):
${charDesc}

${refNote}
`);
```

### Fix 2: Strip Clothing from visual_anchor

```javascript
// When describing characters from photo, explicitly exclude clothing
const describePrompt = `Describe this person's FACE ONLY for illustration reference.
Include: facial features, hair color/style, age, skin tone, distinctive features.
EXCLUDE: clothing, accessories, background.

Format: "age X, [hair], [face shape], [distinctive features]"
`;
```

### Fix 3: Add Character-Specific Clothing

```javascript
// In panel generation, add clothing per character
const charDescWithClothing = characters.map((c, idx) => {
  const baseDesc = c.visual_anchor;
  const role = c.name.toLowerCase();
  
  // Determine character-specific outfit
  let charOutfit = "";
  if (role.includes("kind") || role.includes("child") || c.age < 12) {
    charOutfit = "child's outfit — colorful t-shirt and shorts/pants";
  } else if (role.includes("mutter") || role.includes("mother") || role.includes("mama")) {
    charOutfit = "adult woman's outfit — casual blouse and trousers";
  } else if (role.includes("vater") || role.includes("father") || role.includes("papa")) {
    charOutfit = "adult man's outfit — casual shirt and jeans";
  } else {
    charOutfit = outfit; // Use scene-based outfit
  }
  
  return `${c.name}: ${baseDesc}. CLOTHING: ${charOutfit}`;
}).join("\n");
```

### Fix 4: Use Negative Prompts (If Supported)

Check if gpt-image-2 supports negative prompts:
```javascript
const negativePrompt = "clothing from reference photo, same outfit as photo, identical clothing, matching outfits";
```

### Fix 5: Reduce Reference Image Influence (If Possible)

Check if gpt-image-2 has a parameter to control reference image strength:
```javascript
await openai.images.generate({
  model: "gpt-image-2",
  prompt: prompt,
  // ... other params
  reference_strength: 0.6, // Lower = less influence from reference (if this param exists)
});
```

## Testing Strategy

Create test cases with clear expected outcomes:

### Test 1: Family Photo with Different Clothing
- **Input:** Family photo (mother + child), scene = "playground"
- **Expected:** Mother in casual adult clothes, child in colorful kids clothes
- **Current:** Both wearing similar clothing

### Test 2: Wedding Scene
- **Input:** Couple photo, scene = "wedding ceremony"
- **Expected:** Bride in white dress, groom in suit
- **Current:** Casual clothing from photo

### Test 3: Winter Scene
- **Input:** Summer photo (t-shirts), scene = "winter snow"
- **Expected:** Winter coats, scarves
- **Current:** Summer clothing from photo

## Implementation Priority

1. **Fix 1 (Move clothing rules to top)** - 5 minutes, HIGH impact
2. **Fix 3 (Character-specific clothing)** - 15 minutes, HIGH impact
3. **Fix 2 (Strip clothing from visual_anchor)** - 20 minutes, MEDIUM impact
4. **Fix 4 (Negative prompts)** - 5 minutes, UNKNOWN impact (depends on API support)
5. **Fix 5 (Reference strength)** - 5 minutes, UNKNOWN impact (depends on API support)

## Files to Modify

- `backend-railway/src/routes/comic.js`
  - Lines 84-115: `getOutfit()` function
  - Lines 1260-1380: refNote sections
  - Panel generation prompts (multiple locations)

## Next Steps

1. **Check gpt-image-2 API documentation** for:
   - Negative prompt support
   - Reference image strength parameter
   - Best practices for clothing override

2. **Implement Fix 1 + Fix 3** (highest priority, proven techniques)

3. **Test with new comic generation**

4. **If still not working:** Consider alternative approaches:
   - Generate image WITHOUT reference, then use face-swap
   - Use different model for clothing-sensitive scenes
   - Post-process images to adjust clothing
