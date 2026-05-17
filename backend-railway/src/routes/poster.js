/**
 * POST /api/poster/generate
 *
 * Poster-Produkt: 1 Szene, 2-3 Panels, mit Sprechblasen.
 * Komplett getrennt von der Comic-Buch-Produktion.
 *
 * Flow:
 *   1. Charaktere aus Foto beschreiben (wie Cover)
 *   2. GPT-4.1: Struktur für 2-3 Panels (1 Moment)
 *   3. gpt-image-2: 1 Bild mit Panels (direkt mit Referenzfoto, wie Cover)
 *   4. Panels + Bubbles zurückgeben → Frontend legt Bubbles als Overlay drauf
 */

"use strict";

const express = require("express");
const router = express.Router();
const OpenAI = require("openai");
const { saveImage } = require("../lib/storage");
const { rewriteIfRisky, sanitizePrompt } = require("../lib/safety-rewriter");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Poster-Stil: cinematisch, weniger Panel-Regeln als Comic-Seiten ───────────
const POSTER_STYLE = [
  "EUROPEAN BANDE DESSINÉE ILLUSTRATION — Franco-Belgian comic book style, similar to Blacksad or Bastien Vivès.",
  "Bold clean ink outlines (4-5px) on every figure, face, hair, and object.",
  "Flat cel-shaded color areas with HARD EDGES, NOT photographic gradients.",
  "Warm cinematic colors: golden tones, rich shadows, vivid saturated hues.",
  "Expressive stylized faces — clearly drawn ink lines. NOT photographic faces.",
  "Hair rendered as SOLID COLOR SHAPES with ink line detail.",
  "STRICT PROHIBITION: NOT manga. NOT anime. NOT photorealistic. NOT CGI. NOT watercolor.",
  "This is a COMIC POSTER — one image divided into 2-3 panels with thick black borders.",
  "Each panel has a THICK BLACK BORDER (5-6px). Panels are arranged in a clear grid.",
].join(" ");

const MOOD_MOD = {
  action:    "Dynamic poses, strong perspective, high contrast colors, motion energy.",
  emotional: "Warm golden tones, intimate framing, soft dramatic shadows, tender atmosphere.",
  humor:     "Exaggerated expressions in WESTERN COMIC STYLE — wide smiles, raised eyebrows. Bright vivid colors, playful energy.",
};

