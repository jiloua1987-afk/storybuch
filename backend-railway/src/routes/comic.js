const express = require("express");
const router = express.Router();
const OpenAI = require("openai");
const { saveImage, saveCharacterRefs, savePage, getCharacterRefs } = require("../lib/storage");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Shared comic style — identical for every page ─────────────────────────────
// Placed FIRST in every prompt — gpt-image-2 weights early instructions more heavily
const COMIC_STYLE = [
  "EUROPEAN BANDE DESSINÉE ILLUSTRATION — Franco-Belgian comic book style, similar to Blacksad or Bastien Vivès.",
  "Bold clean ink outlines on every figure and object. Flat cel-shaded color areas, NOT photographic gradients.",
  "Warm cinematic colors: golden tones, rich shadows, vivid saturated hues.",
  "Expressive stylized faces — clearly drawn eyes, nose, mouth. NOT photographic faces.",
  "Realistic human proportions. Western comic book anatomy.",
  "STRICT PROHIBITION: NOT manga. NOT anime. NOT Japanese comic style. NOT big anime eyes. NOT speed lines.",
  "STRICT PROHIBITION: NOT photorealistic. NOT a photograph. NOT CGI render. NOT watercolor painting.",
  "This must look like a page printed in a European comic album — ink outlines visible on every edge.",
  "Every page in this comic MUST look identical in style. Consistent ink weight, color palette, and character design.",
].join(" ");

const MOOD_MOD = {
  action:    "Dynamic poses, motion lines, high contrast colors.",
  emotional: "Warm golden tones, intimate close-ups, soft dramatic shadows.",
  humor:     "Exaggerated expressions in WESTERN COMIC STYLE — wide smiles, raised eyebrows, open mouths. Bright vivid colors, playful energy. NO anime sweat drops, NO manga speed lines, NO chibi style, NO big sparkly eyes.",
};

// ── Outfit context from English location string ───────────────────────────────
function getOutfit(location = "") {
  const loc = location.toLowerCase();
  if (["beach", "sea", "pool", "shore", "coast", "swimming", "water"].some(k => loc.includes(k)))
    return "swimwear, swim shorts, light summer dresses, sandals. NO jeans, NO dark shirts.";
  if (["airport", "gate", "terminal", "departure", "arrival", "flight"].some(k => loc.includes(k)))
    return "comfortable travel clothes — casual shirts, jeans, sneakers, light jackets.";
  if (["restaurant", "wedding", "celebration", "party", "dinner", "theater"].some(k => loc.includes(k)))
    return "smart casual — dress shirts, blouses, nice trousers.";
  if (["courtyard", "garden", "yard", "terrace", "patio", "outdoor", "backyard"].some(k => loc.includes(k)))
    return "casual outdoor clothes — t-shirts, shorts, light trousers for warm weather.";
  if (["living room", "kitchen", "bedroom", "home", "house", "sofa", "couch"].some(k => loc.includes(k)))
    return "relaxed home clothes — t-shirts, comfortable trousers.";
  if (["bike", "bicycle", "playground", "sport", "race", "riding"].some(k => loc.includes(k)))
    return "casual sporty clothes — t-shirts, shorts, sneakers.";
  return "casual everyday clothes appropriate for the scene and warm weather.";
}

// ── Build image buffer from base64 ───────────────────────────────────────────
function toFile(base64, name = "reference.jpg") {
  const buf = Buffer.from(base64, "base64");
  const blob = new Blob([buf], { type: "image/jpeg" });
  return new File([blob], name, { type: "image/jpeg" });
}

