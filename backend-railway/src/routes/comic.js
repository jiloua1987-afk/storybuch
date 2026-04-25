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
router.post("/page", async (req, res) => {
  try {
    const { page, characters = [], comicStyle = "emotional", category = "familie",
            illustrationStyle = "comic", referenceImages = [] } = req.body;

    // Style Matrix: category × comicStyle → art direction
    const SM = {
      liebe:    { action: "Romantic comic art with dynamic energy. Bold black outlines, rich warm colors (deep reds, golds, sunset oranges). Dramatic romantic poses, cinematic close-ups. Professional European BD quality.", emotional: "Tender romantic illustration. Soft watercolor washes in warm golden and rose tones. Gentle linework, intimate close-ups. Golden hour lighting. Painterly, like a romantic illustrated novel.", humor: "Playful romantic comedy comic. Bright cheerful colors, exaggerated lovesick expressions. Bold clean outlines. Fun and lighthearted, like a romantic manga." },
      familie:  { action: "Energetic family adventure comic. Bold black outlines, vibrant saturated colors, dynamic compositions. Children with exaggerated excited expressions. Motion lines, dramatic angles. Like Asterix or Tintin.", emotional: "Warm family storybook illustration. Soft rounded linework, gentle watercolor colors (warm yellows, soft greens, cozy browns). Tender moments. Professional children's book quality like Pixar concept art.", humor: "Fun family comedy comic. Bold clean outlines, bright pop colors. Kids with wildly exaggerated expressions. Slapstick body language. Like a European family comic strip." },
      urlaub:   { action: "Adventure travel comic with cinematic energy. Bold outlines, vivid tropical colors (turquoise, coral, golden sand). Dynamic wide-angle compositions. Movie poster quality.", emotional: "Beautiful travel memoir illustration. Luminous watercolor style with Mediterranean light. Soft linework, panoramic compositions. Like a painted travel journal.", humor: "Hilarious vacation comic. Bright saturated holiday colors, exaggerated tourist situations. Bold outlines, cartoon energy. Like a funny postcard." },
      feier:    { action: "Explosive celebration comic. Bold dynamic outlines, confetti in motion. Vibrant party colors (gold, magenta, electric blue). High energy party comic.", emotional: "Heartwarming celebration illustration. Warm golden lighting, soft watercolor tones. Intimate moments — tearful speeches, group hugs. Like a beautifully illustrated greeting card.", humor: "Hilarious party comic. Bright festive colors, exaggerated celebration chaos. Bold cartoon outlines, maximum fun energy." },
      biografie:{ action: "Epic life story graphic novel. Dramatic cinematic lighting, rich deep colors with sepia undertones. Bold compositions. Movie-quality biographical illustration.", emotional: "Nostalgic memoir illustration. Warm muted earth tones with selective color highlights. Soft editorial linework. Like a New Yorker illustration.", humor: "Charming biographical comic with wit. Warm retro color palette, clean expressive linework. Like an illustrated memoir with a smile." },
      freunde:  { action: "High-energy friendship adventure comic. Bold outlines, vibrant saturated colors. Friends in dynamic group poses. Like a superhero team-up with real friends.", emotional: "Warm friendship illustration. Soft natural colors, gentle linework. Shared laughter, supportive hugs. Like a beautifully illustrated friendship story.", humor: "Hilarious buddy comedy comic. Bright pop colors, exaggerated funny expressions. Bold cartoon outlines, maximum comedic timing." },
      sonstiges:{ action: "Dynamic storytelling comic. Bold black outlines, rich cinematic colors. Professional comic book quality.", emotional: "Beautiful narrative illustration. Warm atmospheric colors, soft painterly linework. Professional illustrated novel quality.", humor: "Entertaining comic with personality. Clean bold outlines, bright cheerful colors. Professional cartoon quality." },
    };
    const artDirection = (SM[category] || SM.sonstiges)[comicStyle] || (SM[category] || SM.sonstiges).emotional;

    const charDescs = characters.map(c =>
      `CHARACTER "${c.name}": ${c.visual_anchor}`
    ).join("\n\n");

    const scenes = page.panels.map(p =>
      `[Panel ${p.nummer}]: ${p.szene}`
    ).join("\n");

    const panelCount = page.panels.length;
    const layoutDesc = panelCount <= 3
      ? "1 large panel on top half, 2 equal panels on bottom half"
      : panelCount === 5
      ? "2 small on top row, 1 wide in middle row, 2 small on bottom row"
      : "4 panels in a 2×2 grid, all panels equal size";

    // Quality-First Prompt Architecture: Quality → Style → Layout → Characters → Scene → Negatives
    const fullPrompt = `PREMIUM EUROPEAN COMIC PAGE.
Professional graphic novel illustration. Crisp black ink outlines. Clean contour linework. Sharp facial rendering. High detail. Strong color separation. Print-quality comic rendering. Clear forms.

STYLE: ${artDirection}
Polished graphic novel finish. Clean inked outlines. Expressive faces. Vivid controlled colors. Cinematic lighting. Detailed but clean backgrounds. Professional print-quality rendering.

LAYOUT: Single comic page with exactly ${panelCount} distinct panels. ${layoutDesc}. Each panel shows a DIFFERENT scene — no repeated content. Bold black borders separating every panel. Every panel must be fully visible, not cropped or cut off.
${page.location ? `Setting: ${page.location}.` : ""}${page.timeOfDay ? ` Lighting: ${page.timeOfDay}.` : ""}

CHARACTERS (visually identical in every panel — same face, hair, clothes, proportions):
${charDescs || "Characters as described in the scene."}

SCENE:
${scenes}

NEGATIVE: No watercolor. No painterly blur. No soft wash. No muddy beige cast. No blurry faces. No generic faces. No distorted anatomy. No text. No captions. No speech bubbles.`;

    console.log(`Generating page "${page.title}" (${panelCount} panels)`);

    let rawUrl = "";

    // Primary: images.edit() with user reference photo for character likeness
    const primaryRef = referenceImages[0] || characters.find(c => c.refBase64)?.refBase64;
    if (primaryRef) {
      try {
        const refBuf = Buffer.from(primaryRef, "base64");
        const refBlob = new Blob([refBuf], { type: "image/jpeg" });
        const refFile = new File([refBlob], "reference.jpg", { type: "image/jpeg" });

        const editRes = await openai.images.edit({
          model: "gpt-image-1",
          image: refFile,
          prompt: `The people in this photo are the main characters. Draw them as premium European comic illustrations — keep their exact faces, hair, and features recognizable but rendered in crisp comic style with bold ink outlines.\n\n${fullPrompt}`,
          size: "1024x1536",
          quality: "high",
        });

        const item = (editRes.data || [])[0];
        if (item?.url) rawUrl = item.url;
        else if (item?.b64_json) rawUrl = `data:image/png;base64,${item.b64_json}`;
        if (rawUrl) console.log(`  → Generated with reference photo`);
      } catch (e) {
        console.warn(`  → Reference photo failed, falling back:`, e.message);
      }
    }

    // Fallback: images.generate() without reference
    if (!rawUrl) {
      try {
        const genRes = await openai.images.generate({
          model: "gpt-image-1",
          prompt: fullPrompt,
          n: 1,
          size: "1024x1536",
          quality: "high",
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

    // ── Panel Position Detection via GPT-4o Vision ──────────────────────────
    let panelPositions = null;
    try {
      // Download the generated image for analysis
      let imgForAnalysis = finalUrl;
      if (finalUrl.startsWith("http")) {
        // Use the Supabase URL directly
        imgForAnalysis = finalUrl;
      }

      const visionRes = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{
          role: "user",
          content: [
            { type: "image_url", image_url: { url: imgForAnalysis, detail: "low" } },
            { type: "text", text: `This is a comic page with ${panelCount} panels. Analyze the image and return the position of each panel as percentage coordinates.
Respond ONLY with JSON: {"panels":[{"nummer":1,"top":5,"left":0,"width":100,"height":45},{"nummer":2,"top":52,"left":0,"width":50,"height":46}]}
top/left/width/height are percentages of the total image. Panel 1 is top-left, numbering goes left-to-right, top-to-bottom.` }
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
      console.warn(`Panel detection failed for "${page.title}":`, e.message);
    }

    console.log(`✓ Page "${page.title}" done → ${storedUrl ? "Supabase" : "inline"}`);
    res.json({ imageUrl: finalUrl, panels: page.panels, panelPositions });
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
      model: "gpt-image-1", prompt, n: 1, size: "1024x1536", quality: "high"
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
