const express = require("express");
const router = express.Router();
const OpenAI = require("openai");
const { saveImage } = require("../lib/storage");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Style modifiers per category + comic style ────────────────────────────────
const STYLE_MAP = {
  familie:   { action: "vibrant saturated colors, dynamic compositions, Asterix/Tintin energy", emotional: "rich warm colors, rounded characters, Pixar concept art quality", humor: "bright pop colors, exaggerated expressions, European comic strip style" },
  urlaub:    { action: "vivid tropical colors, dynamic wide-angle compositions, movie poster quality", emotional: "luminous Mediterranean colors, panoramic compositions, travel book quality", humor: "bright holiday colors, exaggerated tourist situations, funny postcard style" },
  liebe:     { action: "dramatic romantic energy, bold colors, cinematic angles", emotional: "intimate golden light, elegant linework, romantic atmosphere", humor: "bright cheerful colors, exaggerated lovesick expressions" },
  feier:     { action: "vibrant party colors, confetti in motion, high energy", emotional: "golden lighting, intimate moments, greeting card quality", humor: "bright festive colors, exaggerated celebration chaos" },
  biografie: { action: "dramatic cinematic lighting, deep colors, prestige graphic novel", emotional: "muted earth tones, editorial linework, New Yorker illustration quality", humor: "retro color palette, expressive linework, illustrated memoir style" },
  freunde:   { action: "vibrant colors, dynamic group poses, superhero team-up energy", emotional: "natural colors, intimate moments, warm ambient lighting", humor: "bright pop colors, exaggerated expressions, webcomic quality" },
  sonstiges: { action: "bold outlines, rich cinematic colors, high contrast", emotional: "atmospheric colors, precise linework, cinematic lighting", humor: "bold outlines, bright colors, professional cartoon quality" },
};

function getStyle(category, comicStyle) {
  const cat = STYLE_MAP[category] || STYLE_MAP.sonstiges;
  return cat[comicStyle] || cat.emotional;
}

// ── Detect outfit context from location string ────────────────────────────────
function detectOutfitContext(location = "") {
  const loc = location.toLowerCase();
  if (["strand", "beach", "meer", "sea", "pool", "planschbecken", "schwimmbad"].some(k => loc.includes(k)))
    return "beach/swim clothing (swimwear, shorts, light summer clothes)";
  if (["restaurant", "theater", "hochzeit", "feier", "party", "celebration"].some(k => loc.includes(k)))
    return "formal/festive clothing appropriate for the occasion";
  if (["haus", "home", "wohnzimmer", "küche", "hof", "garten", "zimmer"].some(k => loc.includes(k)))
    return "casual home clothing";
  return "context-appropriate clothing for the setting";
}

// ── Build the core comic style instruction (shared across cover + pages) ──────
function comicStyleInstruction() {
  return `European comic book illustration style — bold ink outlines, flat cel-shaded colors, expressive cartoon faces.
NOT photorealistic. NOT a photograph. NOT a children's picture book. NOT watercolor. NOT soft blur.
Think: Asterix, Tintin, Lucky Luke — crisp lines, vivid colors, clear panel compositions.`;
}

// ── Build character anchor string ─────────────────────────────────────────────
function charAnchor(characters) {
  return characters.map(c => `${c.name} (${c.visual_anchor || ""})`).join("; ");
}

