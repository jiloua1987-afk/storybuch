const express = require("express");
const router = express.Router();
const OpenAI = require("openai");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Stil-Referenzbild (Comic.png) einmalig laden ──────────────────────────────
// Wird als fixer Bestandteil bei JEDEM Bild-Call mitgeschickt
let STYLE_REF_B64 = null;
try {
  const refPath = path.join(__dirname, "../../style-reference.png");
  if (fs.existsSync(refPath)) {
    STYLE_REF_B64 = fs.readFileSync(refPath).toString("base64");
    console.log("Style reference loaded:", refPath);
  }
} catch (e) {
  console.warn("No style reference found:", e.message);
}

// ── Kategorie-spezifische Atmosphäre ─────────────────────────────────────────
const CATEGORY_MOOD = {
  familie:   "warm sunny family atmosphere, joyful children playing, cozy family moments",
  urlaub:    "bright Mediterranean vacation, turquoise sea, golden sand, holiday joy",
  liebe:     "romantic golden light, intimate couple moments, tender gestures",
  feier:     "festive celebration atmosphere, colorful decorations, happy group",
  biografie: "nostalgic warm atmosphere, timeless settings, life journey",
  freunde:   "fun friendship moments, laughter, shared adventures",
  sonstiges: "warm personal atmosphere, emotional storytelling",
};

// ── Comic-Stil Modifikatoren ──────────────────────────────────────────────────
const COMIC_STYLE_MOD = {
  action:    "dynamic poses, motion lines, exaggerated expressions, high energy, dramatic angles",
  emotional: "tender close-ups, soft warm lighting, emotional facial expressions, intimate framing",
  humor:     "exaggerated funny reactions, comedic timing, playful body language, bright cheerful colors",
};

// ── Illustrationsstil ─────────────────────────────────────────────────────────
const ILLUS_STYLE = {
  comic:       "warm watercolor comic illustration, bold black outlines, vibrant saturated colors, cinematic lighting, hand-drawn feel",
  aquarell:    "soft watercolor illustration, pastel colors, gentle brushstrokes, dreamy romantic atmosphere",
  bleistift:   "detailed pencil sketch comic, crosshatching shadows, hand-drawn linework",
  realistisch: "realistic comic art, detailed digital painting, warm cinematic lighting",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
async function fetchBuf(url) {
  try {
    if (url.startsWith("data:")) return Buffer.from(url.replace(/^data:image\/\w+;base64,/, ""), "base64");
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch { return null; }
}

function escXml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function wrapText(text, maxChars) {
  const words = String(text).split(" ");
  const lines = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > maxChars) {
      if (current) lines.push(current.trim());
      current = word;
    } else {
      current = (current + " " + word).trim();
    }
  }
  if (current) lines.push(current.trim());
  return lines;
}

function getPanelLayouts(panelCount, W, H) {
  const b = 10, titleH = 70;
  const uH = H - titleH - b, uW = W - b * 2;

  if (panelCount === 3) return [
    { x: b, y: titleH, width: uW, height: uH * 0.45 },
    { x: b, y: titleH + uH * 0.45 + b, width: uW / 2 - b / 2, height: uH * 0.55 - b },
    { x: b + uW / 2 + b / 2, y: titleH + uH * 0.45 + b, width: uW / 2 - b / 2, height: uH * 0.55 - b },
  ];

  if (panelCount === 5) {
    const rH = uH / 3;
    return [
      { x: b, y: titleH, width: uW / 2 - b / 2, height: rH - b / 2 },
      { x: b + uW / 2 + b / 2, y: titleH, width: uW / 2 - b / 2, height: rH - b / 2 },
      { x: b, y: titleH + rH + b / 2, width: uW, height: rH - b },
      { x: b, y: titleH + rH * 2 + b, width: uW / 2 - b / 2, height: rH - b / 2 },
      { x: b + uW / 2 + b / 2, y: titleH + rH * 2 + b, width: uW / 2 - b / 2, height: rH - b / 2 },
    ];
  }

  if (panelCount === 6) {
    const rH = uH / 3, cW = uW / 2;
    return [0,1,2,3,4,5].map(i => ({
      x: b + (i % 2) * (cW + b / 2),
      y: titleH + Math.floor(i / 2) * (rH + b / 3),
      width: cW - b / 2,
      height: rH - b / 3,
    }));
  }

  // Default 2x2
  const rH = uH / 2;
  return [
    { x: b, y: titleH, width: uW / 2 - b / 2, height: rH - b / 2 },
    { x: b + uW / 2 + b / 2, y: titleH, width: uW / 2 - b / 2, height: rH - b / 2 },
    { x: b, y: titleH + rH + b / 2, width: uW / 2 - b / 2, height: rH - b / 2 },
    { x: b + uW / 2 + b / 2, y: titleH + rH + b / 2, width: uW / 2 - b / 2, height: rH - b / 2 },
  ];
}