// ── Fetch image buffer from URL ───────────────────────────────────────────────
async function fetchBuffer(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(25000) });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// ── Generate image — with or without reference ────────────────────────────────
// Returns { url, usedReference: boolean }
// Retries once after 15s on rate limit (429)
async function generateImage(prompt, referenceBase64OrBuffer = null, size = "1024x1536") {
  const attempt = async () => {
    if (referenceBase64OrBuffer) {
      try {
        let file;
        if (typeof referenceBase64OrBuffer === "string") {
          file = toFile(referenceBase64OrBuffer);
        } else {
          const blob = new Blob([referenceBase64OrBuffer], { type: "image/png" });
          file = new File([blob], "reference.png", { type: "image/png" });
        }
        const res = await openai.images.edit({
          model: "gpt-image-2", image: file, prompt, size, quality: "high",
        });
        const item = (res.data || [])[0];
        const url = item?.url || (item?.b64_json ? `data:image/png;base64,${item.b64_json}` : null);
        if (url) return { url, usedReference: true };
      } catch (e) {
        console.warn("  → images.edit() failed, falling back:", e.message);
      }
    }
    const res = await openai.images.generate({
      model: "gpt-image-2", prompt, n: 1, size, quality: "high",
    });
    const item = (res.data || [])[0];
    const url = item?.url || (item?.b64_json ? `data:image/png;base64,${item.b64_json}` : null);
    if (url) return { url, usedReference: false };
    throw new Error("No image returned");
  };

  try {
    return await attempt();
  } catch (e) {
    if (e?.status === 429 || e?.message?.includes("429") || e?.message?.includes("rate limit")) {
      console.warn("  → Rate limit hit, waiting 20s before retry...");
      await new Promise(r => setTimeout(r, 20000));
      return await attempt();
    }
    throw e;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/comic/structure
// Key change: each moment gets its OWN GPT call → guaranteed one page per moment
// ─────────────────────────────────────────────────────────────────────────────
router.post("/structure", async (req, res) => {
  try {
    const {
      storyInput, guidedAnswers = {}, tone, comicStyle, mustHaveSentences,
      language, category, numPages = 5, referenceImages = [], referenceImageUrls = [],
    } = req.body;

    // Primary reference: Supabase URLs (no size limit) > Base64 fallback
    const primaryRefUrl = referenceImageUrls[0]?.url || null;
    const primaryRefBase64 = referenceImages[0] || null;

    const langMap = { de: "German", en: "English", fr: "French", es: "Spanish" };
    const lang = langMap[language] || "German";

    const toneMap = {
      humorvoll: "humorous and light-hearted",
      kindgerecht: "warm and child-friendly",
      romantisch: "romantic and tender",
      biografisch: "nostalgic and personal",
      episch: "epic and adventurous",
    };
    const toneEn = toneMap[tone] || tone || "warm and personal";

    // Build story context (without specialMoments — handled separately)
    let storyCtx = storyInput || "";
    for (const [k, v] of Object.entries(guidedAnswers)) {
      if (v && k !== "category" && k !== "specialMoments") storyCtx += `\n${k}: ${v}`;
    }

    // Extract moments
    const momentsText = guidedAnswers.specialMoments || "";
    const momentsList = momentsText
      ? momentsText.split("|").map(m => m.trim()).filter(Boolean)
      : [];

    // Step 1: Extract characters (parallel with page structure)
    const charPromise = openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [{
        role: "system",
        content: `Extract ALL characters from the story. Include grandparents, parents, children, friends — everyone mentioned.
For each write a DETAILED visual description (40-50 words):
- Exact age, gender
- Hair: color, length, style
- Skin tone, eye color
- Distinctive features: beard, glasses, hijab, wrinkles — write "always wears/has [feature]"
- Body type

CRITICAL — HEIGHT AND SIZE FOR CHILDREN:
- Children under 5: "toddler, approximately 85-95cm tall" — always visibly much smaller than older children and adults
- Children 5-8: "young child, approximately 110-120cm tall" — clearly shorter than teenagers and adults
- Children 9-13: "child, approximately 130-145cm tall" — noticeably shorter than adults
- Teenagers 14-17: "teenager, approximately 160-170cm tall" — close to adult height
- ALWAYS add relative size: "visibly smaller than [older sibling/parent name]"
- Example: "Luca: 3-year-old boy, toddler, approximately 90cm tall, visibly much smaller than his 8-year-old sister Maria and half the height of adults"
- Size ratios MUST be maintained in every panel — a 3-year-old must never appear as tall as an 8-year-old

Respond ONLY with JSON: {"characters":[{"name":"Name","age":30,"visual_anchor":"DETAILED English description..."}]}`
      }, {
        role: "user", content: storyCtx,
      }],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    // Step 2: Structure pages
    // If moments provided → one GPT call PER moment (guaranteed mapping)
    // If no moments → one call for all pages
    let pageStructures = [];

    if (momentsList.length > 0) {
      console.log(`Structuring ${momentsList.length} moments individually...`);

      // One GPT call per moment — all parallel
      const pagePromises = momentsList.map((moment, i) =>
        openai.chat.completions.create({
          model: "gpt-4.1",
          messages: [{
            role: "system",
            content: `You create ONE comic book page for a personal comic in ${lang}.
Tone: ${toneEn}. Style: ${comicStyle}.

PANEL COUNT — choose based on the scene:
- 2 panels: one big moment, close emotional scene, single action (e.g. big hug, child's face reaction)
- 3 panels: scene with clear beginning → middle → end, or 1 wide + 2 small
- 4 panels: action sequence, multiple characters interacting, busy scene

Do NOT always choose 4. Match the panel count to the scene complexity.

Each panel MUST show a DIFFERENT angle/moment/action of the scene.
Think cinematically: wide shot → close-up → reaction shot → detail shot.

CRITICAL VARIETY RULES:
- Every panel = NEW camera angle + NEW story beat
- NEVER repeat the same ACTION in multiple panels
- If Panel 1 shows "character does X" → NO other panel may show "character does X"

GOOD EXAMPLE (varied actions):
Panel 1: Wide shot - Thomas enters with tall cake, family watches
Panel 2: Close-up - Thomas' worried face, sweat on forehead
Panel 3: Reaction - Felix laughing, pointing at cake
Panel 4: Detail - Oma's surprised expression, hands on cheeks

BAD EXAMPLE (repeated action):
Panel 1: Thomas carries cake
Panel 2: Thomas' face while carrying cake  
Panel 3: Thomas still carrying cake, wobbling
Panel 4: Thomas with cake from different angle
→ All panels show SAME ACTION (carrying cake), just different angles

RULE: Each panel must show a DIFFERENT action or moment, not just a different angle of the same action.

AVOID repetition: if panel 1 shows "family behind tree", panel 2 must NOT show "family behind tree" again.
Show PROGRESSION: beginning → middle → end, or cause → action → reaction.

EMOTIONS: Show the CORRECT emotion.
- If someone falls/gets hurt → show pain, surprise, tears
- If reunion → joy, open arms
- If funny moment → laughter, surprise
- Do NOT make everyone smile if the scene is sad or tense

DIALOGS: Every panel needs dialog or narrator caption (10-15 words in ${lang}).

CRITICAL — ONLY SHOW CHARACTERS PRESENT IN THIS SCENE:
- Read the scene description carefully. Only include characters explicitly mentioned in it.
- Do NOT add characters from the broader story who are not part of this specific moment.
- Example: if the scene is at an airport departure with Mama, Papa, Luca, Maria — do NOT add grandparents who are waiting in Tunisia.
- Each panel's "szene" must only reference characters who are physically present in that scene.
- A character can only be "speaker" if they appear in that panel's szene.

Respond ONLY with JSON:
{"id":"page${i + 1}","pageNumber":${i + 1},"title":"Short title in ${lang}","location":"English location description","timeOfDay":"daytime","panels":[{"nummer":1,"szene":"Specific English scene — what characters DO and FEEL","dialog":"${lang} dialog","speaker":"Name or null","bubble_type":"speech"}]}`
          }, {
            role: "user",
            content: `Scene to illustrate: ${moment}\n\nStory context: ${storyCtx}${mustHaveSentences ? `\nInclude somewhere: ${mustHaveSentences}` : ""}`,
          }],
          response_format: { type: "json_object" },
          temperature: 0.8,
        }).then(r => {
          const data = JSON.parse(r.choices[0].message.content || "{}");
          return { id: `page${i + 1}`, pageNumber: i + 1, ...data };
        }).catch(e => {
          console.error(`Page ${i + 1} structure failed:`, e.message);
          return { id: `page${i + 1}`, pageNumber: i + 1, title: `Moment ${i + 1}`, location: "", timeOfDay: "daytime", panels: [] };
        })
      );

      pageStructures = await Promise.all(pagePromises);
    } else {
      // No moments — single call for all pages
      const structRes = await openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [{
          role: "system",
          content: `Create a ${numPages}-page comic structure in ${lang}. Tone: ${toneEn}.
Each page: 2-5 panels. Vary panel count based on scene complexity.
Show correct emotions — not everyone smiles in every panel.
All characters must appear across the comic.
Respond ONLY with JSON: {"pages":[{"id":"page1","pageNumber":1,"title":"Title in ${lang}","location":"English location","timeOfDay":"afternoon","panels":[{"nummer":1,"szene":"English scene description","dialog":"${lang} dialog 10-15 words","speaker":"Name or null","bubble_type":"speech"}]}]}`
        }, {
          role: "user", content: storyCtx,
        }],
        response_format: { type: "json_object" },
        temperature: 0.85,
      });
      pageStructures = JSON.parse(structRes.choices[0].message.content || "{}").pages || [];
    }

    // Wait for characters
    const charRes = await charPromise;
    let characters = JSON.parse(charRes.choices[0].message.content || "{}").characters || [];

    // Enrich characters from reference photo
    // Step 1: Detect WHO is actually visible in the photo
    // Step 2: Only enrich characters that are in the photo — others get story-based visual_anchor
    if ((referenceImageUrls.length > 0 || referenceImages.length > 0) && characters.length > 0) {
      console.log(`Analyzing ${referenceImageUrls.length || referenceImages.length} photo(s) — detecting which characters are visible...`);

      // ── MULTI-PHOTO MODE: Analyze each photo separately ────────────────────
      if (referenceImageUrls.length > 1) {
        console.log(`  → Multi-photo mode: analyzing each photo individually`);
        
        characters = await Promise.all(characters.map(async (char) => {
          // Find photo matching this character's name
          const matchedPhoto = referenceImageUrls.find(ref => 
            ref.label.toLowerCase() === char.name.toLowerCase()
          );
          
          if (matchedPhoto) {
            console.log(`  → Analyzing ${matchedPhoto.label}'s photo...`);
            try {
              const refImageContent = { 
                type: "image_url", 
                image_url: { url: matchedPhoto.url, detail: "high" } 
              };
              
              const r = await openai.chat.completions.create({
                model: "gpt-4.1",
                messages: [{ role: "user", content: [
                  refImageContent,
                  { type: "text", text: `Describe ONLY what you can ACTUALLY SEE on the person in this photo (age approximately ${char.age} years old).

ULTRA-CRITICAL RULES — BE EXTREMELY ACCURATE:

HAIR COLOR — Look very carefully:
- Gray/silver/white hair → MUST say "gray hair", "silver hair", or "white hair"
- If hair looks light but person is 50+ years old → it's probably GRAY, not blonde
- Dark hair → say "dark brown" or "black"
- Light brown → say "light brown"
- Blonde (only if clearly golden/yellow AND person is young) → say "blonde"
- NEVER confuse gray hair with blonde hair!

HAIR LENGTH — Measure carefully:
- Very short (above ears) → say "very short hair"
- Short (covers ears) → say "short hair"  
- Shoulder-length → say "shoulder-length hair"
- Long (past shoulders) → say "long hair"
- NEVER say "long" if hair is short!

AGE INDICATORS:
- Person 50+ years old with light hair → almost always GRAY, not blonde
- Receding hairline → mention it
- Wrinkles, age lines → mention them

DOUBLE-CHECK EVERYTHING:
1. Look at hair color again — is it truly blonde or is it gray?
2. Look at hair length again — is it truly long or is it short?
3. Does your description match a person of age ${char.age}?

If you CANNOT see a feature clearly → DO NOT mention it.
Do NOT invent, assume, or guess ANY details.
Do NOT identify anyone.

Format: "${char.name}: [age] years old, [exact visible features]"
English, max 50 words.` },
                ]}],
                max_tokens: 120,
              });
              console.log(`  → ${char.name}: described from their photo`);
              return { ...char, visual_anchor: r.choices[0].message.content || char.visual_anchor, inPhoto: true };
            } catch (e) {
              console.error(`Photo description error for ${char.name}:`, e.message);
              return { ...char, inPhoto: false };
            }
          } else {
            // No photo for this character → generate from story
            try {
              const r = await openai.chat.completions.create({
                model: "gpt-4.1",
                messages: [{
                  role: "system",
                  content: `Create a detailed visual description for a comic book character based on their name, age, and story context. 
Write 40-50 words covering: exact age appearance, hair color/style, skin tone, eye color, distinctive features, body type.
This character is NOT in any reference photo — invent a realistic appearance consistent with their age and cultural background.
Respond with ONLY the description, starting with the character name.`,
                }, {
                  role: "user",
                  content: `Character: ${char.name}, age ${char.age}. Story context: ${storyCtx}`,
                }],
                max_tokens: 120,
              });
              console.log(`  → ${char.name}: generated from story (no photo provided)`);
              return { ...char, visual_anchor: r.choices[0].message.content || char.visual_anchor, inPhoto: false };
            } catch (e) {
              console.error(`Story generation error for ${char.name}:`, e.message);
              return char;
            }
          }
        }));
        
        console.log(`✓ Multi-photo analysis complete`);
      } else {
        // ── SINGLE PHOTO MODE: Original logic ──────────────────────────────────
        // Use URL if available, otherwise base64
        const refImageContent = primaryRefUrl
          ? { type: "image_url", image_url: { url: primaryRefUrl, detail: "high" } }
          : { type: "image_url", image_url: { url: `data:image/jpeg;base64,${primaryRefBase64}`, detail: "high" } };

        try {
          const detectionRes = await openai.chat.completions.create({
            model: "gpt-4.1",
            messages: [{ role: "user", content: [
              refImageContent,
              { type: "text", text: `This photo contains some of these characters: ${characters.map(c => `${c.name} (${c.age} years old)`).join(", ")}.
How many people are visible in this photo? Which of the listed characters are most likely shown based on their age?
Return JSON only: {"visible_count": 4, "likely_characters": ["Mama", "Papa", "Luca", "Maria"]}
Base your answer ONLY on ages and count of people visible. Do NOT identify anyone.` },
            ]}],
            response_format: { type: "json_object" },
            max_tokens: 100,
          });

          const detection = JSON.parse(detectionRes.choices[0].message.content || "{}");
          const likelyInPhoto = new Set((detection.likely_characters || []).map((n) => n.toLowerCase()));
          console.log(`  → Detected in photo: ${[...likelyInPhoto].join(", ")}`);

          characters = await Promise.all(characters.map(async (char) => {
            const inPhoto = likelyInPhoto.has(char.name.toLowerCase());

            if (inPhoto) {
              try {
                const r = await openai.chat.completions.create({
                  model: "gpt-4.1",
                  messages: [{ role: "user", content: [
                    refImageContent,
                    { type: "text", text: `Describe ONLY what you can ACTUALLY SEE on the person who is approximately ${char.age} years old in this photo.

ULTRA-CRITICAL RULES — BE EXTREMELY ACCURATE:

HAIR COLOR — Look very carefully:
- Gray/silver/white hair → MUST say "gray hair", "silver hair", or "white hair"
- If hair looks light but person is 50+ years old → it's probably GRAY, not blonde
- Dark hair → say "dark brown" or "black"
- Light brown → say "light brown"
- Blonde (only if clearly golden/yellow AND person is young) → say "blonde"
- NEVER confuse gray hair with blonde hair!

HAIR LENGTH — Measure carefully:
- Very short (above ears) → say "very short hair"
- Short (covers ears) → say "short hair"  
- Shoulder-length → say "shoulder-length hair"
- Long (past shoulders) → say "long hair"
- NEVER say "long" if hair is short!

AGE INDICATORS:
- Person 50+ years old with light hair → almost always GRAY, not blonde
- Receding hairline → mention it
- Wrinkles, age lines → mention them

DOUBLE-CHECK EVERYTHING:
1. Look at hair color again — is it truly blonde or is it gray?
2. Look at hair length again — is it truly long or is it short?
3. Does your description match a person of age ${char.age}?

If you CANNOT see a feature clearly → DO NOT mention it.
Do NOT invent, assume, or guess ANY details.
Do NOT identify anyone.

Format: "${char.name}: [age] years old, [exact visible features]"
English, max 50 words.` },
                  ]}],
                  max_tokens: 120,
                });
                console.log(`  → ${char.name}: described from photo`);
                return { ...char, visual_anchor: r.choices[0].message.content || char.visual_anchor, inPhoto: true };
              } catch (e) {
                console.error(`Photo description error for ${char.name}:`, e.message);
                return { ...char, inPhoto: true };
              }
            } else {
              // Character NOT in photo → generate visual_anchor from story description
              try {
                const r = await openai.chat.completions.create({
                  model: "gpt-4.1",
                  messages: [{
                    role: "system",
                    content: `Create a detailed visual description for a comic book character based on their name, age, and story context. 
Write 40-50 words covering: exact age appearance, hair color/style, skin tone, eye color, distinctive features, body type.
This character is NOT in any reference photo — invent a realistic appearance consistent with their age and cultural background.
Respond with ONLY the description, starting with the character name.`,
                  }, {
                    role: "user",
                    content: `Character: ${char.name}, age ${char.age}. Story context: ${storyCtx}`,
                  }],
                  max_tokens: 120,
                });
                console.log(`  → ${char.name}: generated from story (not in photo)`);
              return { ...char, visual_anchor: r.choices[0].message.content || char.visual_anchor, inPhoto: false };
            } catch (e) {
              console.error(`Story description error for ${char.name}:`, e.message);
              return { ...char, inPhoto: false };
            }
          }
        }));
      } catch (e) {
        console.error("Photo detection error:", e.message);
        // Fallback: use story-based anchors for all
      }
    }

    console.log(`✓ Structure: ${pageStructures.length} pages, ${characters.length} characters`);
    res.json({ pages: pageStructures, characters });
  } catch (err) {
    console.error("Structure error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/comic/cover
// Pure images.generate() — no user photo reference
// Reason: images.edit() with photo produces photorealistic results
// visual_anchors describe all characters precisely enough for recognition
// ─────────────────────────────────────────────────────────────────────────────
router.post("/cover", async (req, res) => {
  try {
    const { characters = [], location = "", referenceImages = [], referenceImageUrls = [] } = req.body;

    const charDesc = characters.map(c => `${c.name}: ${c.visual_anchor}`).join("\n");
    const charNames = characters.map(c => c.name).join(", ");

    const prompt = `${COMIC_STYLE}

Comic book COVER illustration.
ALL of these characters MUST be visible: ${charNames}.
Show them together in ${location || "a beautiful Mediterranean setting"}.

Characters (draw each one accurately):
${charDesc}

Composition: dynamic group shot, characters prominently in foreground, vivid illustrated background showing the story world. Some looking at viewer, some interacting with each other.
NO text, NO title, NO letters anywhere in the image.`;

    // ── MULTI-PHOTO STRATEGY ──────────────────────────────────────────────────
    // If multiple photos uploaded, use first photo as base, then describe others
    const hasMultiplePhotos = referenceImageUrls.length > 1 || referenceImages.length > 1;
    
    if (hasMultiplePhotos) {
      console.log(`  → Multi-photo mode: ${referenceImageUrls.length} photos`);
      
      // Build detailed prompt mentioning ALL photos
      const photoDescriptions = referenceImageUrls.map((ref, i) => 
        `Photo ${i + 1} shows ${ref.label}: use this as reference for ${ref.label}'s appearance`
      ).join(". ");
      
      const multiPhotoPrompt = `${COMIC_STYLE}

REDRAW everyone as hand-drawn comic book characters. This must look like a page from a printed comic book, NOT a photograph.
Bold ink outlines on every person. Flat cel-shaded colors. Expressive cartoon faces.

CRITICAL: You have ${referenceImageUrls.length} reference photos uploaded:
${photoDescriptions}

Draw ALL characters: ${charNames}.
Character descriptions: ${charDesc}

For each character, use their specific uploaded photo as reference for facial features, hair, skin tone, and overall appearance.
Setting: ${location || "a beautiful Mediterranean setting"}.
Composition: dynamic group shot, characters in foreground, vivid illustrated background.
NO text, NO title, NO letters anywhere in the image.`;

      // Use first photo as base image for images.edit()
      const primaryRefUrl = referenceImageUrls[0]?.url || null;
      const primaryRefBase64 = referenceImages[0] || null;
      
      if (primaryRefUrl || primaryRefBase64) {
        try {
          let refFile;
          if (primaryRefUrl) {
            const buf = await fetchBuffer(primaryRefUrl);
            const blob = new Blob([buf], { type: "image/jpeg" });
            refFile = new File([blob], "reference.jpg", { type: "image/jpeg" });
          } else {
            refFile = toFile(primaryRefBase64);
          }
          
          const res2 = await openai.images.edit({
            model: "gpt-image-2",
            image: refFile,
            prompt: multiPhotoPrompt,
            size: "1024x1536",
            quality: "high",
          });
          
          const item = (res2.data || [])[0];
          const url = item?.url || (item?.b64_json ? `data:image/png;base64,${item.b64_json}` : null);
          if (url) {
            const coverUrl = await saveImage(url, "covers", `cover-${Date.now()}`);
            const projectId = req.body.projectId || `proj-${Date.now()}`;
            await saveCharacterRefs(projectId, characters, coverUrl || url, referenceImageUrls);
            console.log("✓ Cover done (multi-photo mode)");
            return res.json({ coverImageUrl: coverUrl || url, projectId });
          }
        } catch (e) {
          console.warn("  → Cover with multi-photo failed:", e.message);
        }
      }
    }

    // ── SINGLE PHOTO STRATEGY (original logic) ────────────────────────────────
    const primaryRefUrl = referenceImageUrls[0]?.url || null;
    const primaryRefBase64 = referenceImages[0] || null;

    if (primaryRefUrl || primaryRefBase64) {
      try {
        let refFile;
        if (primaryRefUrl) {
          const buf = await fetchBuffer(primaryRefUrl);
          const blob = new Blob([buf], { type: "image/jpeg" });
          refFile = new File([blob], "reference.jpg", { type: "image/jpeg" });
        } else {
          refFile = toFile(primaryRefBase64);
        }
        const res2 = await openai.images.edit({
          model: "gpt-image-2",
          image: refFile,
          prompt: `${COMIC_STYLE}

REDRAW everyone in this photo as hand-drawn comic book characters. This must look like a page from a printed comic book, NOT a photograph or photo-manipulation.
Bold ink outlines on every person. Flat cel-shaded colors. Expressive cartoon faces. NO photographic lighting, NO realistic skin textures, NO photo-realistic details.
Draw ALL characters: ${charNames}.
For characters not in the photo, draw them from their description.
Setting: ${location || "a beautiful Mediterranean setting"}.
Character descriptions: ${charDesc}
Composition: dynamic group shot, characters in foreground, vivid illustrated background.
NO text, NO title, NO letters anywhere in the image.`,
          size: "1024x1536",
          quality: "high",
        });
        const item = (res2.data || [])[0];
        const url = item?.url || (item?.b64_json ? `data:image/png;base64,${item.b64_json}` : null);
        if (url) {
          const coverUrl = await saveImage(url, "covers", `cover-${Date.now()}`);
          const projectId = req.body.projectId || `proj-${Date.now()}`;
          await saveCharacterRefs(projectId, characters, coverUrl || url, referenceImageUrls);
          console.log("✓ Cover done (with user photo)");
          return res.json({ coverImageUrl: coverUrl || url, projectId });
        }
      } catch (e) {
        console.warn("  → Cover with photo failed:", e.message);
      }
    }

    // Fallback: generate without reference
    const { url: rawUrl } = await generateImage(prompt, null);
    const coverUrl = await saveImage(rawUrl, "covers", `cover-${Date.now()}`);
    const projectId = req.body.projectId || `proj-${Date.now()}`;
    await saveCharacterRefs(projectId, characters, coverUrl || rawUrl, referenceImageUrls);
    console.log("✓ Cover done (generate only)");
    res.json({ coverImageUrl: coverUrl || rawUrl, projectId });
  } catch (err) {
    console.error("Cover error:", err.message);
    res.status(500).json({ error: err.message, coverImageUrl: "" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/comic/page
// Reference priority: coverImageUrl (comic style) > userPhoto > none
// ─────────────────────────────────────────────────────────────────────────────
router.post("/page", async (req, res) => {
  try {
    const {
      page, characters = [], comicStyle = "emotional",
      referenceImages = [], referenceImageUrls = [], coverImageUrl = "",
      reillustrationNote = "", // ← Freitext-Anweisung vom User
    } = req.body;

    const projectId = req.body.projectId || page.id?.split("-")[0] || null;

    // Enrich characters with visual_anchors from Supabase if missing
    // This ensures regeneration works even if Store lost the data
    let enrichedCharacters = characters;
    const missingAnchors = characters.some(c => !c.visual_anchor || c.visual_anchor === c.role || c.visual_anchor === "Hauptfigur");
    if (missingAnchors && projectId) {
      try {
        const refs = await getCharacterRefs(projectId);
        if (refs.length > 0) {
          console.log(`  → Enriching ${refs.length} characters from Supabase`);
          enrichedCharacters = characters.map(c => {
            const ref = refs.find(r => r.character_name.toLowerCase() === c.name.toLowerCase());
            if (ref) return { ...c, visual_anchor: ref.visual_anchor || c.visual_anchor, inPhoto: ref.in_photo };
            return c;
          });
        }
      } catch (e) {
        console.warn("  → Supabase character enrichment failed:", e.message);
      }
    }
    const finalCharacters = enrichedCharacters;

    // Primary reference: Supabase URL > Base64 fallback
    const primaryRefUrl = referenceImageUrls[0]?.url || null;
    const primaryRefBase64 = referenceImages[0] || null;

    const mood = MOOD_MOD[comicStyle] || MOOD_MOD.emotional;
    const outfit = getOutfit(page.location);
    const panelCount = page.panels.length;
    const layoutDesc =
      panelCount <= 2 ? "2 equal panels" :
      panelCount === 3 ? "1 large panel top, 2 smaller panels bottom" :
      panelCount === 5 ? "2 panels top, 1 wide panel middle, 2 panels bottom" :
      "2×2 grid";

    const charAnchors = finalCharacters.map(c => `${c.name}: ${c.visual_anchor}`).join(". ");
    const panelDescriptions = page.panels
      .map(p => `Panel ${p.nummer}: ${p.szene}`)
      .join("\n");

    const prompt = `${COMIC_STYLE} ${mood}

Comic page — ${panelCount} panels in ${layoutDesc}. Bold black borders between panels.

CHARACTERS — draw identically across all panels:
${charAnchors}

CRITICAL: Draw characters EXACTLY as described above. Do NOT add features not mentioned (glasses, beard, mustache, jewelry, tattoos).
If a feature is not in the description, the character does NOT have it.

CRITICAL SIZE RULES — enforce in every panel:
- Children must be drawn at their correct height relative to adults
- A 3-year-old is approximately half the height of an adult — always visibly much smaller
- Never draw a young child as tall as an older child or adult
- Size ratios from character descriptions MUST be respected

CLOTHING — characters wear ${outfit} OVERRIDE any clothing visible in the reference photo.

PANELS:
${panelDescriptions}

RULES:
- Each panel shows a DIFFERENT scene/angle/moment
- Each character appears ONLY ONCE per panel — no duplicates
- Show CORRECT emotions per scene (sad=tears, funny=laughter, reunion=joy)
- Sharp detailed faces — eyes, nose, mouth clearly visible, front or 3/4 view
- Background crowd: faceless silhouettes only
- Movement/action: show with TILTED POSES and MOTION BLUR in Bande Dessinée style — NOT manga speed lines, NOT anime motion effects
- Exaggerated expressions: use WESTERN COMIC STYLE — wide mouths, raised eyebrows — NOT anime big eyes, NOT manga sweat drops
- NO text, NO speech bubbles, NO letters, NO titles anywhere in image${reillustrationNote ? `\n\nUSER CORRECTION: ${reillustrationNote}. Apply this change while keeping all other elements identical.` : ""}`;

    // ── REFERENCE STRATEGY ────────────────────────────────────────────────────
    // Priority:
    // 1. Cover (if all characters in photo) → best consistency
    // 2. Multi-photo mode (if multiple character photos) → use cover + character descriptions
    // 3. Single photo → use as style reference
    // 4. Generate only → no reference
    
    const pageCharNames = page.panels
      .flatMap(p => [p.speaker])
      .filter(Boolean)
      .map(n => (n || "").toLowerCase());

    const hasCharNotInPhoto = finalCharacters.some(c =>
      c.inPhoto === false &&
      (pageCharNames.some(n => n.includes(c.name.toLowerCase())) ||
       panelDescriptions.toLowerCase().includes(c.name.toLowerCase()))
    );

    // Check if this is a scene with many people (guests, crowd, etc.)
    const hasManyPeople = panelDescriptions.toLowerCase().includes("gäste") ||
                          panelDescriptions.toLowerCase().includes("guests") ||
                          panelDescriptions.toLowerCase().includes("crowd") ||
                          panelDescriptions.toLowerCase().includes("people") ||
                          panelDescriptions.toLowerCase().includes("viele");

    let reference = null;
    let refSource = "none";

    // ── STRATEGY 1: Cover (best for consistency) ──────────────────────────────
    if (coverImageUrl && !hasCharNotInPhoto) {
      try {
        reference = await fetchBuffer(coverImageUrl);
        refSource = "cover";
        console.log(`  → Using cover as reference (all characters in photo)`);
      } catch (e) {
        console.warn("  → Cover fetch failed:", e.message);
      }
    }

    // ── STRATEGY 2: Multi-photo mode (for scenes with many people) ────────────
    // CRITICAL: Even if scene has "many guests", main characters must stay consistent
    // Use cover as base reference to maintain character appearance
    if (!reference && hasManyPeople && coverImageUrl) {
      try {
        reference = await fetchBuffer(coverImageUrl);
        refSource = "cover-with-crowd";
        console.log(`  → Scene has many people, using cover to maintain character consistency`);
      } catch (e) {
        console.warn("  → Cover fetch for crowd scene failed:", e.message);
      }
    }

    // ── STRATEGY 3: Character not in photo → use photo as style reference ─────
    if (!reference && hasCharNotInPhoto) {
      // Use user photo as STYLE reference only
      // The prompt explicitly describes all characters including those not in photo
      if (primaryRefUrl) {
        try {
          reference = await fetchBuffer(primaryRefUrl);
          refSource = "user-photo-style";
        } catch (e) {
          console.warn("  → User photo fetch failed:", e.message);
        }
      }
      if (!reference && primaryRefBase64) {
        reference = primaryRefBase64;
        refSource = "user-photo-style";
      }
      if (!reference) refSource = "generate-only";
      console.log(`  → Page has non-photo characters, ref: ${refSource}`);
    }

    // ── STRATEGY 4: Fallback to user photo ────────────────────────────────────
    if (!reference) {
      if (primaryRefUrl) {
        try {
          reference = await fetchBuffer(primaryRefUrl);
          refSource = "user-photo";
        } catch (e) {
          console.warn("  → User photo URL fetch failed:", e.message);
        }
      }
      if (!reference && primaryRefBase64) {
        reference = primaryRefBase64;
        refSource = "user-photo";
      }
    }

    const refNote = refSource === "cover" || refSource === "cover-with-crowd"
      ? `${COMIC_STYLE}\nUse the EXACT same art style, character designs and color palette as this cover image.\nDraw the main characters (${finalCharacters.map(c => c.name).join(", ")}) EXACTLY as they appear in this cover.\n${hasManyPeople ? "Add background guests/crowd as faceless silhouettes or simple figures.\n" : ""}\n`
      : refSource === "user-photo"
      ? `${COMIC_STYLE}\nThe people in this photo are the main characters. Draw them in the comic style above. NOT photorealistic. IMPORTANT: IGNORE the clothing from the photo — use the clothing described in the prompt instead.\n\n`
      : refSource === "user-photo-style"
      ? `${COMIC_STYLE}\nUse this photo ONLY for the art style and color palette — NOT for the faces. Draw ALL characters exactly as described in the character descriptions below. NOT photorealistic. IGNORE the clothing from the photo.\n\n`
      : `${COMIC_STYLE}\nDraw in the style of a printed Franco-Belgian comic album (Bande Dessinée) — bold ink outlines, flat cel-shaded colors, stylized expressive faces. NOT manga. NOT anime. NOT photorealistic. Crisp defined ink lines on every figure, identical style to a Blacksad or Bastien Vivès page.\n\n`;

    console.log(`Generating page "${page.title}" (${panelCount} panels, ref: ${refSource})`);
    let { url: rawUrl, usedReference } = await generateImage(`${refNote}${prompt}`, reference);

    // If reference was blocked by safety filter → sanitize prompt and retry generate-only
    // The panel descriptions themselves may trigger safety (e.g. jubilation, shouting, children)
    // Sanitized prompt removes potentially triggering words while keeping the scene intent
    if (!usedReference) {
      console.log(`  → Safety block, retrying with sanitized prompt + generate-only`);
      const sanitizedPanelDescs = page.panels
        .map(p => `Panel ${p.nummer}: ${(p.szene || "")
          // Remove action/violence words
          .replace(/\b(shout|scream|yell|cry|hit|kick|fight|punch|grab|push|fall|hurt|pain|tears|crying|loud|aggressive)\b/gi, "")
          .replace(/\b(ruft|schreit|weint|schlägt|tritt|kämpft|fällt|laut|aggressiv)\b/gi, "")
          // Remove potentially sensitive words with children
          .replace(/\b(photo|photos|album|picture|pictures|image|images|memory|memories|secret|secrets|hidden)\b/gi, "")
          .replace(/\b(foto|fotos|album|bild|bilder|erinnerung|erinnerungen|geheim|geheime|versteckt)\b/gi, "")
          .trim()}`)
        .join("\n");

      const safePrompt = `${COMIC_STYLE} ${mood}

Comic page — ${panelCount} panels in ${layoutDesc}. Bold black borders between panels.

CHARACTERS — draw identically across all panels:
${charAnchors}

CRITICAL: Draw characters EXACTLY as described. Do NOT add features not mentioned (glasses, beard, mustache, jewelry).

CLOTHING — characters wear ${outfit}.

PANELS:
${sanitizedPanelDescs}

RULES:
- Each panel shows a DIFFERENT scene/angle/moment
- Each character appears ONLY ONCE per panel
- Expressive faces showing correct emotions for the scene
- Sharp detailed faces — eyes, nose, mouth clearly visible
- Movement/action: show with TILTED POSES and MOTION BLUR in Bande Dessinée style — NOT manga speed lines
- Exaggerated expressions: use WESTERN COMIC STYLE — NOT anime big eyes, NOT manga sweat drops
- NO text, NO speech bubbles, NO letters, NO titles anywhere in image${reillustrationNote ? `\n\nUSER CORRECTION: ${reillustrationNote}. Apply this change while keeping all other elements identical.` : ""}`;

      try {
        const result2 = await generateImage(`${COMIC_STYLE} ${mood}\n\n${safePrompt}`, null);
        rawUrl = result2.url;
      } catch (e2) {
        console.error(`  → Sanitized retry also failed:`, e2.message);
        // rawUrl stays as whatever was returned (may be empty)
      }
    }

    // ── Quality Score Check ─────────────────────────────────────────────────
    // Check if generated image matches Bande Dessinée style
    // If wrong style detected → retry once with stronger anti-manga prompt
    let qualityScore = 100; // Default: assume good
    let styleCheckPassed = true;

    if (rawUrl) {
      try {
        const styleCheck = await openai.chat.completions.create({
          model: "gpt-4.1",
          messages: [{ role: "user", content: [
            { type: "image_url", image_url: { url: rawUrl, detail: "low" } },
            { type: "text", text: `Is this image in European Bande Dessinée / Franco-Belgian comic book style?
(Bold ink outlines, flat cel-shaded colors, like Blacksad, Tintin, Bastien Vivès)

Or does it look like:
- Manga / anime (big eyes, speed lines, Japanese style)
- Photorealistic / photograph
- Watercolor / soft painting
- CGI render

Answer with ONE word only: "ok" (if Bande Dessinée) or "wrong" (if not)` }
          ]}],
          max_tokens: 5,
          temperature: 0.1,
        });

        const response = (styleCheck.choices[0].message.content || "").toLowerCase().trim();
        styleCheckPassed = response.includes("ok");

        if (!styleCheckPassed) {
          console.log(`  → Quality check FAILED (style: ${response}), retrying with stronger prompt`);
          qualityScore = 30; // Low score for failed check

          // Retry with ultra-strong anti-manga prompt
          const strongerPrompt = `${COMIC_STYLE}

ULTRA-CRITICAL STYLE ENFORCEMENT:
This image MUST be European Bande Dessinée / Franco-Belgian comic book style.
Think: Blacksad, Tintin, Bastien Vivès, Spirou, Lucky Luke.

MANDATORY FEATURES:
- Bold black ink outlines on EVERY figure and object
- Flat cel-shaded color areas (NOT gradients, NOT soft shading)
- Western comic book anatomy and proportions
- Expressive stylized faces (NOT photorealistic, NOT anime)

ABSOLUTE PROHIBITIONS:
- NOT manga (no speed lines, no big anime eyes, no Japanese style)
- NOT anime (no sparkles, no sweat drops, no chibi)
- NOT photorealistic (no photo-like skin, no realistic lighting)
- NOT watercolor (no soft edges, no paint texture)

${mood}

${prompt}`;

          try {
            const retry = await generateImage(strongerPrompt, reference);
            rawUrl = retry.url;
            qualityScore = 70; // Better score after retry
            console.log(`  → Retry completed with stronger prompt`);
          } catch (retryErr) {
            console.error(`  → Retry failed:`, retryErr.message);
            // Keep original image
          }
        } else {
          console.log(`  → Quality check PASSED`);
        }
      } catch (checkErr) {
        console.warn(`  → Quality check error:`, checkErr.message);
        // Continue without check
      }
    }

    const bookId = page.id?.split("-")[0] || `book-${Date.now()}`;
    const storedUrl = await saveImage(rawUrl, bookId, page.id || `page-${Date.now()}`);
    const finalUrl = storedUrl || rawUrl;

    // Panel position detection
    let panelPositions = null;
    try {
      const visionRes = await openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [{ role: "user", content: [
          { type: "image_url", image_url: { url: finalUrl, detail: "low" } },
          { type: "text", text: `Comic page with ${panelCount} panels. Return positions as % coordinates. JSON only: {"panels":[{"nummer":1,"top":5,"left":0,"width":100,"height":45}]}` },
        ]}],
        response_format: { type: "json_object" },
        max_tokens: 200, temperature: 0.1,
      });
      const posData = JSON.parse(visionRes.choices[0].message.content || "{}");
      if (posData.panels?.length > 0) panelPositions = posData.panels;
    } catch (e) {
      console.warn("  Panel detection failed:", e.message);
    }

    console.log(`✓ Page "${page.title}" done`);

    // Save to memory with quality score
    const pageCharacters = page.panels.flatMap(p => p.speaker ? [p.speaker] : []).filter(Boolean);
    await savePage(
      projectId || page.id?.split("-")[0] || "unknown",
      page.pageNumber || 1,
      finalUrl,
      pageCharacters,
      refSource,
      qualityScore
    );

    res.json({ imageUrl: finalUrl, panels: page.panels, panelPositions });
  } catch (err) {
    console.error("Page error:", err.message);
    res.status(500).json({ error: err.message, imageUrl: "", panels: [] });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/comic/ending
// ─────────────────────────────────────────────────────────────────────────────
router.post("/ending", async (req, res) => {
  try {
    const { storyInput, guidedAnswers = {}, tone, language, dedication, dedicationFrom } = req.body;
    const lang = { de: "German", en: "English", fr: "French", es: "Spanish" }[language] || "German";
    const toneMap = { humorvoll: "humorous and light-hearted", kindgerecht: "warm and child-friendly", romantisch: "romantic and tender", biografisch: "nostalgic and personal", episch: "epic and adventurous" };
    const toneEn = toneMap[tone] || "warm, personal, loving";

    const r = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [{
        role: "system",
        content: `Write a personal dedication for the last page of a comic book in ${lang}.
This is a DEDICATION — like handwritten on the last page of a gift.
- Max 2-3 short heartfelt sentences
- Address the main person(s) DIRECTLY
- Mention ONE concrete detail from the story
- Tone: ${toneEn}
- NO sender ("Von:", "Deine Familie") — that is shown separately
${dedicationFrom ? `Info: sender is "${dedicationFrom}" — do NOT write this in the dedication` : ""}`
      }, {
        role: "user",
        content: `Story: ${storyInput || ""}\n${Object.entries(guidedAnswers).filter(([k, v]) => v && k !== "category").map(([k, v]) => `${k}: ${v}`).join("\n")}${dedication ? `\nUser dedication: ${dedication}` : ""}`,
      }],
      max_tokens: 100, temperature: 0.8,
    });

    const endingText = r.choices[0].message.content || "";
    console.log(`✓ Ending generated`);
    res.json({ endingText, dedication: dedication || "", dedicationFrom: dedicationFrom || "" });
  } catch (err) {
    console.error("Ending error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