// ── Fetch image as Buffer from URL ────────────────────────────────────────────
async function fetchImageBuffer(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(25000) });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// ── Generate image with gpt-image-2 ──────────────────────────────────────────
// referenceBuffer: optional Buffer for images.edit(), null → images.generate()
async function generateImage(prompt, referenceBuffer, size = "1024x1536") {
  if (referenceBuffer) {
    try {
      const blob = new Blob([referenceBuffer], { type: "image/png" });
      const file = new File([blob], "reference.png", { type: "image/png" });
      const res = await openai.images.edit({
        model: "gpt-image-2",
        image: file,
        prompt,
        size,
        quality: "high",
      });
      const item = (res.data || [])[0];
      if (item?.url) return item.url;
      if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`;
    } catch (e) {
      console.warn("  → images.edit() failed, falling back to generate():", e.message);
    }
  }
  // Fallback: generate without reference
  const res = await openai.images.generate({
    model: "gpt-image-2",
    prompt,
    n: 1,
    size,
    quality: "high",
  });
  const item = (res.data || [])[0];
  if (item?.url) return item.url;
  if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`;
  throw new Error("No image returned from API");
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/comic/structure
// Returns: { pages, characters }
// characters include characterSheetUrl if generated
// ─────────────────────────────────────────────────────────────────────────────
router.post("/structure", async (req, res) => {
  try {
    const {
      storyInput, guidedAnswers = {}, tone, comicStyle, mustHaveSentences,
      language, category, numPages = 5, referenceImages = [],
    } = req.body;

    const langMap = { de: "German", en: "English", fr: "French", es: "Spanish" };
    const lang = langMap[language] || "German";

    let ctx = storyInput || "";
    for (const [k, v] of Object.entries(guidedAnswers)) {
      if (v && k !== "category") ctx += `\n${k}: ${v}`;
    }



    // Run structure + character extraction in parallel
    const [structRes, charRes] = await Promise.all([
      openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a comic book author. Create a ${numPages}-page comic structure in ${lang}.
Tone: ${tone}. Comic style: ${comicStyle}.
${mustHaveSentences ? `MUST include: ${mustHaveSentences}` : ""}

PANEL COUNT — choose based on story moment:
- 2-3 panels: quiet, emotional moments (close-ups, tender scenes)
- 4 panels: standard action/dialogue scenes (2×2 grid)
- 5 panels: busy, action-packed scenes (2 top, 1 wide middle, 2 bottom)
- Vary across pages — not every page should have the same count
- Each page: minimum 2, maximum 5 panels

CRITICAL — EXACTLY ${numPages} PAGES:
Generate EXACTLY ${numPages} pages. No more, no less.

CRITICAL — PANEL VARIETY:
- Every panel must show a COMPLETELY DIFFERENT scene, angle, and moment
- Think cinematically: establishing shot → close-up → reaction → wide shot
- Each panel advances the story — no redundant moments
- Each character appears ONLY ONCE per panel

CRITICAL — ALL CHARACTERS MUST APPEAR:
- EVERY character mentioned MUST appear in at least 2-3 panels across the comic
- Distribute characters across ALL pages — not all on one page
- Grandparents, parents, children — ALL must be shown

CRITICAL — ACTIONS, NOT PORTRAITS:
- Panels show characters DOING things — running, laughing, eating, swimming, pointing
- AVOID panels where characters just stand and look at the camera
- Show interactions, reactions, movement, emotions in action
- Exception: Cover can be a portrait/group shot

CRITICAL — DIALOGS:
- EVERY panel MUST have dialog or narrator caption
- Each dialog: 10-18 words, natural ${lang}, vivid and personal

Respond ONLY with JSON:
{"pages":[{"id":"page1","pageNumber":1,"title":"Title in ${lang}","location":"English location","timeOfDay":"afternoon","panels":[{"nummer":1,"szene":"Specific English scene description — what characters are DOING, not just where they are","dialog":"Short ${lang} dialog 10-18 words","speaker":"Name or null","bubble_type":"speech"}]}]}`,
          },
          { role: "user", content: ctx },
        ],
        response_format: { type: "json_object" },
        temperature: 0.9,
      }),
      openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Extract ALL main characters from the story. Include EVERY person mentioned — grandparents, parents, children, friends. Do NOT skip anyone.

For each character write a DETAILED visual description (40-50 words) covering:
- Exact age and gender
- Hair: color, length, style
- Skin tone
- Eye color
- Distinctive facial features (beard, glasses, wrinkles, smile type)
- Body type
- ALWAYS note consistent accessories: "always wears glasses", "always wears hijab", "always has grey beard"

Respond ONLY with JSON:
{"characters":[{"name":"Name","age":30,"visual_anchor":"DETAILED English description..."}]}`,
          },
          { role: "user", content: ctx },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      }),
    ]);

    const pages = JSON.parse(structRes.choices[0].message.content || "{}").pages || [];
    let characters = JSON.parse(charRes.choices[0].message.content || "{}").characters || [];

    // Enrich character descriptions from reference photos (one GPT-4o call per character)
    if (referenceImages.length > 0) {
      console.log(`Analyzing ${referenceImages.length} reference photo(s)...`);
      characters = await Promise.all(characters.map(async (char, i) => {
        const ref = referenceImages[i] || referenceImages[0];
        if (!ref) return char;
        try {
          const r = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{
              role: "user",
              content: [
                { type: "image_url", image_url: { url: `data:image/jpeg;base64,${ref}`, detail: "high" } },
                { type: "text", text: `Describe this person's appearance for a comic artist. Focus on: approximate age, hair color/texture/length, skin tone, eye color, distinctive features (beard, glasses, etc.), body type. Do NOT identify anyone. English, max 60 words. Start with "${char.name}:"` },
              ],
            }],
            max_tokens: 120,
          });
          return { ...char, visual_anchor: r.choices[0].message.content || char.visual_anchor };
        } catch (e) {
          console.error("Photo analysis error:", e.message);
          return char;
        }
      }));
    }

    res.json({ pages, characters });
  } catch (err) {
    console.error("Structure error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/comic/cover
// Returns: { coverImageUrl }
// The cover is generated FIRST and then used as style reference for all pages.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/cover", async (req, res) => {
  try {
    const {
      title, characters = [], category = "familie",
      location = "", referenceImages = [],
    } = req.body;

    const style = getStyle(category, "emotional");
    const chars = charAnchor(characters);

    // Cover prompt: group portrait is OK here, but show them in the story's setting
    const prompt = `${comicStyleInstruction()}

Comic book COVER illustration. Show the main characters together in ${location || "a beautiful setting"}, in a dynamic group composition — some looking at viewer, some interacting with each other.
Characters: ${chars || "a family"}
Style: ${style}, cinematic portrait orientation, characters prominently in foreground, vivid background showing the story's world.
NO text, NO title, NO speech bubbles, NO letters anywhere in the image.`;

    let rawUrl = "";

    // Use user photo as reference if available — helps with face likeness
    const primaryRef = referenceImages[0];
    if (primaryRef) {
      try {
        const refBuf = Buffer.from(primaryRef, "base64");
        rawUrl = await generateImage(
          `The people in this photo are the main characters of a comic book. Draw them in European comic illustration style — bold ink outlines, flat colors, expressive cartoon faces. NOT photorealistic. NOT a photograph.\n\nShow them together in ${location || "a beautiful setting"} for the comic COVER. Keep their faces recognizable but stylized as comic characters.\nCharacters: ${chars}\n${style}\nNO text, NO title, NO speech bubbles, NO letters in image.`,
          refBuf,
          "1024x1536"
        );
        console.log("  → Cover generated with reference photo");
      } catch (e) {
        console.warn("  → Cover with photo failed:", e.message);
      }
    }

    // Fallback: generate without reference
    if (!rawUrl) {
      rawUrl = await generateImage(prompt, null, "1024x1536");
    }

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
// Returns: { imageUrl, panels, panelPositions }
//
// Reference strategy (priority order):
//   1. coverImageUrl (already in comic style, shows all characters) ← BEST
//   2. referenceImages[0] (user photo) ← fallback if no cover yet
//   3. No reference (pure generate) ← last resort
// ─────────────────────────────────────────────────────────────────────────────
router.post("/page", async (req, res) => {
  try {
    const {
      page, characters = [], comicStyle = "emotional", category = "familie",
      referenceImages = [], coverImageUrl = "",
    } = req.body;

    const style = getStyle(category, comicStyle);
    const panelCount = page.panels.length;
    const layoutDesc =
      panelCount <= 2 ? "2 equal panels side by side" :
      panelCount === 3 ? "1 large panel on top, 2 smaller panels on bottom" :
      panelCount === 5 ? "2 panels on top, 1 wide panel in middle, 2 panels on bottom" :
      "2×2 grid of equal panels"; // 4 panels default

    const outfitCtx = detectOutfitContext(page.location);
    const chars = charAnchor(characters);
    const panelDescriptions = page.panels
      .map(p => `Panel ${p.nummer}: ${p.szene}`)
      .join("\n");

    // ── Build image prompt ──────────────────────────────────────────────────
    const prompt = `${comicStyleInstruction()}

Comic book page — ${panelCount} panels in a ${layoutDesc}. Bold black panel borders separating each panel.
Style: ${style}

CHARACTERS (keep identical across ALL panels — same face, hair, features):
${chars}

CLOTHING: Characters wear ${outfitCtx}. Keep clothing consistent within this page.

PANELS — each shows a DIFFERENT scene, angle, and moment:
${panelDescriptions}

CRITICAL RULES:
- Each character appears ONLY ONCE per panel — no duplicates
- Characters are DOING things (running, laughing, eating, pointing) — NOT just standing and posing
- Show faces clearly — front view or 3/4 view preferred, expressive emotions
- Background crowd figures: faceless silhouettes only
- Sharp, detailed facial features — clearly defined eyes, nose, mouth
- NO text, NO speech bubbles, NO letters, NO titles anywhere in the image`;

    // ── Determine reference image ───────────────────────────────────────────
    // Priority: cover (already comic style) > user photo > none
    let referenceBuffer = null;
    let refSource = "none";

    if (coverImageUrl) {
      try {
        referenceBuffer = await fetchImageBuffer(coverImageUrl);
        refSource = "cover";
      } catch (e) {
        console.warn("  → Could not fetch cover as reference:", e.message);
      }
    }

    if (!referenceBuffer && referenceImages[0]) {
      referenceBuffer = Buffer.from(referenceImages[0], "base64");
      refSource = "user-photo";
    }

    // ── Generate image ──────────────────────────────────────────────────────
    let coverRefNote = "";
    if (refSource === "cover") {
      coverRefNote = `\nThis reference image shows the comic cover — use the EXACT same art style, character designs, and color palette for this page. Keep all characters looking identical to how they appear in the cover.`;
    } else if (refSource === "user-photo") {
      coverRefNote = `\nThe people in this reference photo are the main characters. Draw them in the same European comic illustration style — bold ink outlines, flat colors. NOT photorealistic.`;
    }

    const finalPrompt = coverRefNote ? `${coverRefNote}\n\n${prompt}` : prompt;

    console.log(`Generating page "${page.title}" (${panelCount} panels, ref: ${refSource})`);
    const rawUrl = await generateImage(finalPrompt, referenceBuffer, "1024x1536");

    // ── Save to Supabase ────────────────────────────────────────────────────
    const bookId = page.id?.split("-")[0] || `book-${Date.now()}`;
    const storedUrl = await saveImage(rawUrl, bookId, page.id || `page-${Date.now()}`);
    const finalUrl = storedUrl || rawUrl;

    // ── Panel position detection (GPT-4o Vision) ────────────────────────────
    let panelPositions = null;
    try {
      const visionRes = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{
          role: "user",
          content: [
            { type: "image_url", image_url: { url: finalUrl, detail: "low" } },
            { type: "text", text: `This comic page has ${panelCount} panels. Return their positions as percentage coordinates (top-left origin). JSON only: {"panels":[{"nummer":1,"top":5,"left":0,"width":100,"height":45}]}` },
          ],
        }],
        response_format: { type: "json_object" },
        max_tokens: 200,
        temperature: 0.1,
      });
      const posData = JSON.parse(visionRes.choices[0].message.content || "{}");
      if (posData.panels?.length > 0) {
        panelPositions = posData.panels;
        console.log(`  ✓ Panel positions detected`);
      }
    } catch (e) {
      console.warn("  Panel detection failed:", e.message);
    }

    console.log(`✓ Page "${page.title}" done → ${storedUrl ? "Supabase" : "inline"}`);
    res.json({ imageUrl: finalUrl, panels: page.panels, panelPositions });
  } catch (err) {
    console.error("Page error:", err.message);
    res.status(500).json({ error: err.message, imageUrl: "", panels: [] });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/comic/ending
// Returns: { endingText, dedication, dedicationFrom }
// ─────────────────────────────────────────────────────────────────────────────
router.post("/ending", async (req, res) => {
  try {
    const { storyInput, guidedAnswers = {}, tone, language, dedication, dedicationFrom } = req.body;
    const langMap = { de: "German", en: "English", fr: "French", es: "Spanish" };
    const lang = langMap[language] || "German";

    const r = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Du schreibst eine persönliche Widmung für die letzte Seite eines Comic-Buchs in ${lang}.

Das ist eine WIDMUNG — wie handgeschrieben auf der letzten Seite eines Geschenks.
- Maximal 2-3 kurze, herzliche Sätze
- Sprich die Hauptperson(en) DIREKT an
- Erwähne EIN konkretes Detail aus der Geschichte
- Ton: ${tone || "liebevoll, persönlich, warm"}

VERBOTEN:
- Absender ("Von:", "Deine Familie", "[Dein Name]")
- "dieses Buch", "diese Geschichte", "Liebe Leserinnen"
- Zusammenfassungen der Handlung
${dedicationFrom ? `Info: Absender ist "${dedicationFrom}" — aber NICHT in die Widmung schreiben` : ""}`,
        },
        {
          role: "user",
          content: `Geschichte: ${storyInput || ""}\n${Object.entries(guidedAnswers).filter(([k, v]) => v && k !== "category").map(([k, v]) => `${k}: ${v}`).join("\n")}${dedication ? `\nWidmung vom Nutzer: ${dedication}` : ""}`,
        },
      ],
      max_tokens: 100,
      temperature: 0.8,
    });

    const endingText = r.choices[0].message.content || "";
    console.log(`✓ Ending text generated`);
    res.json({ endingText, dedication: dedication || "", dedicationFrom: dedicationFrom || "" });
  } catch (err) {
    console.error("Ending error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