function buildPageSVG(pageTitle, panels, W, H) {
  const layouts = getPanelLayouts(panels.length, W, H);
  // WICHTIG: Kein Text im SVG wegen Fontconfig-Problem auf Railway
  // Nur geometrische Elemente (Rechtecke, Linien)
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">`;

  // Cream Hintergrund oben für Titel-Bereich
  svg += `<rect x="0" y="0" width="${W}" height="70" fill="#F5EDE0"/>`;
  // Schwarze Linie unter Titel-Bereich
  svg += `<rect x="0" y="68" width="${W}" height="2" fill="#1A1410"/>`;

  // Panel-Rahmen
  panels.forEach((panel, i) => {
    const l = layouts[i] || layouts[0];
    svg += `<rect x="${l.x}" y="${l.y}" width="${l.width}" height="${l.height}" fill="none" stroke="#1A1410" stroke-width="4"/>`;

    // Caption-Box (weißes Rechteck ohne Text)
    if (panel.dialog) {
      const text = panel.speaker ? `${panel.speaker}: ${panel.dialog}` : panel.dialog;
      const lines = wrapText(text, 24);
      const boxH = lines.length * 20 + 14;
      const boxW = Math.min(l.width * 0.6, 260);
      const margin = 8;
      const isRight = i % 2 !== 0;
      const bx = isRight ? l.x + l.width - boxW - margin : l.x + margin;
      const by = l.y + margin;

      // Weißer Hintergrund
      svg += `<rect x="${bx}" y="${by}" width="${boxW}" height="${boxH}" fill="white" stroke="#1A1410" stroke-width="2" rx="3"/>`;

      // Text als SVG-Text (einfachste Form)
      lines.forEach((line, li) => {
        svg += `<text x="${bx + 6}" y="${by + 14 + li * 20}"
          font-size="12" fill="#1A1410"
          font-family="sans-serif"
          font-weight="bold">${escXml(line)}</text>`;
      });
    }
  });

  svg += `</svg>`;
  return svg;
}

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
${mustHaveSentences ? `MUST include these moments: ${mustHaveSentences}` : ""}

IMPORTANT - Vary panel count per page to avoid monotony:
- Page 1: 4 panels (2x2 grid)
- Page 2: 3 panels (wide panoramic top + 2 bottom) — use for dramatic/scenic moments
- Page 3: 5 panels (2 top + wide middle + 2 bottom)
- Page 4: 4 panels (2x2 grid)
- Additional pages: alternate 3, 4, 5