// ── Fetch image buffer from URL ───────────────────────────────────────────────
async function fetchBuffer(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(25000) });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// ── Build File from buffer ────────────────────────────────────────────────────
function toFile(bufferOrBase64, name = "reference.jpg") {
  const buf = typeof bufferOrBase64 === "string"
    ? Buffer.from(bufferOrBase64.replace(/^data:image\/\w+;base64,/, ""), "base64")
    : bufferOrBase64;
  const blob = new Blob([buf], { type: "image/jpeg" });
  return new File([blob], name, { type: "image/jpeg" });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/poster/structure
// GPT-4.1: Generiert Struktur für 1 Moment → 2-3 Panels mit Dialogen
// ─────────────────────────────────────────────────────────────────────────────
router.post("/structure", async (req, res) => {
  try {
    const {
      moment,           // string: der eine Moment ("Scharfe Suppe im Restaurant")
      characters,       // [{name, visual_anchor}]
      language = "de",
      tone = "humorvoll",
      comicStyle = "emotional",
      category = "freunde",
    } = req.body;

    const langMap = { de: "German", en: "English", fr: "French", es: "Spanish" };
    const lang = langMap[language] || "German";

    const toneMap = {
      humorvoll: "humorous and light-hearted",
      kindgerecht: "warm and child-friendly",
      romantisch: "romantic and tender",
      biografisch: "nostalgic and personal",
      episch: "epic and adventurous",
    };
    const toneEn = toneMap[tone] || "warm and personal";

    const categoryMap = {
      liebe: "love story / romance",
      familie: "family story",
      urlaub: "travel / vacation",
      feier: "celebration / event",
      biografie: "biography / life story",
      freunde: "friendship",
      sonstiges: "personal story",
    };
    const categoryEn = categoryMap[category] || "personal story";

    const charNames = characters.map(c => c.name).join(", ");

    // Sanitize the moment text before using it in prompts
    const safeMoment = sanitizePrompt(moment || "");

    const structRes = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [{
        role: "system",
        content: `You create a COMIC POSTER structure for a single scene in ${lang}.
Genre: ${categoryEn}. Tone: ${toneEn}. Style: ${comicStyle}.

A comic poster shows ONE moment in 2-3 panels. It is printed as a single image.

PANEL COUNT:
- 2 panels: simple moment, 2 characters max, clear action-reaction
- 3 panels: richer moment, multiple characters, beginning-middle-end

SHOT VARIATION (REQUIRED):
- Panel 1: Wide shot — establish location and all characters
- Panel 2: Medium shot — main action or interaction
- Panel 3 (if used): Close-up — emotional reaction or punchline

DIALOGS:
- Each panel can have 1-2 speech bubbles
- Keep dialogs SHORT (5-15 words) — they appear as overlays on the poster
- Natural, funny, or emotional — match the tone
- Use "dialogs" array format for conversations

CHARACTERS: ${charNames}

Respond ONLY with JSON:
{
  "title": "Short poster title in ${lang}",
  "location": "English location description",
  "panelCount": 2,
  "panels": [
    {
      "nummer": 1,
      "szene": "Wide shot: [visual description in English, what characters do and feel and WHERE]",
      "dialogs": [{"speaker": "Name", "text": "${lang} dialog 5-15 words"}],
      "bubble_type": "speech"
    }
  ]
}`
      }, {
        role: "user",
        content: `Scene to illustrate: ${safeMoment}\nCharacters: ${charNames}`,
      }],
      response_format: { type: "json_object" },
      temperature: 0.8,
    });

    const data = JSON.parse(structRes.choices[0].message.content || "{}");
    res.json(data);

  } catch (err) {
    console.error("Poster structure error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/poster/generate
// gpt-image-2: Generiert das Poster-Bild (Panels ohne Text)
// Direkt mit Referenzfoto wie beim Cover → beste Qualität
// ─────────────────────────────────────────────────────────────────────────────
router.post("/generate", async (req, res) => {
  try {
    const {
      structure,            // {title, location, panelCount, panels}
      characters = [],      // [{name, visual_anchor, inPhoto}]
      comicStyle = "emotional",
      referenceImages = [],
      referenceImageUrls = [],
      projectId,
      orientation = "portrait", // "portrait" (1024×1536) | "landscape" (1536×1024)
    } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: "projectId is required" });
    }

    const mood = MOOD_MOD[comicStyle] || MOOD_MOD.emotional;
    const panelCount = structure.panels?.length || 2;
    const location = structure.location || "cozy indoor setting";

    // Layout description based on panel count
    const layoutDesc = panelCount === 2
      ? "2 panels side by side (left and right, equal width)"
      : "3 panels: 1 wide panel on top, 2 smaller panels side by side on bottom";

    const charNames = characters.map(c => c.name).join(", ");
    const charAnchors = characters.map(c => `${c.name}: ${c.visual_anchor || c.name}`).join(". ");

    // Safety rewrite panel descriptions
    const originalPanelDesc = structure.panels
      .map(p => `Panel ${p.nummer}: ${p.szene}`)
      .join("\n");
    const panelDescriptions = await rewriteIfRisky(originalPanelDesc);

    // Sanitize location — replace specific park/ride names that trigger safety
    const safeLocation = sanitizePrompt(location)
      .replace(/\b(europapark|europa-park|disneyland|disney|legoland|phantasialand|heide park|holiday park)\b/gi, "amusement park")
      .replace(/\b(achterbahn|roller coaster|coaster|ride|fahrgeschäft|karussell|carousel)\b/gi, "park attraction")
      .replace(/\b(wildwasser|water ride|log flume)\b/gi, "water attraction")
      .replace(/\b(geisterbahn|haunted)\b/gi, "fun attraction");

    const imageSize = orientation === "landscape" ? "1536x1024" : "1024x1536";

    const prompt = sanitizePrompt(`${POSTER_STYLE} ${mood}

POSTER LAYOUT: ${layoutDesc}
THICK BLACK BORDERS between all panels. Each panel is a separate contained scene.

CHARACTERS — draw with IDENTICAL faces across all ${panelCount} panels:
${charAnchors}

FACE CONSISTENCY (CRITICAL):
- Study the reference image carefully before drawing
- Draw EXACT SAME faces in ALL panels: same eye shape, nose, mouth, hair, skin tone
- Characters must be recognizable as the SAME people across all panels

BODY INTEGRATION (CRITICAL — NO "HEAD ON NECK" EFFECT):
- Draw characters in DYNAMIC POSES with natural body language
- 3/4 view, slight turns, leaning — NOT straight-on frontal poses
- Head, neck, shoulders flow naturally — no visible disconnection

CAMERA RULES (CRITICAL):
- ZERO characters look directly at the viewer/camera — FORBIDDEN
- Characters look at each other, at objects, at the environment
- Show characters from the side, 3/4 view, over-the-shoulder

PANELS:
${panelDescriptions}

LOCATION: ${safeLocation}

RULES:
- Each panel shows a DIFFERENT moment/action — NEVER repeat the same scene
- Panel 1: Wide establishing shot
- Panel 2: Medium shot, main action
${panelCount === 3 ? "- Panel 3: Close-up reaction or punchline" : ""}
- NO text, NO speech bubbles, NO letters anywhere in the image
- Characters wear casual clothes appropriate for ${location}`);

    // ── Reference strategy: use photo directly (like cover) ───────────────────
    const primaryRefUrl = referenceImageUrls[0]?.url || null;
    const primaryRefBase64 = referenceImages[0] || null;

    let imageUrl = null;

    if (primaryRefUrl || primaryRefBase64) {
      try {
        let refFile;
        if (primaryRefUrl) {
          const buf = await fetchBuffer(primaryRefUrl);
          refFile = toFile(buf);
        } else {
          refFile = toFile(primaryRefBase64);
        }

        console.log(`🎨 Generating poster (${panelCount} panels, ${orientation}, ref: photo)`);

        const res2 = await openai.images.edit({
          model: "gpt-image-2",
          image: refFile,
          prompt: `${POSTER_STYLE}

CRITICAL IDENTITY RULES:
Use the reference photo ONLY to identify the characters' faces and body proportions.
Redraw them COMPLETELY in the comic style — bold ink outlines, flat colors, stylized faces.
DO NOT copy the photographic look. This must look DRAWN, not filtered.
SAME gender, SAME face structure, SAME ethnicity as in the photo.

${prompt}`,
          size: imageSize,
          quality: "high",
        });

        const item = (res2.data || [])[0];
        imageUrl = item?.url || (item?.b64_json ? `data:image/png;base64,${item.b64_json}` : null);
        console.log(`  → images.edit() succeeded`);

      } catch (e) {
        console.warn(`  → images.edit() failed: ${e.message}, falling back to generate`);
      }
    }

    // Fallback: generate without reference — use ultra-safe prompt
    if (!imageUrl) {
      console.log(`🎨 Generating poster (${panelCount} panels, ${orientation}, ref: none)`);

      // Ultra-safe fallback prompt — strip specific locations/activities
      const safePrompt = sanitizePrompt(`${POSTER_STYLE} ${mood}

POSTER LAYOUT: ${layoutDesc}
THICK BLACK BORDERS between all panels.

CHARACTERS:
${charAnchors}

PANELS:
${panelDescriptions}

LOCATION: cheerful outdoor setting with families enjoying their day

RULES:
- Each panel shows a DIFFERENT moment
- Panel 1: Wide shot of characters together in a happy setting
- Panel 2: Medium shot, characters interacting warmly
${panelCount === 3 ? "- Panel 3: Close-up of joyful expressions" : ""}
- NO text, NO speech bubbles, NO letters anywhere in the image
- Characters wear casual comfortable clothes`);

      try {
        const res3 = await openai.images.generate({
          model: "gpt-image-2",
          prompt: safePrompt,
          n: 1,
          size: imageSize,
          quality: "high",
        });
        const item = (res3.data || [])[0];
        imageUrl = item?.url || (item?.b64_json ? `data:image/png;base64,${item.b64_json}` : null);
      } catch (e2) {
        console.error(`  → generate() also failed: ${e2.message}`);
        // Last resort: completely generic safe prompt
        const lastResort = `${POSTER_STYLE} ${mood} Comic poster with ${panelCount} panels showing a happy family spending quality time together outdoors. Bold ink outlines, flat colors. NO text anywhere.`;
        const res4 = await openai.images.generate({
          model: "gpt-image-2",
          prompt: lastResort,
          n: 1,
          size: imageSize,
          quality: "high",
        });
        const item = (res4.data || [])[0];
        imageUrl = item?.url || (item?.b64_json ? `data:image/png;base64,${item.b64_json}` : null);
      }
    }

    if (!imageUrl) {
      return res.status(500).json({ error: "No image generated" });
    }

    // Save to Supabase
    const savedUrl = await saveImage(imageUrl, projectId, `poster-${Date.now()}`);
    console.log(`✓ Poster done: ${savedUrl}`);

    res.json({
      imageUrl: savedUrl || imageUrl,
      panels: structure.panels,
      projectId,
    });

  } catch (err) {
    console.error("Poster generate error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/poster/describe-characters
// Beschreibt Charaktere aus Foto (wie Comic-Buch, aber vereinfacht)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/describe-characters", async (req, res) => {
  try {
    const {
      characterNames,       // ["Jil", "Tek", "Ray"]
      referenceImageUrls = [],
      referenceImages = [],
    } = req.body;

    const primaryRefUrl = referenceImageUrls[0]?.url || null;
    const primaryRefBase64 = referenceImages[0] || null;

    if (!primaryRefUrl && !primaryRefBase64) {
      // No photo — return minimal descriptions
      const characters = characterNames.map(name => ({
        name,
        visual_anchor: `${name}, adult person`,
        inPhoto: false,
      }));
      return res.json({ characters });
    }

    // Fetch photo
    let refImageContent;
    if (primaryRefUrl) {
      try {
        const photoBuffer = await fetchBuffer(primaryRefUrl);
        const photoBase64 = photoBuffer.toString("base64");
        refImageContent = { type: "image_url", image_url: { url: `data:image/jpeg;base64,${photoBase64}`, detail: "high" } };
      } catch (e) {
        refImageContent = { type: "image_url", image_url: { url: primaryRefUrl, detail: "high" } };
      }
    } else {
      refImageContent = { type: "image_url", image_url: { url: `data:image/jpeg;base64,${primaryRefBase64}`, detail: "high" } };
    }

    // Describe each character from photo
    const characters = await Promise.all(characterNames.map(async (name) => {
      try {
        const r = await openai.chat.completions.create({
          model: "gpt-4.1",
          messages: [{ role: "user", content: [
            refImageContent,
            { type: "text", text: `Describe the person named "${name}" in this photo.
Write 30-40 words about FACE AND BODY ONLY — NO clothing.
Include: approximate age, hair color/style, skin tone, eye color, face shape, distinctive features, body type.
Format: "${name}: [age] years old, [hair], [skin tone], [eye color], [face shape], [features], [body type]"
English only.` },
          ]}],
          max_tokens: 100,
        });
        return {
          name,
          visual_anchor: r.choices[0].message.content || `${name}, adult person`,
          inPhoto: true,
        };
      } catch (e) {
        return { name, visual_anchor: `${name}, adult person`, inPhoto: false };
      }
    }));

    res.json({ characters });

  } catch (err) {
    console.error("Poster describe-characters error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
