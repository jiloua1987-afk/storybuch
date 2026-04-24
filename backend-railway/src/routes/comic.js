const express = require("express");
const router = express.Router();
const OpenAI = require("openai");
const sharp = require("sharp");
const { saveImage } = require("../lib/storage");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Constants ─────────────────────────────────────────────────────────────────
const CATEGORY_MOOD = {
  familie:   "warm sunny family atmosphere, joyful children, cozy family moments",
  urlaub:    "bright Mediterranean vacation, turquoise sea, golden sand, holiday joy",
  liebe:     "romantic golden light, intimate couple moments, tender gestures",
  feier:     "festive celebration atmosphere, colorful decorations, happy group",
  biografie: "nostalgic warm atmosphere, timeless settings, life journey",
  freunde:   "fun friendship moments, laughter, shared adventures",
  sonstiges: "warm personal atmosphere, emotional storytelling",
};

const COMIC_STYLE_MOD = {
  action:    "dynamic poses, motion lines, exaggerated expressions, high energy",
  emotional: "tender close-ups, soft warm lighting, emotional facial expressions",
  humor:     "exaggerated funny reactions, comedic timing, playful body language",
};

// ── POST /api/comic/structure ─────────────────────────────────────────────────
router.post("/structure", async (req, res) => {
  try {
    const { storyInput, guidedAnswers = {}, tone, comicStyle, mustHaveSentences,
      language, category, numPages = 4, referenceImages = [] } = req.body;

    const langMap = { de: "German", en: "English", fr: "French", es: "Spanish" };
    const lang = langMap[language] || "German";
    const mood = CATEGORY_MOOD[category] || CATEGORY_MOOD.familie;
    const comicMod = COMIC_STYLE_MOD[comicStyle] || COMIC_STYLE_MOD.emotional;

    let ctx = storyInput || "";
    for (const [k, v] of Object.entries(guidedAnswers)) {
      if (v && k !== "category") ctx += `\n${k}: ${v}`;
    }

    const [structRes, charRes] = await Promise.all([
      openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `You are a comic book author. Create a ${numPages}-page comic structure in ${lang}.
Tone: ${tone}. Visual mood: ${mood}. Comic style: ${comicMod}.
${mustHaveSentences ? `MUST include: ${mustHaveSentences}` : ""}
Vary panel count: Page 1: 4 panels, Page 2: 3 panels, Page 3: 5 panels, Page 4: 4 panels.
Each panel scene must work as a STANDALONE image prompt — describe the complete scene.
Respond ONLY with JSON: {"pages": [{"id":"page1","pageNumber":1,"title":"Title in ${lang}","location":"English location","timeOfDay":"afternoon","panels":[{"nummer":1,"szene":"Specific English scene for SINGLE IMAGE generation","dialog":"Short ${lang} dialog max 8 words","speaker":"Name or null","bubble_type":"speech"}]}]}` },
          { role: "user", content: ctx },
        ],
        response_format: { type: "json_object" },
        temperature: 0.85,
      }),
      openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `Extract main characters. Respond ONLY with JSON: {"characters":[{"name":"Name","age":30,"visual_anchor":"Precise English: age, hair color/style, eye color, skin tone, clothing, features. Max 30 words."}]}` },
          { role: "user", content: ctx },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      }),
    ]);

    const pages = JSON.parse(structRes.choices[0].message.content || "{}").pages || [];
    let characters = JSON.parse(charRes.choices[0].message.content || "{}").characters || [];

    // Analyze reference photos
    if (referenceImages.length > 0) {
      console.log(`Analyzing ${referenceImages.length} reference photo(s)...`);
      characters = await Promise.all(characters.map(async (char, i) => {
        const ref = referenceImages[i] || referenceImages[0];
        if (!ref) return char;
        try {
          const r = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: [
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${ref}`, detail: "high" } },
              { type: "text", text: `Describe the visual appearance of the person for a comic artist. Focus ONLY on: approximate age, hair color/texture, skin tone, clothing colors. Do NOT identify anyone. English, max 60 words. Start with "Person ${i+1} (${char.name}):"` },
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

    // Character Reference Sheet
    let characterSheetUrl = null;
    if (characters.length > 0) {
      try {
        console.log("Generating character reference sheet...");
        const sheetRes = await openai.images.generate({
          model: "gpt-image-1",
          prompt: `Character reference sheet showing all characters standing side by side, full body view, neutral background.
Characters: ${characters.map(c => `${c.name}: ${c.visual_anchor}`).join(". ")}.
Style: warm watercolor comic illustration, high quality.
Show each character clearly from head to toe. NO text, NO labels.`,
          n: 1, size: "1536x1024", quality: "high",
        });
        const item = (sheetRes.data || [])[0];
        let sheetRaw = item?.url || "";
        if (!sheetRaw && item?.b64_json) {
          const buf = Buffer.from(item.b64_json, "base64");
          const small = await sharp(buf).resize(800, null).jpeg({ quality: 85 }).toBuffer();
          sheetRaw = `data:image/jpeg;base64,${small.toString("base64")}`;
        }
        if (sheetRaw) {
          const bookId = `book-${Date.now()}`;
          characterSheetUrl = await saveImage(sheetRaw, bookId, "character-sheet") || sheetRaw;
          console.log("✓ Character sheet saved");
        }
      } catch (e) {
        console.error("Character sheet error:", e.message);
      }
    }

    if (characterSheetUrl) {
      characters = characters.map(c => ({ ...c, characterSheetUrl }));
    }

    res.json({ pages, characters });
  } catch (err) {
    console.error("Structure error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/comic/page ──────────────────────────────────────────────────────
// Generates raw image — NO text overlay, NO SVG compositing
// Text is rendered in frontend via CSS overlays
router.post("/page", async (req, res) => {
  try {
    const { page, characters = [], comicStyle = "emotional", category = "familie" } = req.body;

    const comicMod = COMIC_STYLE_MOD[comicStyle] || COMIC_STYLE_MOD.emotional;
    const mood = CATEGORY_MOOD[category] || CATEGORY_MOOD.familie;
    const charAnchors = characters.map(c => `${c.name}: ${c.visual_anchor}`).join("\n");

    const scenes = page.panels.map(p => `Panel ${p.nummer}: ${p.szene}`).join("\n");

    const fullPrompt = `CRITICAL INSTRUCTION — VISUAL CONSISTENCY:
All characters must appear IDENTICAL across every single image in this series.
Maintain with absolute precision:
- Same face: identical facial structure, eyes, nose, mouth, skin tone
- Same hair: exact color, length, texture, style — no variations
- Same body: proportions, height ratios between characters
- Same clothing: identical colors, patterns, style
Treat every image as a frame from the same animated film.

CHARACTER DEFINITIONS (NEVER deviate):
${charAnchors || "Characters as described in the scene."}

ART STYLE: warm watercolor comic illustration, rich colors, cinematic warm lighting, professional quality, ${comicMod}, ${mood}.
ABSOLUTE RULE: NO text, NO letters, NO words, NO speech bubbles, NO captions, NO UI elements anywhere in the image. Pure illustration only.
Leave approximately 25% empty/lighter space at top-left corner for caption overlay.

COMIC PAGE LAYOUT:
Create a single A4 portrait comic page with ${page.panels.length} panels.
${page.panels.length <= 3 ? "Layout: 1 wide panel top, 2 panels bottom" : page.panels.length === 5 ? "Layout: 2 panels top, 1 wide middle, 2 panels bottom" : "Layout: 2x2 grid"}
Clean black borders between panels. Cream background (#F5EDE0) outside panels.

SCENES:
${scenes}

ENVIRONMENT: ${page.location || "beautiful scenic location"}, ${page.timeOfDay || "warm daylight"}.`;

    console.log(`Generating page "${page.title}" (${page.panels.length} panels)`);

    // A4 portrait format
    const genRes = await openai.images.generate({
      model: "gpt-image-1",
      prompt: fullPrompt,
      n: 1,
      size: "1024x1792",
      quality: "high",
    });

    const item = (genRes.data || [])[0];
    let rawUrl = "";
    if (item?.url) rawUrl = item.url;
    else if (item?.b64_json) rawUrl = `data:image/png;base64,${item.b64_json}`;

    if (!rawUrl) return res.json({ imageUrl: "", panels: page.panels });

    // Save to Supabase Storage — only resize, NO text overlay
    const bookId = page.id?.split("-")[0] || `book-${Date.now()}`;
    const storedUrl = await saveImage(rawUrl, bookId, page.id || `page-${Date.now()}`);
    const finalUrl = storedUrl || rawUrl;

    console.log(`✓ Page "${page.title}" done → ${storedUrl ? "Supabase" : "inline"}`);
    // Return image URL + panels JSON for frontend CSS overlay
    res.json({ imageUrl: finalUrl, panels: page.panels });
  } catch (err) {
    console.error("Page error:", err.message);
    res.status(500).json({ error: err.message, imageUrl: "", panels: [] });
  }
});

// ── POST /api/comic/cover ─────────────────────────────────────────────────────
// Raw cover image — NO title overlay. Title rendered in frontend via CSS.
router.post("/cover", async (req, res) => {
  try {
    const { title, characters = [], category = "familie", illustrationStyle = "comic", location = "" } = req.body;

    const mood = CATEGORY_MOOD[category] || CATEGORY_MOOD.familie;
    const charDesc = characters.map(c => `${c.name}: ${c.visual_anchor}`).join(", ");

    const prompt = `Create a beautiful comic book COVER illustration.
${charDesc ? `Main characters: ${charDesc}.` : ""}
Setting: ${location || "beautiful scenic location"}. Mood: ${mood}.
Style: warm watercolor comic art, professional cover quality, cinematic composition, portrait orientation.
Characters prominently featured in foreground. NO text, NO title, NO letters anywhere.`;

    const genRes = await openai.images.generate({
      model: "gpt-image-1", prompt, n: 1, size: "1024x1792", quality: "high"
    });
    const item = (genRes.data || [])[0];
    let rawUrl = item?.url || "";
    if (!rawUrl && item?.b64_json) rawUrl = `data:image/png;base64,${item.b64_json}`;

    if (!rawUrl) return res.json({ coverImageUrl: "" });

    // Save to Supabase — only resize, NO title overlay
    const coverUrl = await saveImage(rawUrl, "covers", `cover-${Date.now()}`);
    res.json({ coverImageUrl: coverUrl || rawUrl });
  } catch (err) {
    console.error("Cover error:", err.message);
    res.status(500).json({ error: err.message, coverImageUrl: "" });
  }
});

// ── POST /api/comic/ending ────────────────────────────────────────────────────
// Returns ending text as JSON — NO SVG image. Frontend renders via CSS.
router.post("/ending", async (req, res) => {
  try {
    const { storyInput, guidedAnswers = {}, tone, language, dedication } = req.body;
    const langMap = { de: "German", en: "English", fr: "French", es: "Spanish" };
    const lang = langMap[language] || "German";

    const r = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: `Write a warm, emotional and personal closing text for a comic book in ${lang}. Tone: ${tone || "warm, nostalgic, loving"}. 3-4 short sentences. Make it feel like a heartfelt letter. No title.` },
        { role: "user", content: storyInput || Object.values(guidedAnswers).filter(Boolean).join(", ") },
      ],
      max_tokens: 150, temperature: 0.9,
    });

    const endingText = r.choices[0].message.content || "";
    console.log(`✓ Ending text generated (${endingText.length} chars)`);

    // Return text as JSON — frontend renders it
    res.json({ endingText, dedication: dedication || "" });
  } catch (err) {
    console.error("Ending error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
