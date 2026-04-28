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
      language, category, numPages = 5, referenceImages = [] } = req.body;

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

CRITICAL — MINIMUM PAGES:
- Generate MINIMUM ${numPages} pages. Long stories are good — use all the details provided!

CRITICAL — PANEL VARIETY:
- Every panel must show a COMPLETELY DIFFERENT scene, angle, and moment
- NEVER repeat the same activity in two panels (e.g. not 2× at gate, not 2× looking at something)
- NEVER show the same location/angle twice on one page
- Think cinematically: establishing shot → close-up → reaction → wide shot
- Each panel must advance the story — no redundant moments
- Each character appears ONLY ONCE per panel — no duplicates of the same person

CRITICAL — CHARACTER VISIBILITY:
- Characters should face the camera or be shown from the side — AVOID back views
- Show faces clearly so readers can see expressions and emotions
- Prefer: front view, 3/4 view, profile view

Respond ONLY with JSON: {"pages": [{"id":"page1","pageNumber":1,"title":"Title in ${lang}","location":"English location","timeOfDay":"afternoon","panels":[{"nummer":1,"szene":"Specific English scene for SINGLE IMAGE generation","dialog":"Short ${lang} dialog 10-15 words","speaker":"Name or null","bubble_type":"speech"}]}]}` },
          { role: "user", content: ctx },
        ],
        response_format: { type: "json_object" },
        temperature: 0.85,
      }),
      openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `Extract all main characters from the story. For each character create a DETAILED visual description for sharp, high-quality face generation.

CRITICAL: Descriptions must be detailed enough for gpt-image-1.5 to generate sharp, recognizable faces.

ACCESSORIES & CONSISTENT FEATURES:
- If a character wears glasses, hijab, hat, jewelry, or other accessories: ALWAYS mention "always wears [accessory]"
- If a character has facial hair (beard, mustache): specify exact style and ALWAYS include it
- These features must appear in EVERY panel across ALL pages

Respond ONLY with JSON:
{
  "characters": [
    {
      "name": "Character name",
      "age": 30,
      "visual_anchor": "DETAILED English description for sharp face generation: exact age, precise hair color/length/style, eye color and shape, skin tone, facial features (jawline, cheekbones, nose shape, smile type), distinctive marks, body type, typical clothing colors, ALWAYS wears [consistent accessories like glasses/hijab/beard]. 40-50 words."
    }
  ]
}

Example: "Emma: 6-year-old girl with shoulder-length wavy auburn hair, bright hazel eyes, round face with rosy cheeks, small freckles across nose, warm smile showing front teeth gap, fair skin, petite build, always wears yellow t-shirt and denim shorts"` },
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
      // Context-aware outfit detection
      const location = (page.location || "").toLowerCase();
      const beachKeywords = ["strand", "beach", "meer", "sea", "pool", "planschbecken", "schwimmbad", "wasser"];
      const homeKeywords = ["haus", "home", "wohnzimmer", "küche", "hof", "garten", "zimmer"];
      const formalKeywords = ["restaurant", "theater", "hochzeit", "feier", "party", "celebration"];
      
      let outfitContext = "";
      if (beachKeywords.some(kw => location.includes(kw))) {
        outfitContext = "Characters wear appropriate beach/swim clothing (swimwear, shorts, light summer clothes). ";
      } else if (formalKeywords.some(kw => location.includes(kw))) {
        outfitContext = "Characters wear formal/festive clothing appropriate for the occasion. ";
      } else if (homeKeywords.some(kw => location.includes(kw))) {
        outfitContext = "Characters wear casual home clothing. ";
      } else {
        outfitContext = "Characters wear context-appropriate clothing for the setting. ";
      }

      const rewriteRes = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{
          role: "system",
          content: `You rewrite comic scene descriptions into short, natural image prompts for gpt-image-1.5.

Write like an art director briefing an illustrator — NOT like a prompt engineer.

⚠️ CRITICAL - ABSOLUTELY NO TEXT IN IMAGE ⚠️
The image generator MUST NOT write ANY text, titles, captions, or letters.
- NO page titles like "Ankunft in Tunesien" or "Abflug nach Tunesien"
- NO panel titles, NO scene titles, NO location names
- NO speech bubbles, NO captions, NO labels
- NO letters, NO words, NO text of any kind
- Text is added separately by the frontend - the image must be PURE ILLUSTRATION
- If you see a title in the panel description, IGNORE IT - do not include it in the image prompt
- This is CRITICAL - any text in the image will ruin the comic

