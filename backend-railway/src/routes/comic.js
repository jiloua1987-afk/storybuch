const express = require("express");
const router = express.Router();
const OpenAI = require("openai");
const sharp = require("sharp");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Helpers ───────────────────────────────────────────────────────────────────
async function fetchBuf(url) {
  if (url.startsWith("data:")) return Buffer.from(url.replace(/^data:image\/\w+;base64,/, ""), "base64");
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) return null;
  return Buffer.from(await res.arrayBuffer());
}

function escXml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function wrapText(text, maxChars) {
  const words = text.split(" ");
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
  const border = 12;
  const titleH = 80;
  const usableH = H - titleH - border;
  const usableW = W - border * 2;

  if (panelCount === 3) return [
    { x: border, y: titleH, width: usableW, height: usableH * 0.5 },
    { x: border, y: titleH + usableH * 0.5 + border, width: usableW / 2 - border / 2, height: usableH * 0.5 - border },
    { x: border + usableW / 2 + border / 2, y: titleH + usableH * 0.5 + border, width: usableW / 2 - border / 2, height: usableH * 0.5 - border },
  ];

  if (panelCount === 5) {
    const rowH = usableH / 3;
    return [
      { x: border, y: titleH, width: usableW / 2 - border / 2, height: rowH - border / 2 },
      { x: border + usableW / 2 + border / 2, y: titleH, width: usableW / 2 - border / 2, height: rowH - border / 2 },
      { x: border, y: titleH + rowH + border / 2, width: usableW, height: rowH - border },
      { x: border, y: titleH + rowH * 2 + border, width: usableW / 2 - border / 2, height: rowH - border / 2 },
      { x: border + usableW / 2 + border / 2, y: titleH + rowH * 2 + border, width: usableW / 2 - border / 2, height: rowH - border / 2 },
    ];
  }

  // Default 2x2
  return [
    { x: border, y: titleH, width: usableW / 2 - border / 2, height: usableH / 2 - border / 2 },
    { x: border + usableW / 2 + border / 2, y: titleH, width: usableW / 2 - border / 2, height: usableH / 2 - border / 2 },
    { x: border, y: titleH + usableH / 2 + border / 2, width: usableW / 2 - border / 2, height: usableH / 2 - border / 2 },
    { x: border + usableW / 2 + border / 2, y: titleH + usableH / 2 + border / 2, width: usableW / 2 - border / 2, height: usableH / 2 - border / 2 },
  ];
}

function buildPageSVG(pageTitle, panels, W, H) {
  const layouts = getPanelLayouts(panels.length, W, H);
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">`;
  svg += `<rect width="${W}" height="${H}" fill="#F5EDE0"/>`;
  svg += `<text x="${W / 2}" y="52" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="36" font-weight="900" fill="#1A1410">${escXml(pageTitle.toUpperCase())}</text>`;

  panels.forEach((panel, i) => {
    const l = layouts[i] || layouts[0];
    svg += `<rect x="${l.x}" y="${l.y}" width="${l.width}" height="${l.height}" fill="none" stroke="#1A1410" stroke-width="4" rx="2"/>`;

    if (panel.dialog) {
      const text = panel.speaker ? `${panel.speaker}: ${panel.dialog}` : panel.dialog;
      const lines = wrapText(text, 22);
      const boxH = lines.length * 22 + 16;
      const boxW = Math.min(l.width * 0.55, 280);
      const margin = 10;
      const isRight = i % 2 !== 0;
      const bx = isRight ? l.x + l.width - boxW - margin : l.x + margin;
      const by = l.y + margin;

      svg += `<rect x="${bx}" y="${by}" width="${boxW}" height="${boxH}" fill="white" stroke="#1A1410" stroke-width="2" rx="4"/>`;
      lines.forEach((line, li) => {
        svg += `<text x="${bx + 8}" y="${by + 18 + li * 22}" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#1A1410">${escXml(line)}</text>`;
      });
    }
  });

  svg += `</svg>`;
  return svg;
}