Each panel needs a very specific visual scene and short dialog.
Respond ONLY with JSON: {"pages": [{"id":"page1","pageNumber":1,"title":"Title in ${lang}","location":"English location description","timeOfDay":"afternoon","panels":[{"nummer":1,"szene":"Very specific English scene: who does what, where, emotion, camera angle, lighting","dialog":"Short ${lang} dialog max 8 words","speaker":"Character name or null","bubble_type":"speech"}]}]}` },
          { role: "user", content: ctx },
        ],
        response_format: { type: "json_object" },
        temperature: 0.85,
      }),
      openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `Extract all main characters from the story. Respond ONLY with JSON: {"characters":[{"name":"Name","age":30,"visual_anchor":"Precise English visual description for comic artist: age, hair color and style, eye color, skin tone, clothing colors, distinctive features"}]}` },
          { role: "user", content: ctx },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      }),
    ]);

    const pages = JSON.parse(structRes.choices[0].message.content || "{}").pages || [];
    let characters = JSON.parse(charRes.choices[0].message.content || "{}").characters || [];

    // GPT-4o Vision: Referenzfoto analysieren → präzise Beschreibung
    if (referenceImages.length > 0) {
      console.log(`Analyzing ${referenceImages.length} reference photo(s) with GPT-4o Vision...`);
      characters = await Promise.all(characters.map(async (char, i) => {
        const ref = referenceImages[i] || referenceImages[0];
        if (!ref) return char;
        try {
          const r = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: [
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${ref}`, detail: "high" } },
              { type: "text", text: `Look at this photo. Describe the visual appearance of the people for a comic book artist who needs to draw cartoon versions of them. Focus ONLY on visual features: approximate age range, hair color and texture, skin tone, clothing colors and style. Do NOT identify anyone. Write in English, max 70 words per person. Start with "Person ${i+1} (${char.name}):"` },
            ]}],
            max_tokens: 150,
          });
          const desc = r.choices[0].message.content || "";
          console.log(`✓ ${char.name}: ${desc.substring(0, 80)}...`);
          return { ...char, visual_anchor: desc, refBase64: ref };
        } catch (e) {
          console.error(`Photo analysis failed for ${char.name}:`, e.message);
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

// ── Optimierter Prompt-Builder (basierend auf ChatGPT-Empfehlung) ─────────────
function buildComicPrompt({ scenes, characters = [], location = "", illustrationStyle = "comic", comicStyle = "emotional", category = "familie" }) {
  const style = ILLUS_STYLE[illustrationStyle] || ILLUS_STYLE.comic;
  const comicMod = COMIC_STYLE_MOD[comicStyle] || COMIC_STYLE_MOD.emotional;
  const mood = CATEGORY_MOOD[category] || CATEGORY_MOOD.familie;

  const characterBlock = `CRITICAL CHARACTER REQUIREMENT:
Use the provided reference image as the primary identity source.
All characters MUST closely match:
- faces, hair (style + color), body proportions, age
DO NOT invent new faces. DO NOT change identity.
${characters.length > 0 ? `Character descriptions for reference:\n${characters.map(c => `- ${c.name}: ${c.visual_anchor}`).join("\n")}` : ""}

CONSISTENCY REQUIREMENT:
All characters must remain identical across ALL panels:
- same faces, same proportions, same clothing style, same colors`;

  const styleBlock = `STYLE:
${style}, ${comicMod}, ${mood}
cinematic lighting, clean, professional illustration quality`;

  const layoutBlock = `COMIC PAGE LAYOUT:
Create a single A4 portrait comic page (tall format, like a classic comic book).
${scenes.length} panels with clean white borders between them.
Layout: ${scenes.length <= 3 ? "1 wide panel top, 2 panels bottom" : scenes.length === 5 ? "2 panels top row, 1 wide panel middle, 2 panels bottom row" : "2 panels top row, 2 panels bottom row"}

CAMERA ANGLES - vary between panels for dynamic storytelling:
- Use WIDE SHOTS and FULL BODY shots for action/scene panels
- Use MEDIUM SHOTS (waist up) for conversation panels  
- Use CLOSE-UPS sparingly, only for emotional moments
- AVOID cutting off heads or bodies at panel edges
- Show full figures whenever possible

IMPORTANT:
NO text, NO speech bubbles, NO captions in the image.
Leave empty space in top-left or top-right corner of each panel for text overlay.`;

  const sceneBlock = `SCENES:
${scenes.map((scene, i) => `${i + 1}. ${scene}`).join("\n")}`;

  const environmentBlock = `ENVIRONMENT:
${location || "beautiful scenic location"}, ${mood}
LIGHTING: bright daylight for active scenes, golden hour for emotional scenes`;

  const negativeBlock = `NEGATIVE:
text, speech bubbles, captions, watermark, distorted faces, inconsistent characters, extra fingers, unrealistic anatomy`;

  return `Create a high-quality illustrated comic page.

${characterBlock}

${layoutBlock}

${styleBlock}

${sceneBlock}

${environmentBlock}

${negativeBlock}`;
}
router.post("/page", async (req, res) => {
  try {
    const { page, characters = [], illustrationStyle = "comic", comicStyle = "emotional", category = "familie" } = req.body;

    // Optimierter Prompt mit buildComicPrompt
    const scenes = page.panels.map(p => p.szene);
    const fullPrompt = buildComicPrompt({
      scenes,
      characters,
      location: page.location || "",
      illustrationStyle,
      comicStyle,
      category,
    });

    console.log(`Generating page "${page.title}" (${page.panels.length} panels, style: ${illustrationStyle}, category: ${category})`);

    // Option 1: Edit API mit Referenzfoto (beste Figuren-Ähnlichkeit)
    const primaryRef = characters.find(c => c.refBase64)?.refBase64;
    let rawUrl = "";

    if (primaryRef) {
      try {
        console.log("Using Edit API with reference photo...");
        const imgBuf = Buffer.from(primaryRef, "base64");
        const { Blob } = require("buffer");
        const blob = new Blob([imgBuf], { type: "image/jpeg" });
        const file = new File([blob], "reference.jpg", { type: "image/jpeg" });
        const editRes = await openai.images.edit({
          model: "gpt-image-1",
          image: file,
          prompt: `Use the reference image as the PRIMARY identity source for all characters. ${fullPrompt}`,
          n: 1,
          size: "1024x1536",
        });
        const item = (editRes.data || [])[0];
        if (item?.url) {
          rawUrl = item.url;
        } else if (item?.b64_json) {
          const imgBuf2 = Buffer.from(item.b64_json, "base64");
          const small = await sharp(imgBuf2).resize(1200, null).jpeg({ quality: 90 }).toBuffer();
          rawUrl = `data:image/jpeg;base64,${small.toString("base64")}`;
        }
        if (rawUrl) console.log("✓ Edit API success, size:", Math.round(rawUrl.length / 1024), "KB");
      } catch (e) {
        console.error("Edit API failed:", e.message, "→ falling back to generate");
      }
    }

    // Option 2: Standard generate mit starkem Konsistenz-Prompt
    if (!rawUrl) {
      console.log("Using standard generate...");
      const genRes = await openai.images.generate({
        model: "gpt-image-1",
        prompt: fullPrompt,
        n: 1,
        size: "1024x1536",
        quality: "high",
      });
      const item = (genRes.data || [])[0];
      if (item?.url) {
        rawUrl = item.url;
      } else if (item?.b64_json) {
        const imgBuf2 = Buffer.from(item.b64_json, "base64");
        const small = await sharp(imgBuf2).resize(1200, null).jpeg({ quality: 90 }).toBuffer();
        rawUrl = `data:image/jpeg;base64,${small.toString("base64")}`;
      }
    }

    if (!rawUrl) {
      console.error("No image URL generated for page:", page.title);
      // Retry once with standard generate
      console.log("Retrying with standard generate...");
      try {
        const retryRes = await openai.images.generate({
          model: "gpt-image-1",
          prompt: fullPrompt,
          n: 1,
          size: "1536x1024",
          quality: "high",
        });
        const retryItem = (retryRes.data || [])[0];
        if (retryItem?.url) rawUrl = retryItem.url;
        else if (retryItem?.b64_json) {
          const imgBuf2 = Buffer.from(retryItem.b64_json, "base64");
          const small = await sharp(imgBuf2).resize(1200, null).jpeg({ quality: 90 }).toBuffer();
          rawUrl = `data:image/jpeg;base64,${small.toString("base64")}`;
        }
      } catch (retryErr) {
        console.error("Retry also failed:", retryErr.message);
      }
    }

    if (!rawUrl) return res.json({ imageUrl: "" });

    // Sharp Text-Overlay: Titel + Caption-Boxen auf das Bild legen
    try {
      const buf = await fetchBuf(rawUrl);
      if (!buf) return res.json({ imageUrl: rawUrl });

      const resized = await sharp(buf).resize(900, null, { withoutEnlargement: true }).toBuffer();
      const meta = await sharp(resized).metadata();
      const W = meta.width || 900, H = meta.height || 1273;
      const svgStr = buildPageSVG(page.title, page.panels, W, H);

      const comp = await sharp(resized)
        .composite([{ input: Buffer.from(svgStr), top: 0, left: 0 }])
        .jpeg({ quality: 88 })
        .toBuffer();

      const sizeKB = Math.round(comp.length / 1024);
      console.log(`✓ Page "${page.title}" done with overlay, size: ${sizeKB}KB`);
      return res.json({ imageUrl: `data:image/jpeg;base64,${comp.toString("base64")}` });
    } catch (overlayErr) {
      console.error("Overlay failed, returning raw image:", overlayErr.message);
      return res.json({ imageUrl: rawUrl });
    }
  } catch (err) {
    console.error("Page error:", err.message);
    res.status(500).json({ error: err.message, imageUrl: "" });
  }
});

// ── POST /api/comic/cover ─────────────────────────────────────────────────────
router.post("/cover", async (req, res) => {
  try {
    const { title, characters = [], category = "familie", illustrationStyle = "comic", location = "" } = req.body;

    const style = ILLUS_STYLE[illustrationStyle] || ILLUS_STYLE.comic;
    const mood = CATEGORY_MOOD[category] || CATEGORY_MOOD.familie;
    const charDesc = characters.map(c => `${c.name}: ${c.visual_anchor}`).join(", ");

    const prompt = `Create a beautiful comic book COVER illustration. ${charDesc ? `Main characters (draw them accurately): ${charDesc}.` : ""} Setting: ${location || "beautiful scenic location"}. Mood: ${mood}. Style: ${style}, professional cover quality, cinematic composition, portrait orientation. Characters prominently featured in foreground. NO text, NO title, NO letters anywhere in the image.`;

    // Mit Referenzfoto wenn vorhanden
    const primaryRef = characters.find(c => c.refBase64)?.refBase64;
    let rawUrl = "";

    if (primaryRef) {
      try {
        const { Blob } = require("buffer");
        const blob = new Blob([Buffer.from(primaryRef, "base64")], { type: "image/jpeg" });
        const file = new File([blob], "reference.jpg", { type: "image/jpeg" });
        const editRes = await openai.images.edit({
          model: "gpt-image-1",
          image: file,
          prompt: `Use the people from this reference photo as the main characters for this comic book cover. ${prompt}`,
          n: 1,
          size: "1024x1536",
        });
        const item = (editRes.data || [])[0];
        if (item?.url) rawUrl = item.url;
        else if (item?.b64_json) {
          const imgBuf2 = Buffer.from(item.b64_json, "base64");
          const small = await sharp(imgBuf2).resize(600, null).jpeg({ quality: 85 }).toBuffer();
          rawUrl = `data:image/jpeg;base64,${small.toString("base64")}`;
        }
      } catch (e) {
        console.error("Cover edit API failed:", e.message);
      }
    }

    if (!rawUrl) {
      const genRes = await openai.images.generate({ model: "gpt-image-1", prompt, n: 1, size: "1024x1536", quality: "high" });
      const item = (genRes.data || [])[0];
      rawUrl = item?.url || "";
      if (!rawUrl && item?.b64_json) {
        const imgBuf2 = Buffer.from(item.b64_json, "base64");
        const small = await sharp(imgBuf2).resize(600, null).jpeg({ quality: 85 }).toBuffer();
        rawUrl = `data:image/jpeg;base64,${small.toString("base64")}`;
      }
    }

    if (!rawUrl) return res.json({ coverImageUrl: "" });

    // Bild laden
    let buf = await fetchBuf(rawUrl);
    if (!buf) return res.json({ coverImageUrl: rawUrl });

    // Nur skalieren wenn es noch nicht komprimiert wurde (URL-Fall)
    if (rawUrl.startsWith("http")) {
      buf = await sharp(buf).resize(700, null, { withoutEnlargement: true }).toBuffer();
    }

    const meta = await sharp(buf).metadata();
    const W = meta.width || 700, H = meta.height || 1050;

    // Dynamischer Titelumbruch
    const titleWords = title.split(" ");
    const titleLines = [];
    let currentLine = "";
    for (const word of titleWords) {
      if ((currentLine + " " + word).trim().length > 18) {
        if (currentLine) titleLines.push(currentLine.trim());
        currentLine = word;
      } else {
        currentLine = (currentLine + " " + word).trim();
      }
    }
    if (currentLine) titleLines.push(currentLine.trim());

    const overlayH = Math.round(H * 0.42);
    const titleFontSize = titleLines.length > 2 ? 42 : 52;
    const titleLineHeight = titleFontSize + 12;
    const totalTitleH = titleLines.length * titleLineHeight;
    const titleStartY = H - overlayH * 0.55 - totalTitleH / 2;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">`;
    svg += `<defs>
      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(0,0,0,0)"/>
        <stop offset="60%" stop-color="rgba(10,5,2,0.75)"/>
        <stop offset="100%" stop-color="rgba(10,5,2,0.95)"/>
      </linearGradient>
    </defs>`;
    svg += `<rect x="0" y="${H - overlayH}" width="${W}" height="${overlayH}" fill="url(#g)"/>`;

    // Titel-Zeilen
    titleLines.forEach((line, i) => {
      svg += `<text x="${W / 2}" y="${titleStartY + i * titleLineHeight}"
        text-anchor="middle"
        font-family="sans-serif"
        font-size="${titleFontSize}"
        font-weight="bold"
        fill="white"
      >${escXml(line)}</text>`;
    });

    // Goldene Linie unter Titel
    const lineY = titleStartY + totalTitleH + 16;
    svg += `<rect x="${W / 2 - 50}" y="${lineY}" width="100" height="3" fill="#C9963A" rx="1"/>`;

    // Untertitel (Ort/Kategorie) wenn vorhanden
    if (location || category) {
      const subtitle = location || category;
      svg += `<text x="${W / 2}" y="${lineY + 32}"
        text-anchor="middle"
        font-family="sans-serif"
        font-size="18"
        fill="rgba(255,255,255,0.75)"
        letter-spacing="2"
      >${escXml(subtitle.toUpperCase())}</text>`;
    }

    svg += `</svg>`;

    const comp = await sharp(buf).composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).jpeg({ quality: 85 }).toBuffer();
    res.json({ coverImageUrl: `data:image/jpeg;base64,${comp.toString("base64")}` });
  } catch (err) {
    console.error("Cover error:", err.message);
    res.status(500).json({ error: err.message, coverImageUrl: "" });
  }
});

