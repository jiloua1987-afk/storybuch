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
  const b = 12, titleH = 80;
  const uH = H - titleH - b, uW = W - b * 2;
  if (panelCount === 3) return [
    { x: b, y: titleH, width: uW, height: uH * 0.5 },
    { x: b, y: titleH + uH * 0.5 + b, width: uW / 2 - b / 2, height: uH * 0.5 - b },
    { x: b + uW / 2 + b / 2, y: titleH + uH * 0.5 + b, width: uW / 2 - b / 2, height: uH * 0.5 - b },
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
  return [
    { x: b, y: titleH, width: uW / 2 - b / 2, height: uH / 2 - b / 2 },
    { x: b + uW / 2 + b / 2, y: titleH, width: uW / 2 - b / 2, height: uH / 2 - b / 2 },
    { x: b, y: titleH + uH / 2 + b / 2, width: uW / 2 - b / 2, height: uH / 2 - b / 2 },
    { x: b + uW / 2 + b / 2, y: titleH + uH / 2 + b / 2, width: uW / 2 - b / 2, height: uH / 2 - b / 2 },
  ];
}

function buildPageSVG(pageTitle, panels, W, H) {
  const layouts = getPanelLayouts(panels.length, W, H);
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">`;
  svg += `<rect width="${W}" height="${H}" fill="#F5EDE0"/>`;
  svg += `<text x="${W/2}" y="52" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-size="36" font-weight="900" fill="#1A1410">${escXml(pageTitle.toUpperCase())}</text>`;
  panels.forEach((panel, i) => {
    const l = layouts[i] || layouts[0];
    svg += `<rect x="${l.x}" y="${l.y}" width="${l.width}" height="${l.height}" fill="none" stroke="#1A1410" stroke-width="4" rx="2"/>`;
    if (panel.dialog) {
      const text = panel.speaker ? `${panel.speaker}: ${panel.dialog}` : panel.dialog;
      const lines = wrapText(text, 22);
      const boxH = lines.length * 22 + 16;
      const boxW = Math.min(l.width * 0.55, 280);
      const margin = 10;
      const bx = (i % 2 !== 0) ? l.x + l.width - boxW - margin : l.x + margin;
      const by = l.y + margin;
      svg += `<rect x="${bx}" y="${by}" width="${boxW}" height="${boxH}" fill="white" stroke="#1A1410" stroke-width="2" rx="4"/>`;
      lines.forEach((line, li) => {
        svg += `<text x="${bx+8}" y="${by+18+li*22}" font-family="Arial,sans-serif" font-size="13" font-weight="bold" fill="#1A1410">${escXml(line)}</text>`;
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

// ── POST /api/comic/page ──────────────────────────────────────────────────────
router.post("/page", async (req, res) => {
  try {
    const { page, characters = [], illustrationStyle = "comic", comicStyle = "emotional", category = "familie" } = req.body;

    const style = ILLUS_STYLE[illustrationStyle] || ILLUS_STYLE.comic;
    const comicMod = COMIC_STYLE_MOD[comicStyle] || COMIC_STYLE_MOD.emotional;
    const mood = CATEGORY_MOOD[category] || CATEGORY_MOOD.familie;

    // FIXER ANTEIL: Konsistenz + Character Anchors + Stil
    const charAnchors = characters.map(c => `[${c.name}: ${c.visual_anchor}]`).join(" ");
    const fixedPart = `CRITICAL: Keep ALL characters visually 100% consistent across every panel — same faces, same hair color and style, same clothing, same body proportions. ${charAnchors ? `Characters: ${charAnchors}.` : ""} Art style: ${style}. Mood: ${comicMod}. Atmosphere: ${mood}. NEVER add random text, logos, or watermarks.`;

    // FLEXIBLER ANTEIL: Seiten-Layout + Panel-Szenen
    const panelDescs = page.panels.map(p =>
      `[Panel ${p.nummer}]: ${p.szene}. Leave small empty space in upper corner for text overlay.`
    ).join("\n");

    const layoutMap = {
      3: "3-panel layout: ONE wide panoramic panel spanning full width on top, TWO equal panels side by side on bottom",
      4: "4-panel layout: 2x2 grid of equal panels",
      5: "5-panel layout: TWO panels on top row, ONE wide panoramic panel spanning full width in middle, TWO panels on bottom row",
      6: "6-panel layout: 3 columns x 2 rows grid",
    };
    const layout = layoutMap[page.panels.length] || layoutMap[4];

    const flexPart = `Create ONE comic book page with ${page.panels.length} panels. Layout: ${layout}. Thick black borders (5px). Cream background (#F5EDE0) outside panels. Leave 80px header area at very top empty (for title overlay). ${page.location ? `Location: ${page.location}.` : ""} ${page.timeOfDay ? `Lighting: ${page.timeOfDay}.` : ""}\n\nPanels:\n${panelDescs}\n\nNO text, NO letters, NO captions in the image itself.`;

    const fullPrompt = `${fixedPart}\n\n${flexPart}`;

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
          prompt: `Use the people from this reference photo as the main characters. ${fullPrompt}`,
          n: 1,
          size: "1536x1024",
        });
        const item = (editRes.data || [])[0];
        if (item?.url) rawUrl = item.url;
        else if (item?.b64_json) rawUrl = `data:image/png;base64,${item.b64_json}`;
        if (rawUrl) console.log("✓ Edit API success");
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
        size: "1536x1024",
        quality: "high",
      });
      const item = (genRes.data || [])[0];
      if (item?.url) rawUrl = item.url;
      else if (item?.b64_json) rawUrl = `data:image/png;base64,${item.b64_json}`;
    }

    if (!rawUrl) {
      console.error("No image URL generated for page:", page.title);
      return res.json({ imageUrl: "" });
    }

    console.log(`Raw image URL type: ${rawUrl.startsWith("data:") ? "base64" : "url"}, length: ${rawUrl.length}`);

    // Sharp: Text-Overlay (Titel + Caption-Boxen)
    const buf = await fetchBuf(rawUrl);
    if (!buf) {
      console.error("Could not fetch image buffer");
      return res.json({ imageUrl: rawUrl }); // Return raw URL as fallback
    }

    const meta = await sharp(buf).metadata();
    const W = meta.width || 1536, H = meta.height || 1024;
    const svgStr = buildPageSVG(page.title, page.panels, W, H);

    const comp = await sharp(buf)
      .composite([{ input: Buffer.from(svgStr), top: 0, left: 0 }])
      .jpeg({ quality: 85 }) // JPEG statt PNG – viel kleiner
      .toBuffer();

    const base64 = comp.toString("base64");
    console.log(`✓ Page "${page.title}" done, size: ${Math.round(base64.length / 1024)}KB`);
    res.json({ imageUrl: `data:image/jpeg;base64,${base64}` });
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
        else if (item?.b64_json) rawUrl = `data:image/png;base64,${item.b64_json}`;
      } catch (e) {
        console.error("Cover edit API failed:", e.message);
      }
    }

    if (!rawUrl) {
      const genRes = await openai.images.generate({ model: "gpt-image-1", prompt, n: 1, size: "1024x1536", quality: "high" });
      const item = (genRes.data || [])[0];
      rawUrl = item?.url || (item?.b64_json ? `data:image/png;base64,${item.b64_json}` : "");
    }

    if (!rawUrl) return res.json({ coverImageUrl: "" });

    const buf = await fetchBuf(rawUrl);
    if (!buf) return res.json({ coverImageUrl: rawUrl });

    const meta = await sharp(buf).metadata();
    const W = meta.width || 1024, H = meta.height || 1536;
    const lines = title.length > 22 ? [title.substring(0, 22), title.substring(22)] : [title];
    const overlayH = Math.round(H * 0.38);

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">`;
    svg += `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgba(0,0,0,0)"/><stop offset="100%" stop-color="rgba(15,8,3,0.9)"/></linearGradient></defs>`;
    svg += `<rect x="0" y="${H-overlayH}" width="${W}" height="${overlayH}" fill="url(#g)"/>`;
    lines.forEach((line, i) => {
      svg += `<text x="${W/2}" y="${H-overlayH*0.5+i*54}" text-anchor="middle" font-family="Georgia,serif" font-size="52" font-weight="bold" fill="white">${escXml(line)}</text>`;
    });
    svg += `<rect x="${W/2-40}" y="${H-overlayH*0.18}" width="80" height="3" fill="#C9963A" rx="1"/>`;
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
        { role: "system", content: `Write a warm, emotional closing paragraph for a personal comic book in ${lang}. Tone: ${tone || "warm and nostalgic"}. Max 70 words. Make it feel like the last page of a beloved book — personal, touching, memorable. No title needed.` },
        { role: "user", content: storyInput || Object.values(guidedAnswers).filter(Boolean).join(", ") },
      ],
      max_tokens: 120, temperature: 0.9,
    });

    const endText = r.choices[0].message.content || "";
    const W = 1536, H = 1024;
    const textLines = wrapText(endText, 55);
    const dedLines = dedication ? wrapText(`"${dedication}"`, 50) : [];

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">`;
    svg += `<rect width="${W}" height="${H}" fill="#F5EDE0"/>`;
    svg += `<rect x="${W/2-80}" y="80" width="160" height="3" fill="#C9963A" rx="1"/>`;
    svg += `<text x="${W/2}" y="60" text-anchor="middle" font-family="Georgia,serif" font-size="18" fill="#8B7355" letter-spacing="4">${escXml("ERINNERUNGEN")}</text>`;
    const startY = H * 0.28;
    textLines.forEach((line, i) => {
      svg += `<text x="${W/2}" y="${startY+i*42}" text-anchor="middle" font-family="Georgia,serif" font-size="26" fill="#1A1410" font-style="italic">${escXml(line)}</text>`;
    });
    const divY = startY + textLines.length * 42 + 50;
    svg += `<rect x="${W/2-40}" y="${divY}" width="80" height="2" fill="#C9963A" rx="1"/>`;
    if (dedLines.length > 0) {
      dedLines.forEach((line, i) => {
        svg += `<text x="${W/2}" y="${divY+50+i*36}" text-anchor="middle" font-family="Georgia,serif" font-size="22" fill="#8B7355">${escXml(line)}</text>`;
      });
    }
    svg += `<rect x="${W/2-80}" y="${H-80}" width="160" height="3" fill="#C9963A" rx="1"/>`;
    svg += `<text x="${W/2}" y="${H-45}" text-anchor="middle" font-family="Georgia,serif" font-size="18" fill="#8B7355" letter-spacing="4">${escXml("THE END")}</text>`;
    svg += `</svg>`;

    const buf = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 245, g: 237, b: 224, alpha: 1 } } })
      .composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).jpeg({ quality: 90 }).toBuffer();

    res.json({ imageUrl: `data:image/jpeg;base64,${buf.toString("base64")}` });
  } catch (err) {
    console.error("Ending error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