// ── POST /api/comic/structure ─────────────────────────────────────────────────
router.post("/structure", async (req, res) => {
  try {
    const { storyInput, guidedAnswers, tone, comicStyle, mustHaveSentences, language, category, numPages = 4, referenceImages = [] } = req.body;

    const langMap = { de: "German", en: "English", fr: "French", es: "Spanish" };
    const lang = langMap[language] || "German";

    let ctx = storyInput || "";
    for (const [k, v] of Object.entries(guidedAnswers || {})) {
      if (v) ctx += `\n${k}: ${v}`;
    }

    const [structRes, charRes] = await Promise.all([
      openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `Create a ${numPages}-page comic structure in ${lang}. Tone: ${tone}. Category: ${category}. ${mustHaveSentences ? `Must include: ${mustHaveSentences}` : ""}\nRespond ONLY with JSON: {"pages": [{"id":"page1","pageNumber":1,"title":"Title","location":"English location","timeOfDay":"afternoon","panels":[{"nummer":1,"szene":"English scene description","dialog":"Short ${lang} dialog max 8 words","speaker":"Name or null","bubble_type":"speech"}]}]}` },
          { role: "user", content: ctx },
        ],
        response_format: { type: "json_object" },
        temperature: 0.85,
      }),
      openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `Extract main characters. Respond ONLY with JSON: {"characters":[{"name":"Name","age":30,"visual_anchor":"Precise English description: age, hair, clothing, features"}]}` },
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
      characters = await Promise.all(characters.map(async (char, i) => {
        const ref = referenceImages[i] || referenceImages[0];
        if (!ref) return char;
        try {
          const r = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: [
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${ref}`, detail: "high" } },
              { type: "text", text: `Describe ${char.name} from this photo for a comic artist. Hair color/style, eye color, skin tone, age, face shape, distinctive features, clothing. English, max 50 words.` },
            ]}],
            max_tokens: 100,
          });
          return { ...char, visual_anchor: r.choices[0].message.content || char.visual_anchor, refBase64: ref };
        } catch { return char; }
      }));
    }

    res.json({ pages, characters });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/comic/page ──────────────────────────────────────────────────────
router.post("/page", async (req, res) => {
  try {
    const { page, characters = [], illustrationStyle = "comic", comicStyle = "emotional", category = "familie" } = req.body;

    const styleMap = {
      comic: "warm watercolor comic illustration, bold outlines, vibrant colors, cinematic lighting",
      aquarell: "soft watercolor illustration, pastel colors, dreamy",
      bleistift: "pencil sketch comic style, hand-drawn",
      realistisch: "realistic comic art, detailed digital painting",
    };
    const style = styleMap[illustrationStyle] || styleMap.comic;

    const charAnchors = characters.map(c => `${c.name}: ${c.visual_anchor}`).join("; ");
    const panelDescs = page.panels.map(p => `Panel ${p.nummer}: ${p.szene}. Leave space top-left for caption.`).join("\n");

    const prompt = `IMPORTANT: Keep all characters visually consistent — same faces, hair, clothing. Characters: ${charAnchors}. Style: ${style}. NO text, NO letters anywhere in image.\n\nCreate ONE comic page with ${page.panels.length} panels in 2x2 grid. Thick black borders. Cream background (#F5EDE0). Leave 80px header area at top empty.\n${panelDescs}`;

    // Try edit API with reference photo first
    const primaryRef = characters.find(c => c.refBase64)?.refBase64;
    let rawUrl = "";

    if (primaryRef) {
      try {
        const imgBuf = Buffer.from(primaryRef, "base64");
        const { Blob } = await import("buffer");
        const blob = new Blob([imgBuf], { type: "image/jpeg" });
        const file = new File([blob], "ref.jpg", { type: "image/jpeg" });
        const editRes = await openai.images.edit({ model: "gpt-image-1", image: file, prompt, n: 1, size: "1536x1024" });
        const item = (editRes.data || [])[0];
        if (item?.url) rawUrl = item.url;
        else if (item?.b64_json) rawUrl = `data:image/png;base64,${item.b64_json}`;
      } catch (e) {
        console.error("Edit API failed, using generate:", e.message);
      }
    }

    // Fallback: standard generate
    if (!rawUrl) {
      const genRes = await openai.images.generate({ model: "gpt-image-1", prompt, n: 1, size: "1536x1024", quality: "high" });
      const item = (genRes.data || [])[0];
      if (item?.url) rawUrl = item.url;
      else if (item?.b64_json) rawUrl = `data:image/png;base64,${item.b64_json}`;
    }

    if (!rawUrl) return res.json({ imageUrl: "" });

    // Sharp text overlay
    const buf = await fetchBuf(rawUrl);
    if (!buf) return res.json({ imageUrl: rawUrl });

    const meta = await sharp(buf).metadata();
    const W = meta.width || 1536;
    const H = meta.height || 1024;
    const svgStr = buildPageSVG(page.title, page.panels, W, H);
    const comp = await sharp(buf).composite([{ input: Buffer.from(svgStr), top: 0, left: 0 }]).png().toBuffer();

    res.json({ imageUrl: `data:image/png;base64,${comp.toString("base64")}` });
  } catch (err) {
    console.error("Page error:", err.message);
    res.status(500).json({ error: err.message, imageUrl: "" });
  }
});

// ── POST /api/comic/cover ─────────────────────────────────────────────────────
router.post("/cover", async (req, res) => {
  try {
    const { title, characters = [], category = "familie", illustrationStyle = "comic", location = "" } = req.body;

    const charDesc = characters.map(c => `${c.name}: ${c.visual_anchor}`).join(", ");
    const moodMap = {
      familie: "warm sunny family atmosphere, joyful children",
      urlaub: "bright Mediterranean vacation, turquoise sea",
      liebe: "romantic golden sunset, intimate couple",
      feier: "festive celebration, colorful and joyful",
      biografie: "timeless nostalgic atmosphere",
      freunde: "fun friendship adventure",
    };

    const prompt = `Create a beautiful comic book COVER illustration. ${charDesc ? `Characters: ${charDesc}.` : ""} Setting: ${location || "beautiful scenic location"}. Mood: ${moodMap[category] || moodMap.familie}. Style: warm watercolor comic art, professional cover quality, cinematic composition. NO text anywhere. Portrait orientation, characters prominently featured.`;

    const genRes = await openai.images.generate({ model: "gpt-image-1", prompt, n: 1, size: "1024x1536", quality: "high" });
    const item = (genRes.data || [])[0];
    let rawUrl = item?.url || (item?.b64_json ? `data:image/png;base64,${item.b64_json}` : "");

    if (!rawUrl) return res.json({ coverImageUrl: "" });

    // Cover title overlay
    const buf = await fetchBuf(rawUrl);
    if (!buf) return res.json({ coverImageUrl: rawUrl });

    const meta = await sharp(buf).metadata();
    const W = meta.width || 1024;
    const H = meta.height || 1536;
    const lines = title.length > 22 ? [title.substring(0, 22), title.substring(22)] : [title];
    const overlayH = Math.round(H * 0.38);

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">`;
    svg += `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgba(0,0,0,0)"/><stop offset="100%" stop-color="rgba(15,8,3,0.9)"/></linearGradient></defs>`;
    svg += `<rect x="0" y="${H - overlayH}" width="${W}" height="${overlayH}" fill="url(#g)"/>`;
    lines.forEach((line, i) => {
      svg += `<text x="${W / 2}" y="${H - overlayH * 0.5 + i * 54}" text-anchor="middle" font-family="Georgia, serif" font-size="52" font-weight="bold" fill="white">${escXml(line)}</text>`;
    });
    svg += `<rect x="${W / 2 - 40}" y="${H - overlayH * 0.18}" width="80" height="3" fill="#C9963A" rx="1"/>`;
    svg += `</svg>`;

    const comp = await sharp(buf).composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).png().toBuffer();
    res.json({ coverImageUrl: `data:image/png;base64,${comp.toString("base64")}` });
  } catch (err) {
    res.status(500).json({ error: err.message, coverImageUrl: "" });
  }
});

// ── POST /api/comic/ending ────────────────────────────────────────────────────
router.post("/ending", async (req, res) => {
  try {
    const { storyInput, guidedAnswers, tone, language, dedication } = req.body;
    const langMap = { de: "German", en: "English", fr: "French", es: "Spanish" };
    const lang = langMap[language] || "German";

    const r = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: `Write a warm emotional closing paragraph for a personal comic book in ${lang}. Tone: ${tone || "warm"}. Max 70 words. Personal, touching, memorable. No title.` },
        { role: "user", content: storyInput || Object.values(guidedAnswers || {}).filter(Boolean).join(", ") },
      ],
      max_tokens: 120, temperature: 0.9,
    });

    const endText = r.choices[0].message.content || "";
    const W = 1536; const H = 1024;
    const textLines = wrapText(endText, 55);
    const dedLines = dedication ? wrapText(`"${dedication}"`, 50) : [];

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">`;
    svg += `<rect width="${W}" height="${H}" fill="#F5EDE0"/>`;
    svg += `<rect x="${W / 2 - 80}" y="80" width="160" height="3" fill="#C9963A" rx="1"/>`;
    svg += `<text x="${W / 2}" y="60" text-anchor="middle" font-family="Georgia, serif" font-size="18" fill="#8B7355" letter-spacing="4">${escXml("ERINNERUNGEN")}</text>`;

    const startY = H * 0.28;
    textLines.forEach((line, i) => {
      svg += `<text x="${W / 2}" y="${startY + i * 42}" text-anchor="middle" font-family="Georgia, serif" font-size="26" fill="#1A1410" font-style="italic">${escXml(line)}</text>`;
    });

    const divY = startY + textLines.length * 42 + 50;
    svg += `<rect x="${W / 2 - 40}" y="${divY}" width="80" height="2" fill="#C9963A" rx="1"/>`;

    if (dedLines.length > 0) {
      dedLines.forEach((line, i) => {
        svg += `<text x="${W / 2}" y="${divY + 50 + i * 36}" text-anchor="middle" font-family="Georgia, serif" font-size="22" fill="#8B7355">${escXml(line)}</text>`;
      });
    }

    svg += `<rect x="${W / 2 - 80}" y="${H - 80}" width="160" height="3" fill="#C9963A" rx="1"/>`;
    svg += `<text x="${W / 2}" y="${H - 45}" text-anchor="middle" font-family="Georgia, serif" font-size="18" fill="#8B7355" letter-spacing="4">${escXml("THE END")}</text>`;
    svg += `</svg>`;

    const buf = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 245, g: 237, b: 224, alpha: 1 } } })
      .composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).png().toBuffer();

    res.json({ imageUrl: `data:image/png;base64,${buf.toString("base64")}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
