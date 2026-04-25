const express = require("express");
const router = express.Router();
const OpenAI = require("openai");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const { saveImage } = require("../lib/storage");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Load style reference image ────────────────────────────────────────────────
let STYLE_REF_BUFFER = null;
try {
  const candidates = [
    path.join(__dirname, "../../public/Comic.png"),
    path.join(__dirname, "../../style-reference.png"),
    path.join(process.cwd(), "public", "Comic.png"),
  ];
  for (const refPath of candidates) {
    if (fs.existsSync(refPath)) {
      STYLE_REF_BUFFER = fs.readFileSync(refPath);
      console.log(`✓ Style reference loaded from ${refPath}`);
      break;
    }
  }
  if (!STYLE_REF_BUFFER) console.warn("⚠ No style reference image found");
} catch (e) { console.warn("Style reference load error:", e.message); }

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
          model: "gpt-image-1.5",
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
router.post("/page", async (req, res) => {
  try {
    const { page, characters = [], comicStyle = "emotional", category = "familie",
            illustrationStyle = "comic", referenceImages = [] } = req.body;

    const SM = {
      liebe:     { action: "dramatic romantic energy, bold colors, cinematic angles", emotional: "intimate golden light, elegant linework, romantic atmosphere", humor: "bright cheerful colors, exaggerated lovesick expressions, manga energy" },
      familie:   { action: "vibrant saturated colors, dynamic compositions, Asterix/Tintin energy", emotional: "rich warm colors, rounded characters, Pixar concept art quality", humor: "bright pop colors, exaggerated expressions, European comic strip style" },
      urlaub:    { action: "vivid tropical colors, dynamic wide-angle compositions, movie poster quality", emotional: "luminous Mediterranean colors, panoramic compositions, travel book quality", humor: "bright holiday colors, exaggerated tourist situations, funny postcard style" },
      feier:     { action: "vibrant party colors, confetti in motion, high energy", emotional: "golden lighting, intimate moments, greeting card quality", humor: "bright festive colors, exaggerated celebration chaos, maximum fun" },
      biografie: { action: "dramatic cinematic lighting, deep colors, prestige graphic novel", emotional: "muted earth tones, editorial linework, New Yorker illustration quality", humor: "retro color palette, expressive linework, illustrated memoir style" },
      freunde:   { action: "vibrant colors, dynamic group poses, superhero team-up energy", emotional: "natural colors, intimate moments, warm ambient lighting", humor: "bright pop colors, exaggerated expressions, webcomic quality" },
      sonstiges: { action: "bold outlines, rich cinematic colors, high contrast", emotional: "atmospheric colors, precise linework, cinematic lighting", humor: "bold outlines, bright colors, professional cartoon quality" },
    };
    const style = (SM[category] || SM.sonstiges)[comicStyle] || (SM[category] || SM.sonstiges).emotional;
    const charListStr = characters.map(c => `${c.name} (${c.age || ""}, ${c.visual_anchor})`).join(", ");
    const panelList = page.panels.map(p => `${p.nummer}. ${p.szene}`).join("\n");
    const panelCount = page.panels.length;
    const layoutDesc = panelCount <= 3 ? "1 large panel on top, 2 panels on bottom"
      : panelCount === 5 ? "2 on top, 1 wide middle, 2 on bottom" : "2×2 grid";

    // Step 1: GPT-4o Prompt Rewriter — writes like an Art Director
    let imagePrompt = "";
    try {
      const rewriteRes = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{
          role: "system",
          content: `You rewrite comic scene descriptions into short, natural image prompts for gpt-image-1.5.

Write like an art director briefing an illustrator — NOT like a prompt engineer.

OUTPUT STRUCTURE (exactly this, nothing else):
1. One master sentence: style + layout + motif + story context
2. One character anchor sentence (if reference photo exists)
3. Panel breakdown: one short visual sentence per panel
4. One style tail: short style keywords + negatives

RULES:
- Total output: max 120 words
- No block headers (no "QUALITY:", "STYLE:", "LAYOUT:" etc.)
- No redundant synonyms
- No meta-language, no prompt engineering jargon
- Write naturally, like describing a scene to an artist
- Each panel: max 1 sentence, purely what is VISIBLE`,
        }, {
          role: "user",
          content: `${panelCount} panels in a ${layoutDesc}. Category: ${category}, style: ${comicStyle}.
Characters: ${charListStr}
Location: ${page.location || "not specified"}, Time: ${page.timeOfDay || "daytime"}

Panels:
${panelList}`,
        }],
        max_tokens: 250,
        temperature: 0.2,
      });
      imagePrompt = rewriteRes.choices[0].message.content || "";
      if (imagePrompt.length < 80) imagePrompt = "";
      else console.log(`  → Prompt rewritten (${imagePrompt.length} chars)`);
    } catch (e) {
      console.warn("Prompt rewrite failed:", e.message);
    }
    // Fallback prompt
    if (!imagePrompt) {
      imagePrompt = `Create a premium European comic book page with ${panelCount} panels in a ${layoutDesc}. Each panel shows a different scene — no duplicates, no cropping.\n\nCharacters (keep identical in every panel): ${characters.map(c => `${c.name}: ${c.visual_anchor}`).join(". ")}\n${page.panels.map(p => `Panel ${p.nummer}: ${p.szene}`).join("\n")}\n${page.location ? `\nSetting: ${page.location}.` : ""}${page.timeOfDay ? ` ${page.timeOfDay} lighting.` : ""}\n\nStyle: crisp black ink outlines, ${style}, expressive faces, bold panel borders, professional graphic novel quality. No watercolor. No soft blur. No text in image.`;
    }

    console.log(`Generating page "${page.title}" (${panelCount} panels)`);
    let rawUrl = "";

    // Primary: images.edit() with user reference photo
    const primaryRef = referenceImages[0] || characters.find(c => c.refBase64)?.refBase64;
    if (primaryRef) {
      try {
        const refBuf = Buffer.from(primaryRef, "base64");
        const refBlob = new Blob([refBuf], { type: "image/jpeg" });
        const refFile = new File([refBlob], "reference.jpg", { type: "image/jpeg" });
        const editRes = await openai.images.edit({
          model: "gpt-image-1.5",
          image: refFile,
          prompt: `The people in this photo are the main characters. Draw them as premium European comic illustrations — keep their exact faces recognizable in crisp comic style.\n\n${imagePrompt}`,
          size: "1024x1536",
          quality: "high",
        });
        const item = (editRes.data || [])[0];
        if (item?.url) rawUrl = item.url;
        else if (item?.b64_json) rawUrl = `data:image/png;base64,${item.b64_json}`;
        if (rawUrl) console.log(`  → Generated with reference photo`);
      } catch (e) {
        console.warn(`  → Reference photo failed:`, e.message);
      }
    }

    // Fallback: images.generate()
    if (!rawUrl) {
      try {
        const genRes = await openai.images.generate({
          model: "gpt-image-1.5", prompt: imagePrompt, n: 1, size: "1024x1536", quality: "high",
        });
        const item = (genRes.data || [])[0];
        if (item?.url) rawUrl = item.url;
        else if (item?.b64_json) rawUrl = `data:image/png;base64,${item.b64_json}`;
      } catch (e) {
        console.error(`Generation failed for "${page.title}":`, e.message);
      }
    }

    if (!rawUrl) return res.json({ imageUrl: "", panels: page.panels, panelPositions: null });

    // Save to Supabase
    const bookId = page.id?.split("-")[0] || `book-${Date.now()}`;
    const storedUrl = await saveImage(rawUrl, bookId, page.id || `page-${Date.now()}`);
    const finalUrl = storedUrl || rawUrl;

    // Panel Position Detection via GPT-4o Vision
    let panelPositions = null;
    try {
      const visionRes = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{
          role: "user",
          content: [
            { type: "image_url", image_url: { url: finalUrl, detail: "low" } },
            { type: "text", text: `This is a comic page with ${panelCount} panels. Return panel positions as percentage coordinates. JSON only: {"panels":[{"nummer":1,"top":5,"left":0,"width":100,"height":45}]}` }
          ]
        }],
        response_format: { type: "json_object" },
        max_tokens: 200,
        temperature: 0.1,
      });
      const posData = JSON.parse(visionRes.choices[0].message.content || "{}");
      if (posData.panels && posData.panels.length > 0) {
        panelPositions = posData.panels;
        console.log(`✓ Panel positions detected for "${page.title}"`);
      }
    } catch (e) {
      console.warn(`Panel detection failed:`, e.message);
    }

    console.log(`✓ Page "${page.title}" done → ${storedUrl ? "Supabase" : "inline"}`);
    res.json({ imageUrl: finalUrl, panels: page.panels, panelPositions });
  } catch (err) {
    console.error("Page error:", err.message);
    res.status(500).json({ error: err.message, imageUrl: "", panels: [] });
  }
});
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
      model: "gpt-image-1.5", prompt, n: 1, size: "1024x1536", quality: "high"
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
        { role: "system", content: `Du schreibst eine persönliche Widmung für die letzte Seite eines Comic-Buchs in ${lang}.

WICHTIG — Das ist eine WIDMUNG, keine Zusammenfassung!
- Schreibe wie eine handgeschriebene Widmung auf der letzten Seite eines Geschenks
- Maximal 2-3 kurze, herzliche Sätze
- Sprich die Hauptperson DIREKT an (z.B. "Für Dich, liebe Helga...")
- Erwähne EIN konkretes Detail aus der Geschichte
- Ton: ${tone || "liebevoll, persönlich, warm"}
- VERBOTEN: "Liebe Leserinnen", "[Dein Name]", "dieses Buch", "diese Geschichte"
- VERBOTEN: Zusammenfassungen der Handlung
- Schreibe so, als würde ein Familienmitglied die Widmung von Hand schreiben` },
        { role: "user", content: `Geschichte: ${storyInput || ""}\n${Object.entries(guidedAnswers).filter(([k,v]) => v && k !== "category").map(([k,v]) => `${k}: ${v}`).join("\n")}${dedication ? `\nWidmung vom Nutzer: ${dedication}` : ""}` },
      ],
      max_tokens: 100, temperature: 0.8,
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