OUTPUT STRUCTURE (exactly this, nothing else):
1. One master sentence: style + layout + motif + story context
2. One character anchor sentence (if reference photo exists)
3. Panel breakdown: one short visual sentence per panel
4. One style tail: short style keywords + negatives

CRITICAL RULES FOR SHARP FACES:
- ALWAYS include: "Sharp, detailed facial features with clearly defined eyes, nose, mouth, and expressions"
- ALWAYS include: "Each panel shows a COMPLETELY DIFFERENT scene, angle, and moment"
- ALWAYS include: "Maximum 2-4 people per panel with visible faces — avoid large crowds"
- CRITICAL: "Each character appears ONLY ONCE per panel — no duplicates of the same person"
- CRITICAL: "Prefer showing characters facing camera or from side to see expressions — back views OK when story needs it"
- For characters: mention "recognizable face" or "distinct facial features"
- For crowd scenes: "Background people as silhouettes or out of focus"
- Total output: max 130 words

NO INVENTED CHARACTERS:
- ONLY draw characters listed in the Characters section below
- Do NOT add any extra people, children, strangers, or background figures with faces
- Background crowd = faceless silhouettes only, NO distinct faces on unnamed people

CLOTHING CONTEXT:
- ${outfitContext}
- Characters can change clothes between DIFFERENT locations (airport → beach → home)
- BUT: Same outfit within the SAME location across multiple panels
- Example: If Mama wears brown top at beach in panel 1, she wears brown top in ALL beach panels
- Keep character faces/hair/features identical, but adapt clothing to scene

STYLE RULES:
- No block headers (no "QUALITY:", "STYLE:", "LAYOUT:" etc.)
- No redundant synonyms
- No meta-language, no prompt engineering jargon
- Write naturally, like describing a scene to an artist
- Each panel: max 1 sentence, purely what is VISIBLE
- Emphasize variety: close-ups, wide shots, different actions, different angles
- CRITICAL: End with "NO text, NO speech bubbles, NO letters, NO titles in image"`,
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
      // Context-aware outfit for fallback
      const location = (page.location || "").toLowerCase();
      const beachKeywords = ["strand", "beach", "meer", "sea", "pool", "planschbecken", "schwimmbad", "wasser"];
      let outfitNote = "";
      if (beachKeywords.some(kw => location.includes(kw))) {
        outfitNote = " Characters wear appropriate beach/swim clothing (swimwear, shorts, light summer clothes).";
      }

      imagePrompt = `Create a premium European comic book page with ${panelCount} panels in a ${layoutDesc}. 

CRITICAL: Sharp, detailed facial features with clearly defined eyes, nose, mouth, and expressions. Maximum 2-4 people per panel with visible faces. Each panel shows a COMPLETELY DIFFERENT scene, angle, and moment — no duplicates, no similar compositions.

Characters (keep identical in every panel with recognizable faces): ${characters.map(c => `${c.name}: ${c.visual_anchor}`).join(". ")}${outfitNote}
${page.panels.map(p => `Panel ${p.nummer}: ${p.szene}`).join("\n")}
${page.location ? `\nSetting: ${page.location}.` : ""}${page.timeOfDay ? ` ${page.timeOfDay} lighting.` : ""}

Style: crisp black ink outlines, ${style}, expressive faces with clear features, bold panel borders, professional graphic novel quality. For crowd scenes: background people as silhouettes or out of focus. No watercolor. No soft blur. CRITICAL: NO text, NO speech bubbles, NO letters in the generated image.`;
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
        
        // Enhanced consistency note
        const charAnchors = characters.map(c => `${c.name} (${c.visual_anchor})`).join(", ");
        const consistencyNote = referenceImages.length === 0
          ? "This is the cover image showing the main characters. Keep their faces, hair, and features EXACTLY as shown in this reference."
          : "The people in this photo are the main characters. Keep their exact faces, hair, and features recognizable.";
        
        const editRes = await openai.images.edit({
          model: "gpt-image-1.5",
          image: refFile,
          prompt: `${consistencyNote} Draw them as premium European comic illustrations — crisp comic style with bold ink outlines.

Character consistency is CRITICAL: ${charAnchors}

${imagePrompt}`,
          size: "1024x1536",
          quality: "high",
        });
        const item = (editRes.data || [])[0];
        if (item?.url) rawUrl = item.url;
        else if (item?.b64_json) rawUrl = `data:image/png;base64,${item.b64_json}`;
        if (rawUrl) console.log(`  → Generated with reference ${referenceImages.length > 0 ? "photo" : "(cover)"}`);
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
    const { title, characters = [], category = "familie", illustrationStyle = "comic", location = "", referenceImages = [] } = req.body;

    const charDesc = characters.map(c => `${c.name}: ${c.visual_anchor}`).join(", ");

    const prompt = `Create a premium European comic book COVER illustration showing ${charDesc || "a family"} in ${location || "a beautiful setting"}.