// ── POST /api/comic/ending ────────────────────────────────────────────────────
router.post("/ending", async (req, res) => {
  try {
    const { storyInput, guidedAnswers = {}, tone, language, dedication } = req.body;
    const langMap = { de: "German", en: "English", fr: "French", es: "Spanish" };
    const lang = langMap[language] || "German";

    const r = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: `Write a warm, emotional and personal closing text for a comic book in ${lang}. Tone: ${tone || "warm, nostalgic, loving"}. 3-4 short sentences. Make it feel like a heartfelt letter — personal, touching, like something you'd write to someone you love. No title.` },
        { role: "user", content: storyInput || Object.values(guidedAnswers).filter(Boolean).join(", ") },
      ],
      max_tokens: 150, temperature: 0.9,
    });

    const endText = r.choices[0].message.content || "";
    const W = 900, H = 600;
    const textLines = wrapText(endText, 48);
    const dedLines = dedication ? wrapText(`"${dedication}"`, 44) : [];

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">`;
    // Warmer Hintergrund mit leichtem Muster
    svg += `<rect width="${W}" height="${H}" fill="#FDF8F2"/>`;
    // Dekorative Ecken
    svg += `<rect x="30" y="30" width="${W-60}" height="${H-60}" fill="none" stroke="#E8D9C0" stroke-width="1.5" rx="4"/>`;
    svg += `<rect x="36" y="36" width="${W-72}" height="${H-72}" fill="none" stroke="#E8D9C0" stroke-width="0.5" rx="2"/>`;

    // Obere Dekoration
    svg += `<rect x="${W/2-60}" y="55" width="120" height="2" fill="#C9963A" rx="1"/>`;
    svg += `<text x="${W/2}" y="48" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#C9963A" letter-spacing="5">${escXml("✦  ERINNERUNGEN  ✦")}</text>`;

    // Haupttext
    const startY = 110;
    textLines.forEach((line, i) => {
      svg += `<text x="${W/2}" y="${startY + i * 38}" text-anchor="middle" font-family="sans-serif" font-size="22" fill="#2d1b4e" font-style="italic">${escXml(line)}</text>`;
    });

    // Trennlinie
    const divY = startY + textLines.length * 38 + 30;
    svg += `<rect x="${W/2-30}" y="${divY}" width="60" height="1.5" fill="#C9963A" rx="1"/>`;

    // Widmung
    if (dedLines.length > 0) {
      const dedY = divY + 35;
      dedLines.forEach((line, i) => {
        svg += `<text x="${W/2}" y="${dedY + i * 30}" text-anchor="middle" font-family="sans-serif" font-size="18" fill="#8B7355">${escXml(line)}</text>`;
      });
    }

    // Untere Dekoration
    svg += `<rect x="${W/2-60}" y="${H-55}" width="120" height="2" fill="#C9963A" rx="1"/>`;
    svg += `<text x="${W/2}" y="${H-38}" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#C9963A" letter-spacing="5">${escXml("✦  THE END  ✦")}</text>`;
    svg += `</svg>`;

    const buf = await sharp({
      create: { width: W, height: H, channels: 4, background: { r: 253, g: 248, b: 242, alpha: 1 } }
    }).composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).jpeg({ quality: 90 }).toBuffer();

    console.log(`✓ Ending done, size: ${Math.round(buf.length / 1024)}KB`);
    res.json({ imageUrl: `data:image/jpeg;base64,${buf.toString("base64")}` });
  } catch (err) {
    console.error("Ending error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
