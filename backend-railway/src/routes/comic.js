const express = require("express");
const router = express.Router();
const OpenAI = require("openai");
const { saveImage, saveCharacterRefs, savePage, getCharacterRefs } = require("../lib/storage");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Shared comic style — identical for every page ─────────────────────────────
// Placed FIRST in every prompt — gpt-image-2 weights early instructions more heavily
const COMIC_STYLE = [
  "COMIC BOOK ILLUSTRATION STYLE — European graphic novel, similar to Blacksad or Bastien Vivès.",
  "Warm cinematic colors with golden tones and soft dramatic shadows.",
  "Bold but clean ink outlines, rich detailed colors, no harsh dark shadows.",
  "Expressive faces with clear emotions, detailed eyes and features.",
  "Realistic proportions — NOT manga, NOT anime, NOT cartoon exaggeration.",
  "Professional graphic novel quality, similar to the Strand/beach page style.",
  "ABSOLUTELY NOT photorealistic. NOT a photograph. NOT watercolor.",
  "Every page must look IDENTICAL in style to every other page.",
  "If this looks like a photo or manga/anime, it is WRONG.",
].join(" ");

const MOOD_MOD = {
  action:    "Dynamic poses, motion lines, high contrast colors.",
  emotional: "Warm golden tones, intimate close-ups, soft dramatic shadows.",
  humor:     "Exaggerated expressions, bright vivid colors, playful energy.",
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

Each panel shows a different angle/moment of the SAME scene.
Think cinematically: wide shot → close-up → reaction shot.

EMOTIONS: Show the CORRECT emotion.
- If someone falls/gets hurt → show pain, surprise, tears
- If reunion → joy, open arms
- If funny moment → laughter, surprise
- Do NOT make everyone smile if the scene is sad or tense

DIALOGS: Every panel needs dialog or narrator caption (10-15 words in ${lang}).

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
      console.log(`Analyzing photo — detecting which characters are visible...`);

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
                  { type: "text", text: `Describe the person who is approximately ${char.age} years old in this photo, for a comic artist. Focus on: hair color/texture/length, skin tone, eye color, distinctive features (beard, glasses, hijab etc), body type. Do NOT identify anyone. English, max 60 words. Start with "${char.name}:"` },
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

    // Primary reference URL (Supabase) > Base64 fallback
    const primaryRefUrl = referenceImageUrls[0]?.url || null;
    const primaryRefBase64 = referenceImages[0] || null;

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

    // Use user photo for cover — via URL (Supabase) or base64 fallback
    if (primaryRefUrl || primaryRefBase64) {
      try {
        let refFile;
        if (primaryRefUrl) {
          // Fetch from Supabase URL
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
          await saveCharacterRefs(projectId, characters, coverUrl || url);
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
    await saveCharacterRefs(projectId, characters, coverUrl || rawUrl);
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

CLOTHING — characters wear ${outfit} OVERRIDE any clothing visible in the reference photo.

PANELS:
${panelDescriptions}

RULES:
- Each panel shows a DIFFERENT scene/angle/moment
- Each character appears ONLY ONCE per panel — no duplicates
- Show CORRECT emotions per scene (sad=tears, funny=laughter, reunion=joy)
- Sharp detailed faces — eyes, nose, mouth clearly visible, front or 3/4 view
- Background crowd: faceless silhouettes only
- NO text, NO speech bubbles, NO letters, NO titles anywhere in image`;

    // Reference strategy:
    // - If ALL characters on this page are in the user photo → use cover as reference (consistent style)
    // - If ANY character is NOT in the photo (e.g. Opa, Oma) → use images.generate() with visual_anchors only
    //   Reason: images.edit() with cover/photo maps faces from the reference → Opa/Oma get replaced by Papa/Mama
    const pageCharNames = page.panels
      .flatMap(p => [p.speaker])
      .filter(Boolean)
      .map(n => (n || "").toLowerCase());

    const hasCharNotInPhoto = finalCharacters.some(c =>
      c.inPhoto === false &&
      (pageCharNames.some(n => n.includes(c.name.toLowerCase())) ||
       panelDescriptions.toLowerCase().includes(c.name.toLowerCase()))
    );

    let reference = null;
    let refSource = "none";

    if (hasCharNotInPhoto) {
      // Use user photo as STYLE reference only — for consistent art style
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
    } else if (coverImageUrl) {
      try {
        reference = await fetchBuffer(coverImageUrl);
        refSource = "cover";
      } catch (e) {
        console.warn("  → Cover fetch failed:", e.message);
      }
    }
    if (!reference && !hasCharNotInPhoto) {
      // Use URL if available, otherwise base64
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

    const refNote = refSource === "cover"
      ? `${COMIC_STYLE}\nUse the EXACT same art style, character designs and color palette as this cover image.\n\n`
      : refSource === "user-photo"
      ? `${COMIC_STYLE}\nThe people in this photo are the main characters. Draw them in the comic style above. NOT photorealistic. IMPORTANT: IGNORE the clothing from the photo — use the clothing described in the prompt instead.\n\n`
      : refSource === "user-photo-style"
      ? `${COMIC_STYLE}\nUse this photo ONLY for the art style and color palette — NOT for the faces. Draw ALL characters exactly as described in the character descriptions below. NOT photorealistic. IGNORE the clothing from the photo.\n\n`
      : `${COMIC_STYLE}\nDo NOT use soft watercolor or painterly style. Use the same sharp ink outlines and rich colors as a European graphic novel. Crisp, defined lines on every figure.\n\n`;

    console.log(`Generating page "${page.title}" (${panelCount} panels, ref: ${refSource})`);
    let { url: rawUrl, usedReference } = await generateImage(`${refNote}${prompt}`, reference);

    // If cover reference was blocked by safety filter → retry with user photo for style
    if (!usedReference && (refSource === "cover" || refSource === "generate-only") && (primaryRefUrl || primaryRefBase64)) {
      console.log(`  → Retrying with user photo for style consistency`);
      const userRef = primaryRefUrl ? await fetchBuffer(primaryRefUrl).catch(() => null) : primaryRefBase64;
      if (userRef) {
        const userRefNote = `${COMIC_STYLE}\nUse this photo ONLY for the art style and color palette. Draw ALL characters exactly as described below. NOT photorealistic. IGNORE clothing from photo.\n\n`;
        const result2 = await generateImage(`${userRefNote}${prompt}`, userRef);
        rawUrl = result2.url;
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

    // Save to memory
    const pageCharacters = page.panels.flatMap(p => p.speaker ? [p.speaker] : []).filter(Boolean);
    await savePage(
      projectId || page.id?.split("-")[0] || "unknown",
      page.pageNumber || 1,
      finalUrl,
      pageCharacters,
      refSource
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
