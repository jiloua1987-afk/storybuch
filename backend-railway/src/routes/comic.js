const express = require("express");
const router = express.Router();
const OpenAI = require("openai");
const { saveImage } = require("../lib/storage");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Shared comic style — identical for every page ─────────────────────────────
// Placed FIRST in every prompt — gpt-image-2 weights early instructions more heavily
const COMIC_STYLE = [
  "COMIC BOOK ILLUSTRATION STYLE — European graphic novel, similar to Blacksad or Bastien Vivès.",
  "Bold black ink outlines on every figure and object.",
  "Rich detailed colors with dramatic lighting — warm shadows, cinematic depth.",
  "Expressive faces with clear emotions, detailed eyes and features.",
  "Clean panel composition, professional graphic novel quality.",
  "ABSOLUTELY NOT photorealistic. NOT a photograph. NOT a painting. NOT watercolor.",
  "Every page must look IDENTICAL in style to every other page.",
  "If this looks like a photo or a picture book, it is WRONG.",
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
async function generateImage(prompt, referenceBase64OrBuffer = null, size = "1024x1536") {
  if (referenceBase64OrBuffer) {
    try {
      let file;
      if (typeof referenceBase64OrBuffer === "string") {
        file = toFile(referenceBase64OrBuffer);
      } else {
        // Buffer (e.g. from cover URL)
        const blob = new Blob([referenceBase64OrBuffer], { type: "image/png" });
        file = new File([blob], "reference.png", { type: "image/png" });
      }
      const res = await openai.images.edit({
        model: "gpt-image-2", image: file, prompt, size, quality: "high",
      });
      const item = (res.data || [])[0];
      if (item?.url) return item.url;
      if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`;
    } catch (e) {
      console.warn("  → images.edit() failed, falling back:", e.message);
    }
  }
  const res = await openai.images.generate({
    model: "gpt-image-2", prompt, n: 1, size, quality: "high",
  });
  const item = (res.data || [])[0];
  if (item?.url) return item.url;
  if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`;
  throw new Error("No image returned");
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/comic/structure
// Key change: each moment gets its OWN GPT call → guaranteed one page per moment
// ─────────────────────────────────────────────────────────────────────────────
router.post("/structure", async (req, res) => {
  try {
    const {
      storyInput, guidedAnswers = {}, tone, comicStyle, mustHaveSentences,
      language, category, numPages = 5, referenceImages = [],
    } = req.body;

    const langMap = { de: "German", en: "English", fr: "French", es: "Spanish" };
    const lang = langMap[language] || "German";

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
Tone: ${tone}. Style: ${comicStyle}.

Create 2-4 panels for this SINGLE scene. Each panel shows a different angle/moment of the SAME scene.
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
          content: `Create a ${numPages}-page comic structure in ${lang}. Tone: ${tone}.
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

    // Enrich character descriptions from reference photos
    if (referenceImages.length > 0) {
      console.log(`Analyzing ${referenceImages.length} reference photo(s)...`);
      characters = await Promise.all(characters.map(async (char, i) => {
        const ref = referenceImages[i] || referenceImages[0];
        if (!ref) return char;
        try {
          const r = await openai.chat.completions.create({
            model: "gpt-4.1",
            messages: [{ role: "user", content: [
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${ref}`, detail: "high" } },
              { type: "text", text: `Describe this person for a comic artist. Age, hair color/texture/length, skin tone, eye color, distinctive features (beard, glasses, hijab etc), body type. Do NOT identify anyone. English, max 60 words. Start with "${char.name}:"` },
            ]}],
            max_tokens: 120,
          });
          return { ...char, visual_anchor: r.choices[0].message.content || char.visual_anchor };
        } catch (e) {
          console.error("Photo analysis error:", e.message);
          return char;
        }
      }));
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
// Uses user photo via images.edit() for face likeness
// ─────────────────────────────────────────────────────────────────────────────
router.post("/cover", async (req, res) => {
  try {
    const { characters = [], location = "", referenceImages = [] } = req.body;

    const charDesc = characters.map(c => `${c.name} (${c.visual_anchor})`).join("; ");
    const charNames = characters.map(c => c.name).join(", ");
    const prompt = `${COMIC_STYLE}

Comic book COVER illustration.
ALL of these characters MUST be visible: ${charNames}.
Show them together in ${location || "a beautiful setting"}.
Characters: ${charDesc || "a family"}
Dynamic group composition — some looking at viewer, some interacting.
Vivid background showing the story world. NO text, NO title, NO letters.`;

    let rawUrl = "";
    if (referenceImages[0]) {
      try {
        rawUrl = await generateImage(
          `${COMIC_STYLE}\n\nComic book COVER. The people in this photo are SOME of the characters. Draw ALL characters listed below — including those NOT in the photo.\nALL characters MUST appear: ${charNames}.\nCharacters: ${charDesc}\nSetting: ${location || "a beautiful setting"}.\nNO text, NO title, NO letters.`,
          referenceImages[0]
        );
        console.log("  → Cover with user photo");
      } catch (e) {
        console.warn("  → Cover photo failed:", e.message);
      }
    }
    if (!rawUrl) rawUrl = await generateImage(prompt, null);

    const coverUrl = await saveImage(rawUrl, "covers", `cover-${Date.now()}`);
    console.log("✓ Cover done");
    res.json({ coverImageUrl: coverUrl || rawUrl });
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
      referenceImages = [], coverImageUrl = "",
    } = req.body;

    const mood = MOOD_MOD[comicStyle] || MOOD_MOD.emotional;
    const outfit = getOutfit(page.location);
    const panelCount = page.panels.length;
    const layoutDesc =
      panelCount <= 2 ? "2 equal panels" :
      panelCount === 3 ? "1 large panel top, 2 smaller panels bottom" :
      panelCount === 5 ? "2 panels top, 1 wide panel middle, 2 panels bottom" :
      "2×2 grid";

    const charAnchors = characters.map(c => `${c.name}: ${c.visual_anchor}`).join(". ");
    const panelDescriptions = page.panels
      .map(p => `Panel ${p.nummer}: ${p.szene}`)
      .join("\n");

    const prompt = `${COMIC_STYLE} ${mood}

Comic page — ${panelCount} panels in ${layoutDesc}. Bold black borders between panels.

CHARACTERS — draw identically across all panels:
${charAnchors}

CLOTHING — ${outfit}

PANELS:
${panelDescriptions}

RULES:
- Each panel shows a DIFFERENT scene/angle/moment
- Each character appears ONLY ONCE per panel — no duplicates
- Show CORRECT emotions per scene (sad=tears, funny=laughter, reunion=joy)
- Sharp detailed faces — eyes, nose, mouth clearly visible, front or 3/4 view
- Background crowd: faceless silhouettes only
- NO text, NO speech bubbles, NO letters, NO titles anywhere in image`;

    // Reference: cover buffer (already in comic style) > user photo > none
    let reference = null;
    let refSource = "none";

    if (coverImageUrl) {
      try {
        reference = await fetchBuffer(coverImageUrl);
        refSource = "cover";
      } catch (e) {
        console.warn("  → Cover fetch failed:", e.message);
      }
    }
    if (!reference && referenceImages[0]) {
      reference = referenceImages[0]; // base64 string
      refSource = "user-photo";
    }

    const refNote = refSource === "cover"
      ? `${COMIC_STYLE}\nUse the EXACT same art style, character designs and color palette as this cover image.\n\n`
      : refSource === "user-photo"
      ? `${COMIC_STYLE}\nThe people in this photo are the main characters. Draw them in the comic style above. NOT photorealistic.\n\n`
      : "";

    console.log(`Generating page "${page.title}" (${panelCount} panels, ref: ${refSource})`);
    const rawUrl = await generateImage(`${refNote}${prompt}`, reference);

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

    const r = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [{
        role: "system",
        content: `Write a personal dedication for the last page of a comic book in ${lang}.
This is a DEDICATION — like handwritten on the last page of a gift.
- Max 2-3 short heartfelt sentences
- Address the main person(s) DIRECTLY
- Mention ONE concrete detail from the story
- Tone: ${tone || "warm, personal, loving"}
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