Characters prominently featured in foreground, looking at the viewer. Cinematic composition, portrait orientation.
Style: crisp ink outlines, vivid saturated colors, expressive faces, professional graphic novel cover quality. No watercolor. No soft blur. No text, no title, no letters.`;

    let rawUrl = "";

    // Primary: images.edit() with user photo for character likeness
    const primaryRef = referenceImages[0] || characters.find(c => c.refBase64)?.refBase64;
    if (primaryRef) {
      try {
        const refBuf = Buffer.from(primaryRef, "base64");
        const refBlob = new Blob([refBuf], { type: "image/jpeg" });
        const refFile = new File([refBlob], "reference.jpg", { type: "image/jpeg" });
        const editRes = await openai.images.edit({
          model: "gpt-image-1.5",
          image: refFile,
          prompt: `The people in this photo are the main characters. Create a premium European comic book COVER showing them in ${location || "a beautiful setting"}. Keep their exact faces recognizable in crisp comic style. Portrait orientation, characters in foreground.\nStyle: crisp ink outlines, vivid colors, expressive faces, professional graphic novel cover. No watercolor. No soft blur. No text.`,
          size: "1024x1536",
          quality: "high",
        });
        const item = (editRes.data || [])[0];
        if (item?.url) rawUrl = item.url;
        else if (item?.b64_json) rawUrl = `data:image/png;base64,${item.b64_json}`;
        if (rawUrl) console.log("  → Cover generated with reference photo");
      } catch (e) {
        console.warn("  → Cover reference photo failed:", e.message);
      }
    }

    // Fallback: images.generate()
    if (!rawUrl) {
      const genRes = await openai.images.generate({
        model: "gpt-image-1.5", prompt, n: 1, size: "1024x1536", quality: "high"
      });
      const item = (genRes.data || [])[0];
      if (item?.url) rawUrl = item.url;
      else if (item?.b64_json) rawUrl = `data:image/png;base64,${item.b64_json}`;
    }

    if (!rawUrl) return res.json({ coverImageUrl: "" });

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
    const { storyInput, guidedAnswers = {}, tone, language, dedication, dedicationFrom } = req.body;
    const langMap = { de: "German", en: "English", fr: "French", es: "Spanish" };
    const lang = langMap[language] || "German";

    const r = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: `Du schreibst eine persönliche Widmung für die letzte Seite eines Comic-Buchs in ${lang}.

WICHTIG — Das ist eine WIDMUNG, keine Zusammenfassung!
- Schreibe wie eine handgeschriebene Widmung auf der letzten Seite eines Geschenks
- Maximal 2-3 kurze, herzliche Sätze
- Sprich die Hauptperson(en) DIREKT an
- Wenn die Geschichte von Großeltern handelt: "Für Opa und Oma..." oder "Für euch, liebe Großeltern..."
- Wenn die Geschichte von einem Kind handelt: "Für Dich, lieber [Name]..."
- Erwähne EIN konkretes Detail aus der Geschichte
- Ton: ${tone || "liebevoll, persönlich, warm"}
${dedicationFrom ? `- Ende die Widmung mit: "Von: ${dedicationFrom}" (NICHT "Von: Von ${dedicationFrom}")` : '- VERBOTEN: "[Dein Name]", "[Familienmitglied]" als Absender'}
- VERBOTEN: "Liebe Leserinnen", "dieses Buch", "diese Geschichte"
- VERBOTEN: Zusammenfassungen der Handlung
- VERBOTEN: Doppelungen wie "Von: Von..."
- Schreibe so, als würde ein Familienmitglied die Widmung von Hand schreiben` },
        { role: "user", content: `Geschichte: ${storyInput || ""}\n${Object.entries(guidedAnswers).filter(([k,v]) => v && k !== "category").map(([k,v]) => `${k}: ${v}`).join("\n")}${dedication ? `\nWidmung vom Nutzer: ${dedication}` : ""}${dedicationFrom ? `\nVon: ${dedicationFrom}` : ""}` },
      ],
      max_tokens: 100, temperature: 0.8,
    });

    const endingText = r.choices[0].message.content || "";
    console.log(`✓ Ending text generated (${endingText.length} chars)`);

    // Return text as JSON — frontend renders it
    res.json({ endingText, dedication: dedication || "", dedicationFrom: dedicationFrom || "" });
  } catch (err) {
    console.error("Ending error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
