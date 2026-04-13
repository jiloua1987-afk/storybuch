const express = require("express");
const router = express.Router();
const OpenAI = require("openai");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const { saveImage } = require("../lib/storage");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Stil-Referenzbild ─────────────────────────────────────────────────────────
let STYLE_REF_B64 = null;
try {
  const refPath = path.join(__dirname, "../../style-reference.png");
  if (fs.existsSync(refPath)) {
    STYLE_REF_B64 = fs.readFileSync(refPath).toString("base64");
    console.log("Style reference loaded");
  }
} catch (e) { console.warn("No style reference:", e.message); }

// ── Konstanten ────────────────────────────────────────────────────────────────
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

// ── Helpers ───────────────────────────────────────────────────────────────────
async function fetchBuf(url) {
  try {
    if (url.startsWith("data:")) return Buffer.from(url.replace(/^data:image\/\w+;base64,/, ""), "base64");
    const res = await fetch(url, { signal: AbortSignal.timeout(25000) });
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
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">`;
  svg += `<rect x="0" y="0" width="${W}" height="70" fill="#F5EDE0"/>`;
  svg += `<rect x="0" y="68" width="${W}" height="2" fill="#1A1410"/>`;
  panels.forEach((panel, i) => {
    const l = layouts[i] || layouts[0];
    svg += `<rect x="${l.x}" y="${l.y}" width="${l.width}" height="${l.height}" fill="none" stroke="#1A1410" stroke-width="4"/>`;
    if (panel.dialog) {
      const text = panel.speaker ? `${panel.speaker}: ${panel.dialog}` : panel.dialog;
      const lines = wrapText(text, 24);
      const boxH = lines.length * 20 + 14;
      const boxW = Math.min(l.width * 0.6, 260);
      const margin = 8;
      const bx = (i % 2 !== 0) ? l.x + l.width - boxW - margin : l.x + margin;
      const by = l.y + margin;
      svg += `<rect x="${bx}" y="${by}" width="${boxW}" height="${boxH}" fill="white" stroke="#1A1410" stroke-width="2" rx="3"/>`;
      lines.forEach((line, li) => {
        svg += `<text x="${bx + 6}" y="${by + 14 + li * 20}" font-size="12" fill="#1A1410" font-family="sans-serif" font-weight="bold">${escXml(line)}</text>`;
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
${mustHaveSentences ? `MUST include: ${mustHaveSentences}` : ""}
Vary panel count: Page 1: 4 panels, Page 2: 3 panels, Page 3: 5 panels, Page 4: 4 panels.
Respond ONLY with JSON: {"pages": [{"id":"page1","pageNumber":1,"title":"Title in ${lang}","location":"English location","timeOfDay":"afternoon","panels":[{"nummer":1,"szene":"Specific English scene","dialog":"Short ${lang} dialog max 8 words","speaker":"Name or null","bubble_type":"speech"}]}]}` },
          { role: "user", content: ctx },
        ],
        response_format: { type: "json_object" },
        temperature: 0.85,
      }),
      openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `Extract main characters. Respond ONLY with JSON: {"characters":[{"name":"Name","age":30,"visual_anchor":"Precise English: age, hair color/style, eye color, skin tone, clothing, features"}]}` },
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
              { type: "text", text: `Describe the visual appearance of the people for a comic artist. Focus ONLY on: approximate age, hair color/texture, skin tone, clothing colors. Do NOT identify anyone. English, max 60 words. Start with "Person ${i+1} (${char.name}):"` },
            ]}],
            max_tokens: 120,
          });
          return { ...char, visual_anchor: r.choices[0].message.content || char.visual_anchor, refBase64: ref };
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
        // Save to Supabase
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
    const { page, characters = [], comicStyle = "emotional", category = "familie", previousImageUrl = null } = req.body;

    const comicMod = COMIC_STYLE_MOD[comicStyle] || COMIC_STYLE_MOD.emotional;
    const mood = CATEGORY_MOOD[category] || CATEGORY_MOOD.familie;
    const charAnchors = characters.map(c => `${c.name}: ${c.visual_anchor}`).join("\n");
    const characterSheetUrl = characters[0]?.characterSheetUrl || null;
    const scenes = page.panels.map(p => `Panel ${p.nummer}: ${p.szene}`).join("\n");

    const fullPrompt = `IMPORTANT: Maintain strict visual consistency across all panels. Same faces, same hair, same body proportions, same outfits always.

CHARACTER DEFINITIONS (NEVER deviate):
${charAnchors || "Characters as described in reference image."}
${characterSheetUrl ? "\nCharacter reference sheet available - maintain exact appearance." : ""}
${previousImageUrl ? "\nMaintain visual continuity with the previous panel." : ""}

ART STYLE: warm watercolor comic illustration, rich colors, cinematic warm lighting, professional quality, ${comicMod}, ${mood}.
NO text, NO letters, NO speech bubbles, NO captions in the image.
Leave empty space at top-left or top-right corner of each panel for caption overlay.

COMIC PAGE LAYOUT:
Create a single A4 portrait comic page with ${page.panels.length} panels.
${page.panels.length <= 3 ? "Layout: 1 wide panel top, 2 panels bottom" : page.panels.length === 5 ? "Layout: 2 panels top, 1 wide middle, 2 panels bottom" : "Layout: 2x2 grid"}
Clean white borders between panels. Cream background outside panels.

SCENES:
${scenes}

ENVIRONMENT: ${page.location || "beautiful scenic location"}, ${page.timeOfDay || "warm daylight"}.
NEGATIVE: text, speech bubbles, captions, watermark, distorted faces, inconsistent characters, extra fingers.`;

    console.log(`Generating page "${page.title}" (${page.panels.length} panels)`);

    const genRes = await openai.images.generate({
      model: "gpt-image-1",
      prompt: fullPrompt,
      n: 1,
      size: "1024x1536",
      quality: "high",
    });

    const item = (genRes.data || [])[0];
    let rawUrl = "";
    if (item?.url) rawUrl = item.url;
    else if (item?.b64_json) {
      const imgBuf = Buffer.from(item.b64_json, "base64");
      const small = await sharp(imgBuf).resize(900, null).jpeg({ quality: 88 }).toBuffer();
      rawUrl = `data:image/jpeg;base64,${small.toString("base64")}`;
    }

    if (!rawUrl) return res.json({ imageUrl: "", panels: page.panels });

    // Save to Supabase Storage
    const bookId = page.id?.split("-")[0] || `book-${Date.now()}`;
    const storedUrl = await saveImage(rawUrl, bookId, page.id || `page-${Date.now()}`);
    const finalUrl = storedUrl || rawUrl;

    console.log(`✓ Page "${page.title}" done → ${storedUrl ? "Supabase" : "base64"}`);
    res.json({ imageUrl: finalUrl, panels: page.panels });
  } catch (err) {
    console.error("Page error:", err.message);
    res.status(500).json({ error: err.message, imageUrl: "" });
  }
});

// ── POST /api/comic/cover ─────────────────────────────────────────────────────
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

    const genRes = await openai.images.generate({ model: "gpt-image-1", prompt, n: 1, size: "1024x1536", quality: "high" });
    const item = (genRes.data || [])[0];
    let rawUrl = item?.url || "";
    if (!rawUrl && item?.b64_json) {
      const buf = Buffer.from(item.b64_json, "base64");
      const small = await sharp(buf).resize(700, null).jpeg({ quality: 88 }).toBuffer();
      rawUrl = `data:image/jpeg;base64,${small.toString("base64")}`;
    }

    if (!rawUrl) return res.json({ coverImageUrl: "" });

    // Cover title overlay
    let buf = await fetchBuf(rawUrl);
    if (!buf) return res.json({ coverImageUrl: rawUrl });
    if (rawUrl.startsWith("http")) buf = await sharp(buf).resize(700, null).toBuffer();

    const meta = await sharp(buf).metadata();
    const W = meta.width || 700, H = meta.height || 1050;
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
    const titleFontSize = titleLines.length > 2 ? 38 : 48;
    const titleLineHeight = titleFontSize + 12;
    const totalTitleH = titleLines.length * titleLineHeight;
    const titleStartY = H - overlayH * 0.55 - totalTitleH / 2;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">`;
    svg += `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgba(0,0,0,0)"/><stop offset="60%" stop-color="rgba(10,5,2,0.75)"/><stop offset="100%" stop-color="rgba(10,5,2,0.95)"/></linearGradient></defs>`;
    svg += `<rect x="0" y="${H - overlayH}" width="${W}" height="${overlayH}" fill="url(#g)"/>`;
    titleLines.forEach((line, i) => {
      svg += `<text x="${W/2}" y="${titleStartY + i * titleLineHeight}" text-anchor="middle" font-family="sans-serif" font-size="${titleFontSize}" font-weight="bold" fill="white">${escXml(line)}</text>`;
    });
    svg += `<rect x="${W/2-40}" y="${titleStartY + totalTitleH + 10}" width="80" height="3" fill="#C9963A" rx="1"/>`;
    if (location) {
      svg += `<text x="${W/2}" y="${titleStartY + totalTitleH + 36}" text-anchor="middle" font-family="sans-serif" font-size="16" fill="rgba(255,255,255,0.75)">${escXml(location.toUpperCase())}</text>`;
    }
    svg += `</svg>`;

    const comp = await sharp(buf).composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).jpeg({ quality: 88 }).toBuffer();
    const coverUrl = await saveImage(`data:image/jpeg;base64,${comp.toString("base64")}`, "covers", `cover-${Date.now()}`);
    res.json({ coverImageUrl: coverUrl || `data:image/jpeg;base64,${comp.toString("base64")}` });
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
        { role: "system", content: `Write a warm, emotional and personal closing text for a comic book in ${lang}. Tone: ${tone || "warm, nostalgic, loving"}. 3-4 short sentences. Make it feel like a heartfelt letter. No title.` },
        { role: "user", content: storyInput || Object.values(guidedAnswers).filter(Boolean).join(", ") },
      ],
      max_tokens: 150, temperature: 0.9,
    });

    const endText = r.choices[0].message.content || "";
    const W = 900, H = 600;
    const textLines = wrapText(endText, 48);
    const dedLines = dedication ? wrapText(`"${dedication}"`, 44) : [];

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">`;
    svg += `<rect width="${W}" height="${H}" fill="#FDF8F2"/>`;
    svg += `<rect x="30" y="30" width="${W-60}" height="${H-60}" fill="none" stroke="#E8D9C0" stroke-width="1.5" rx="4"/>`;
    svg += `<rect x="${W/2-60}" y="55" width="120" height="2" fill="#C9963A" rx="1"/>`;
    svg += `<text x="${W/2}" y="48" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#C9963A">${escXml("ERINNERUNGEN")}</text>`;
    const startY = 110;
    textLines.forEach((line, i) => {
      svg += `<text x="${W/2}" y="${startY + i * 38}" text-anchor="middle" font-family="sans-serif" font-size="20" fill="#2d1b4e">${escXml(line)}</text>`;
    });
    const divY = startY + textLines.length * 38 + 30;
    svg += `<rect x="${W/2-30}" y="${divY}" width="60" height="1.5" fill="#C9963A" rx="1"/>`;
    if (dedLines.length > 0) {
      dedLines.forEach((line, i) => {
        svg += `<text x="${W/2}" y="${divY + 35 + i * 30}" text-anchor="middle" font-family="sans-serif" font-size="17" fill="#8B7355">${escXml(line)}</text>`;
      });
    }
    svg += `<rect x="${W/2-60}" y="${H-55}" width="120" height="2" fill="#C9963A" rx="1"/>`;
    svg += `<text x="${W/2}" y="${H-38}" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#C9963A">${escXml("THE END")}</text>`;
    svg += `</svg>`;

    const buf = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 253, g: 248, b: 242, alpha: 1 } } })
      .composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).jpeg({ quality: 90 }).toBuffer();

    console.log(`✓ Ending done, ${Math.round(buf.length/1024)}KB`);
    res.json({ imageUrl: `data:image/jpeg;base64,${buf.toString("base64")}` });
  } catch (err) {
    console.error("Ending error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
