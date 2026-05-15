/**
 * /api/comic-flux — FLUX.1 Kontext variant
 *
 * Identical flow to /api/comic but uses FLUX.1 Kontext [dev] via DeepInfra
 * for image generation instead of gpt-image-2.
 *
 * ⚠️  FLUX.1 Kontext [dev] is NON-COMMERCIAL (testing only).
 *     Switch to FLUX.1 Kontext [pro] via BFL API for production.
 *
 * Production does NOT touch this file. This file does NOT touch production.
 */

"use strict";

const express = require("express");
const router  = express.Router();
const OpenAI  = require("openai");
const { saveImage, saveCharacterRefs, savePage, getCharacterRefs } = require("../lib/storage");

// ── GPT client (structure / ending / panel-detection still use OpenAI text) ──
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── DeepInfra client — OpenAI-compatible, points at DeepInfra base URL ───────
const deepinfra = new OpenAI({
  apiKey:  process.env.DEEPINFRA_API_KEY || "MISSING_DEEPINFRA_KEY",
  baseURL: "https://api.deepinfra.com/v1/openai",
});

const FLUX_MODEL = "black-forest-labs/FLUX.1-Kontext-dev";
// Switch to pro for commercial use:
// const FLUX_MODEL = "black-forest-labs/FLUX.1-Kontext-pro";

// ── Comic style prompt (FLUX responds well to descriptive English) ────────────
const COMIC_STYLE = [
  "EUROPEAN BANDE DESSINÉE ILLUSTRATION — Franco-Belgian comic book style, similar to Blacksad or Bastien Vivès.",
  "Bold clean ink outlines on every figure and object. Flat cel-shaded color areas, NOT photographic gradients.",
  "Warm cinematic colors: golden tones, rich shadows, vivid saturated hues.",
  "Expressive stylized faces — clearly drawn eyes, nose, mouth. NOT photographic faces.",
  "Realistic human proportions. Western comic book anatomy.",
  "STRICT PROHIBITION: NOT manga. NOT anime. NOT Japanese comic style. NOT big anime eyes. NOT speed lines.",
  "STRICT PROHIBITION: NOT photorealistic. NOT a photograph. NOT CGI render. NOT watercolor painting.",
  "This must look like a page printed in a European comic album — ink outlines visible on every edge.",
  "Every page in this comic MUST look identical in style. Consistent ink weight, color palette, and character design.",
].join(" ");

const MOOD_MOD = {
  action:    "Dynamic poses, motion lines, high contrast colors.",
  emotional: "Warm golden tones, intimate close-ups, soft dramatic shadows.",
  humor:     "Exaggerated expressions in WESTERN COMIC STYLE — wide smiles, raised eyebrows, open mouths. Bright vivid colors, playful energy.",
};

// ── Helpers (identical to comic.js) ──────────────────────────────────────────

function sanitizePrompt(text) {
  if (!text) return text;
  const replacements = {
    'oktoberfest': 'traditional bavarian festival', 'wiesn': 'bavarian folk festival',
    'bierzelt': 'festival tent', 'maß': 'beverage', 'dirndl': 'traditional bavarian dress',
    'lederhosen': 'traditional bavarian attire', 'feiern': 'celebrating',
    'tanzen': 'dancing together', 'dancing': 'celebrating together', 'club': 'festive venue',
    'beach': 'coastal promenade', 'strand': 'strandpromenade',
    'swimming': 'walking by the water', 'schwimmen': 'am wasser spazieren',
    'swimwear': 'summer clothes', 'bikini': 'summer attire', 'badehose': 'summer clothing',
    'bier': 'beverage', 'beer': 'drink', 'wein': 'beverage', 'wine': 'drink',
    'alkohol': 'refreshment', 'alcohol': 'refreshment',
    'fight': 'disagreement', 'kämpfen': 'auseinandersetzung',
    'hit': 'gesture', 'schlagen': 'gestikulieren',
    'aggressive': 'energetic', 'aggressiv': 'energisch',
  };
  let s = text;
  for (const [k, v] of Object.entries(replacements)) {
    s = s.replace(new RegExp(`\\b${k}\\b`, 'gi'), v);
  }
  return s;
}

function getOutfit(location = "", panelDescriptions = "", pageTitle = "") {
  const combined = `${location} ${panelDescriptions} ${pageTitle}`.toLowerCase();
  const isWinter = ["winter","schnee","snow","kalt","cold","weihnachten","christmas","skiing","ski"].some(k => combined.includes(k));
  const isCold   = ["herbst","autumn","fall","regen","rain","windig","windy"].some(k => combined.includes(k));
  if (["beach","sea","pool","shore","coast","swimming","water"].some(k => combined.includes(k)))
    return "swimwear, swim shorts, light summer dresses, sandals.";
  if (["airport","gate","terminal","departure","arrival","flight","flughafen","abflug","ankunft","fliegen"].some(k => combined.includes(k)))
    return "comfortable travel clothes — casual shirts, jeans, sneakers, light jackets.";
  if (["wedding","hochzeit","heirat","marriage","bride","groom","ceremony","braut","bräutigam","trauung"].some(k => combined.includes(k)))
    return "WEDDING ATTIRE — bride in white wedding dress, groom in dark formal suit.";
  if (["geburtstag","birthday"].some(k => combined.includes(k)))
    return "festive casual clothes — nice shirts, blouses, colorful outfits.";
  if (["restaurant","dinner","abendessen","gala","theater","oper"].some(k => combined.includes(k)))
    return "smart casual — dress shirts, blouses, nice trousers.";
  if (["sport","fußball","soccer","football","training","gym","laufen","running"].some(k => combined.includes(k)))
    return "sporty clothes — t-shirts, shorts or tracksuit, sneakers.";
  if (isWinter) return "warm winter clothes — coats, jackets, sweaters, scarves.";
  if (isCold)   return "autumn clothes — light jackets, long sleeves, jeans.";
  return "casual everyday clothes — t-shirts, light shirts, comfortable trousers.";
}

function getAgeContext(pageTitle = "", panelDescriptions = "") {
  const text = `${pageTitle} ${panelDescriptions}`.toLowerCase();
  const youngKw   = ["first met","kennenlernen","jugend","youth","young","schule","school","university","studium","student","erste liebe","first love","teenager","zwanzig","twenties"];
  const middleKw  = ["wedding","hochzeit","heirat","marriage","verlobung","engagement","karriere","career","dreißig","vierzig","thirties","forties"];
  const currentKw = ["heute","today","now","jetzt","aktuell","current","rentner","retired","enkel","grandchild","opa","oma","grandpa","grandma"];
  if (youngKw.some(k => text.includes(k)))   return { modifier: "Draw characters 20-30 years younger. Youthful appearance, smooth skin, darker hair, energetic posture.", useReference: false, ageContext: "young" };
  if (middleKw.some(k => text.includes(k)))  return { modifier: "Draw characters 10-15 years younger. Mature but youthful, minimal gray hair, fewer wrinkles.", useReference: false, ageContext: "middle" };
  if (currentKw.some(k => text.includes(k))) return { modifier: "Draw characters at their current age as shown in the reference.", useReference: true, ageContext: "current" };
  return { modifier: "", useReference: true, ageContext: "current" };
}

async function fetchBuffer(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(25000) });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  // Compress large images before sending to FLUX (DeepInfra has ~10MB limit but
  // large buffers cause connection errors — keep under 1MB)
  if (buf.length > 800 * 1024) {
    const sharp = require('sharp');
    const compressed = await sharp(buf)
      .resize({ width: 1024, withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
    console.log(`  → Compressed reference: ${(buf.length/1024).toFixed(0)}KB → ${(compressed.length/1024).toFixed(0)}KB`);
    return compressed;
  }
  return buf;
}

// ── FLUX image generation ─────────────────────────────────────────────────────
// FLUX.1 Kontext always uses images.edit() — it's an edit/context model.
// For text-only (no reference): we pass a minimal white placeholder image.
// Returns { url, usedReference: boolean }
async function generateImageFlux(prompt, referenceBuffer = null, size = "1024x1024") {
  const attempt = async () => {
    let imageFile;

    if (referenceBuffer) {
      const blob = new Blob([referenceBuffer], { type: "image/png" });
      imageFile = new File([blob], "reference.png", { type: "image/png" });
    } else {
      // No reference: minimal white placeholder
      const whitePng = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==",
        "base64"
      );
      const blob = new Blob([whitePng], { type: "image/png" });
      imageFile = new File([blob], "placeholder.png", { type: "image/png" });
    }

    const res = await deepinfra.images.edit({
      model:           FLUX_MODEL,
      image:           imageFile,
      prompt,
      n:               1,
      size,
      response_format: "b64_json", // DeepInfra only supports b64_json
    });

    const item = (res.data || [])[0];
    // DeepInfra always returns b64_json, never url
    const url = item?.b64_json
      ? `data:image/png;base64,${item.b64_json}`
      : item?.url || null;
    if (!url) throw new Error("FLUX: No image returned");
    return { url, usedReference: !!referenceBuffer };
  };

  try {
    return await attempt();
  } catch (e) {
    // Retry once on rate limit
    if (e?.status === 429 || (e?.message || "").includes("429") || (e?.message || "").includes("rate limit")) {
      console.warn("  [FLUX] Rate limit, waiting 20s...");
      await new Promise(r => setTimeout(r, 20000));
      return await attempt();
    }
    throw e;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/comic-flux/structure
// Identical to /api/comic/structure — no image generation here, GPT only.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/structure", async (req, res) => {
  try {
    const {
      storyInput, guidedAnswers = {}, tone, comicStyle, mustHaveSentences,
      language, category, numPages = 5, referenceImages = [], referenceImageUrls = [],
      photoMode = "none", characters: frontendCharacters = [],
      projectId,
    } = req.body;

    const primaryRefUrl    = referenceImageUrls[0]?.url || null;
    const primaryRefBase64 = referenceImages[0] || null;

    const langMap = { de: "German", en: "English", fr: "French", es: "Spanish" };
    const lang    = langMap[language] || "German";
    const toneMap = { humorvoll: "humorous and light-hearted", kindgerecht: "warm and child-friendly", romantisch: "romantic and tender", biografisch: "nostalgic and personal", episch: "epic and adventurous" };
    const toneEn  = toneMap[tone] || tone || "warm and personal";

    let storyCtx = storyInput || "";
    for (const [k, v] of Object.entries(guidedAnswers)) {
      if (v && k !== "category" && k !== "specialMoments") storyCtx += `\n${k}: ${v}`;
    }

    const momentsText = guidedAnswers.specialMoments || "";
    const momentsList = momentsText ? momentsText.split("|").map(m => m.trim()).filter(Boolean) : [];

    // ── Character extraction (same logic as comic.js) ─────────────────────────
    let characters = [];

    if (photoMode === "family" && (primaryRefUrl || primaryRefBase64)) {
      console.log("[FLUX] Family photo mode: extracting characters from story");

      const charRes = await openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [{ role: "system", content: `Extract ALL characters from the story. For each write: name, approximate age. Respond ONLY with JSON: {"characters":[{"name":"Name","age":30}]}` }, { role: "user", content: storyCtx }],
        response_format: { type: "json_object" }, temperature: 0.3,
      });
      characters = JSON.parse(charRes.choices[0].message.content || "{}").characters || [];

      if (characters.length > 0) {
        console.log(`[FLUX] Describing ${characters.length} characters from family photo`);
        let refImageContent;
        if (primaryRefUrl) {
          try {
            const buf = await fetchBuffer(primaryRefUrl);
            refImageContent = { type: "image_url", image_url: { url: `data:image/jpeg;base64,${buf.toString("base64")}`, detail: "high" } };
          } catch (e) {
            console.error(`[FLUX] Pre-fetch failed: ${e.message}, falling back to URL`);
            refImageContent = { type: "image_url", image_url: { url: primaryRefUrl, detail: "high" } };
          }
        } else {
          refImageContent = { type: "image_url", image_url: { url: `data:image/jpeg;base64,${primaryRefBase64}`, detail: "high" } };
        }

        characters = await Promise.all(characters.map(async (char) => {
          try {
            const r = await openai.chat.completions.create({
              model: "gpt-4.1",
              messages: [{ role: "user", content: [refImageContent, { type: "text", text: `Describe the person who is approximately ${char.age} years old in this photo. Write 40-50 words about FACE AND BODY ONLY — NO clothing. Include: age appearance, hair color/style, skin tone, eye color, face shape, distinctive features, body type. Format: "${char.name}: [description]" English only.` }] }],
              max_tokens: 120,
            });
            return { ...char, visual_anchor: r.choices[0].message.content || `${char.name}, ${char.age} years old`, inPhoto: true };
          } catch (e) {
            console.error(`[FLUX] Photo description error for ${char.name}:`, e.message);
            return { ...char, visual_anchor: `${char.name}, ${char.age} years old`, inPhoto: false };
          }
        }));
      }

    } else if (photoMode === "individual" && frontendCharacters.length > 0) {
      console.log(`[FLUX] Individual photos mode: ${frontendCharacters.length} characters`);
      characters = await Promise.all(frontendCharacters.map(async (char) => {
        const matchedPhoto = referenceImageUrls.find(ref => ref.label.toLowerCase().trim() === char.name.toLowerCase().trim());
        if (matchedPhoto) {
          try {
            let photoImageContent;
            try {
              const buf = await fetchBuffer(matchedPhoto.url);
              photoImageContent = { type: "image_url", image_url: { url: `data:image/jpeg;base64,${buf.toString("base64")}`, detail: "high" } };
            } catch (e) {
              photoImageContent = { type: "image_url", image_url: { url: matchedPhoto.url, detail: "high" } };
            }
            const r = await openai.chat.completions.create({
              model: "gpt-4.1",
              messages: [{ role: "user", content: [photoImageContent, { type: "text", text: `Describe ONLY the FACE AND BODY of this person — NO clothing. Write 40-50 words. Format: "${char.name}: [description]" English only.` }] }],
              max_tokens: 120,
            });
            return { name: char.name, age: 30, visual_anchor: r.choices[0].message.content || `${char.name}, adult`, inPhoto: true };
          } catch (e) {
            return { name: char.name, age: 30, visual_anchor: `${char.name}, adult`, inPhoto: false };
          }
        }
        return { name: char.name, age: 30, visual_anchor: `${char.name}, adult`, inPhoto: false };
      }));

    } else {
      console.log("[FLUX] No photos mode: extracting characters from story");
      const charRes = await openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [{ role: "system", content: `Extract ALL characters from the story. For each write a DETAILED visual description (40-50 words): age, gender, hair, skin tone, eye color, distinctive features, body type. Respond ONLY with JSON: {"characters":[{"name":"Name","age":30,"visual_anchor":"DETAILED English description..."}]}` }, { role: "user", content: storyCtx }],
        response_format: { type: "json_object" }, temperature: 0.3,
      });
      characters = JSON.parse(charRes.choices[0].message.content || "{}").characters || [];
      characters = characters.map(c => ({ ...c, inPhoto: false }));
    }

    console.log(`[FLUX] ✓ Characters: ${characters.length} (photoMode: ${photoMode})`);

    // ── Page structure (identical to comic.js) ────────────────────────────────
    let pageStructures = [];

    if (momentsList.length > 0) {
      console.log(`[FLUX] Structuring ${momentsList.length} moments individually...`);
      const pagePromises = momentsList.map((moment, i) =>
        openai.chat.completions.create({
          model: "gpt-4.1",
          messages: [{
            role: "system",
            content: `You create ONE comic book page for a personal comic in ${lang}. Tone: ${toneEn}. Style: ${comicStyle}.
PANEL COUNT: 2-4 panels based on scene complexity.
Each panel: different angle/moment. Think cinematically.
For conversations use "dialogs" array. For silent panels use single "dialog"+"speaker".
Respond ONLY with JSON: {"id":"page${i+1}","pageNumber":${i+1},"title":"Short title in ${lang}","location":"English location","timeOfDay":"daytime","panels":[{"nummer":1,"size":"small","szene":"Shot type: scene description","dialogs":[{"speaker":"Name","text":"dialog"}],"bubble_type":"speech"}]}`
          }, {
            role: "user",
            content: `Scene: ${moment}\nStory context: ${storyCtx}${mustHaveSentences ? `\nInclude: ${mustHaveSentences}` : ""}`,
          }],
          response_format: { type: "json_object" },
          temperature: 0.8,
        }).then(r => {
          const data = JSON.parse(r.choices[0].message.content || "{}");
          return { id: `page${i + 1}`, pageNumber: i + 1, ...data };
        }).catch(e => {
          console.error(`[FLUX] Page ${i + 1} structure failed:`, e.message);
          return { id: `page${i + 1}`, pageNumber: i + 1, title: `Moment ${i + 1}`, location: "", timeOfDay: "daytime", panels: [] };
        })
      );
      pageStructures = await Promise.all(pagePromises);
    } else {
      const structRes = await openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [{
          role: "system",
          content: `Create a ${numPages}-page comic structure in ${lang}. Tone: ${toneEn}. Each page: 2-4 panels. Respond ONLY with JSON: {"pages":[{"id":"page1","pageNumber":1,"title":"Title","location":"English location","timeOfDay":"afternoon","panels":[{"nummer":1,"szene":"scene","dialog":"dialog","speaker":"Name","bubble_type":"speech"}]}]}`
        }, { role: "user", content: storyCtx }],
        response_format: { type: "json_object" }, temperature: 0.85,
      });
      pageStructures = JSON.parse(structRes.choices[0].message.content || "{}").pages || [];
    }

    console.log(`[FLUX] ✓ Structure: ${pageStructures.length} pages, ${characters.length} characters`);
    res.json({ pages: pageStructures, characters });
  } catch (err) {
    console.error("[FLUX] Structure error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/comic-flux/cover
// ─────────────────────────────────────────────────────────────────────────────
router.post("/cover", async (req, res) => {
  try {
    const {
      characters = [], location = "", storyInput = "", guidedAnswers = {},
      referenceImages = [], referenceImageUrls = [], coverRegenNote = "",
      projectId,
    } = req.body;

    if (!projectId) return res.status(400).json({ error: "projectId is required", coverImageUrl: "" });

    const charDesc  = characters.map(c => `${c.name}: ${c.visual_anchor}`).join("\n");
    const charNames = characters.map(c => c.name).join(", ");

    // Extract cover location via GPT
    let coverLocation = location || "";
    if (!coverLocation) {
      const storyText = `${storyInput} ${guidedAnswers.location || ""} ${guidedAnswers.specialMoments || ""}`;
      try {
        const locRes = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: `Extract the main location from this story. Return ONLY 2-5 English words.\n\nStory: ${storyText.substring(0, 500)}\n\nLocation:` }],
          temperature: 0.3, max_tokens: 20,
        });
        coverLocation = (locRes.choices[0].message.content || "").trim().toLowerCase() || "beautiful park";
      } catch (e) {
        coverLocation = "beautiful park with trees and flowers";
      }
    }
    if (coverRegenNote?.trim()) coverLocation = sanitizePrompt(coverRegenNote);
    console.log(`[FLUX] Cover location: "${coverLocation}"`);

    const prompt = sanitizePrompt(`Comic book cover illustration. Redraw the people from this photo as hand-drawn comic characters.

VISUAL STYLE — apply exactly:
- Thick black ink outlines 3-4px wide on every figure and edge
- Flat cel-shaded color fills with NO gradients, NO photographic lighting
- Warm vivid colors: golden yellows, deep blues, rich reds
- Expressive stylized faces with clearly defined ink features
- NOT photorealistic, NOT manga, NOT a photo filter

Keep faces recognizable from the photo. Draw all characters: ${charNames}.
Setting: ${coverLocation} visible in the background as an illustrated scene.
Characters in casual clothes appropriate for the location.

Absolutely no text, no words, no letters, no title anywhere in the image.`);

    // Fetch reference image
    const primaryRefUrl    = referenceImageUrls[0]?.url || null;
    const primaryRefBase64 = referenceImages[0] || null;
    let refBuffer = null;

    if (primaryRefUrl) {
      try { refBuffer = await fetchBuffer(primaryRefUrl); }
      catch (e) { console.warn("[FLUX] Cover ref fetch failed:", e.message); }
    } else if (primaryRefBase64) {
      refBuffer = Buffer.from(primaryRefBase64.replace(/^data:image\/\w+;base64,/, ""), "base64");
    }

    const { url: rawUrl } = await generateImageFlux(prompt, refBuffer, "1024x1024");
    const coverUrl = await saveImage(rawUrl, projectId, `cover-${Date.now()}`);
    await saveCharacterRefs(projectId, characters, coverUrl || rawUrl, referenceImageUrls);

    console.log("[FLUX] ✓ Cover done");
    res.json({ coverImageUrl: coverUrl || rawUrl, projectId });
  } catch (err) {
    console.error("[FLUX] Cover error:", err.message);
    res.status(500).json({ error: err.message, coverImageUrl: "", projectId: req.body.projectId });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/comic-flux/page
// ─────────────────────────────────────────────────────────────────────────────
router.post("/page", async (req, res) => {
  try {
    const {
      page, characters = [], comicStyle = "emotional",
      referenceImages = [], referenceImageUrls = [], coverImageUrl = "",
      reillustrationNote = "", projectId, photoMode = "none",
    } = req.body;

    // Enrich characters from Supabase if visual_anchor missing
    let enrichedCharacters = characters;
    if (characters.some(c => !c.visual_anchor || c.visual_anchor === c.role) && projectId) {
      try {
        const refs = await getCharacterRefs(projectId);
        if (refs.length > 0) {
          enrichedCharacters = characters.map(c => {
            const ref = refs.find(r => r.character_name.toLowerCase() === c.name.toLowerCase());
            return ref ? { ...c, visual_anchor: ref.visual_anchor || c.visual_anchor, inPhoto: ref.in_photo } : c;
          });
        }
      } catch (e) { console.warn("[FLUX] Character enrichment failed:", e.message); }
    }
    const finalCharacters = enrichedCharacters;

    // Pick reference photo for this scene
    let primaryRefUrl    = referenceImageUrls[0]?.url || null;
    const primaryRefBase64 = referenceImages[0] || null;

    if (referenceImageUrls.length > 1) {
      const pageText = page.panels.map(p => p.szene || "").join(" ").toLowerCase();
      const pageCharNames = page.panels.flatMap(p => [p.speaker, ...(p.dialogs || []).map(d => d.speaker)]).filter(Boolean).map(n => n.toLowerCase());
      const matched = referenceImageUrls.find(ref =>
        pageCharNames.some(n => n.includes(ref.label.toLowerCase()) || ref.label.toLowerCase().includes(n)) ||
        pageText.includes(ref.label.toLowerCase())
      );
      if (matched) primaryRefUrl = matched.url;
    }

    const mood       = MOOD_MOD[comicStyle] || MOOD_MOD.emotional;
    const panelCount = (page.panels || []).length;
    const layoutDesc = panelCount <= 2 ? "2 equal panels" : panelCount === 3 ? "1 large panel top, 2 smaller panels bottom" : "2×2 grid";

    // Safety rewrite
    const { rewriteIfRisky } = require('../lib/safety-rewriter');
    const rawPanelDesc = (page.panels || []).length > 0
      ? (page.panels || []).map(p => `Panel ${p.nummer}: ${p.szene || ""}`).join("\n")
      : `A comic scene: ${page.title}`;
    const panelDescriptions = await rewriteIfRisky(rawPanelDesc);

    const outfit      = getOutfit(page.location, panelDescriptions, page.title);
    const ageContext  = getAgeContext(page.title, panelDescriptions);
    const charAnchors = finalCharacters.map(c => `${c.name}: ${c.visual_anchor}`).join(". ");
    const charClothing = finalCharacters.map(c => `${c.name}: ${outfit}`).join("\n");

    console.log(`[FLUX]   → Age context: ${ageContext.ageContext} (useReference: ${ageContext.useReference})`);
    if (reillustrationNote) console.log(`[FLUX]   → Re-illustration: "${reillustrationNote}"`);

    // ── Reference strategy for FLUX ───────────────────────────────────────────
    // Use cover as reference (compressed small) for character consistency.
    // If no cover, fall back to user photo.
    // Keep reference small to avoid DeepInfra connection errors.
    let reference = null;
    let refSource  = "none";

    const sharp = require('sharp');

    if (coverImageUrl) {
      try {
        const buf = await fetchBuffer(coverImageUrl);
        // Compress aggressively — FLUX only needs face features, not full resolution
        reference = await sharp(buf)
          .resize({ width: 256, withoutEnlargement: true })
          .jpeg({ quality: 60 })
          .toBuffer();
        refSource = "cover-compressed";
        console.log(`[FLUX]   → Cover compressed to ${(reference.length/1024).toFixed(0)}KB for reference`);
      } catch (e) {
        console.warn(`[FLUX]   → Cover fetch failed: ${e.message}, trying user photo`);
      }
    }

    if (!reference && primaryRefUrl) {
      try {
        const buf = await fetchBuffer(primaryRefUrl);
        reference = await sharp(buf)
          .resize({ width: 256, withoutEnlargement: true })
          .jpeg({ quality: 60 })
          .toBuffer();
        refSource = "user-photo-compressed";
        console.log(`[FLUX]   → User photo compressed to ${(reference.length/1024).toFixed(0)}KB for reference`);
      } catch (e) {
        console.warn(`[FLUX]   → User photo fetch failed: ${e.message}`);
      }
    } else if (!reference && primaryRefBase64) {
      const buf = Buffer.from(primaryRefBase64.replace(/^data:image\/\w+;base64,/, ""), "base64");
      reference = await sharp(buf)
        .resize({ width: 256, withoutEnlargement: true })
        .jpeg({ quality: 60 })
        .toBuffer();
      refSource = "user-photo-compressed";
    }

    if (!reference) {
      refSource = "generate-only";
      console.log(`[FLUX]   → No reference available, generating from text only`);
    }

    // ── Build prompt — FLUX has a ~2048 char prompt limit ────────────────────
    const faceNote = reference
      ? `Use the reference image ONLY to identify the characters' faces and hair. Do NOT copy the photo composition or layout.`
      : ``;

    const prompt = sanitizePrompt(`Comic book page. ${faceNote}

VISUAL STYLE — apply exactly:
- Thick black ink outlines 3-4px wide on every figure, object and panel border
- Flat cel-shaded color fills with NO gradients, NO photographic lighting
- Halftone dot shadows in dark areas
- Warm vivid colors: golden yellows, deep blues, rich reds
- Expressive stylized faces — NOT photorealistic faces
- White gutters between panels
- Printed comic book paper look

LAYOUT: Exactly ${panelCount} panels in ${layoutDesc}. Each panel separated by thick black borders. Every panel shows a DIFFERENT moment — NOT the same scene from different angles.

CHARACTERS (identical stylized faces in every panel):
${charAnchors}

CLOTHING: ${outfit}
${ageContext.modifier ? `\nAge: ${ageContext.modifier}` : ""}

PANELS:
${panelDescriptions}
${reillustrationNote ? `\nAdjust: ${reillustrationNote}` : ""}

No text, no speech bubbles, no letters anywhere in the image.`);

    console.log(`[FLUX] Generating page "${page.title}" (${panelCount} panels, ref: ${refSource})`);

    const hasPhotos = (photoMode === "family" || photoMode === "individual") && (primaryRefUrl || primaryRefBase64 || coverImageUrl);

    let { url: rawUrl, usedReference } = await generateImageFlux(prompt, reference).catch(async (err) => {
      console.warn(`[FLUX] First attempt failed: ${err.message}, retrying without reference`);
      // Retry without reference to avoid any size/format issues
      const safePrompt = `Franco-Belgian Bande Dessinée comic page. ${panelCount} panels in ${layoutDesc}. Thick black borders between panels. Hand-drawn ink style, flat cel-shaded colors.
Characters: ${charAnchors}
Clothing: ${outfit}
Panels: ${page.panels.map(p => `Panel ${p.nummer}: ${p.szene || "scene"}`).join(" | ")}
No text, no speech bubbles.`;
      return await generateImageFlux(safePrompt, null);
    });

    // If reference wasn't used but we have photos — retry with safer prompt
    if (!usedReference && hasPhotos) {
      console.warn("[FLUX] ⚠️ Reference not used, retrying with sanitized prompt");
      try {
        const safeRetry = await generateImageFlux(
          `${refNote}${COMIC_STYLE} ${mood}\nComic page: "${page.title}" — ${panelCount} panels.\nCHARACTERS: ${charAnchors}\nCLOTHING: ${outfit}\nSCENE: ${page.panels.map(p => `Panel ${p.nummer}: Warm family moment together`).join("\n")}\nNO text, NO speech bubbles.`,
          reference
        );
        if (safeRetry.usedReference) {
          rawUrl = safeRetry.url;
          usedReference = true;
          console.log("[FLUX] ✓ Retry succeeded with reference");
        }
      } catch (e) {
        console.warn("[FLUX] Retry also failed, using result without reference:", e.message);
      }
    }

    // Save image
    const folder    = projectId || `flux-book-${Date.now()}`;
    const filename  = page.id || `page-${Date.now()}`;
    const storedUrl = await saveImage(rawUrl, folder, filename);
    if (!storedUrl) console.error(`[FLUX] ❌ Failed to save image for page "${page.title}"`);

    const finalUrl = storedUrl || rawUrl;

    // Panel position detection
    let panelPositions = null;
    try {
      const visionRes = await openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [{ role: "user", content: [
          { type: "image_url", image_url: { url: finalUrl, detail: "low" } },
          { type: "text", text: `Comic page with ${panelCount} panels. Return positions as % coordinates. JSON only: {"panels":[{"nummer":1,"top":5,"left":0,"width":100,"height":45}]}` },
        ]}],
        response_format: { type: "json_object" }, max_tokens: 200, temperature: 0.1,
      });
      const posData = JSON.parse(visionRes.choices[0].message.content || "{}");
      if (posData.panels?.length > 0) panelPositions = posData.panels;
    } catch (e) { console.warn("[FLUX] Panel detection failed:", e.message); }

    if (projectId) {
      const pageCharacters = page.panels.flatMap(p => p.speaker ? [p.speaker] : []).filter(Boolean);
      await savePage(projectId, page.pageNumber || 1, finalUrl, pageCharacters, refSource, 100);
    }

    console.log(`[FLUX] ✓ Page "${page.title}" done`);
    res.json({ imageUrl: finalUrl, panels: page.panels, panelPositions });
  } catch (err) {
    console.error("[FLUX] Page error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/comic-flux/ending  (identical to /api/comic/ending)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/ending", async (req, res) => {
  try {
    const { storyInput, guidedAnswers = {}, tone, language, dedication, dedicationFrom } = req.body;
    const lang   = { de: "German", en: "English", fr: "French", es: "Spanish" }[language] || "German";
    const toneEn = { humorvoll: "humorous and light-hearted", kindgerecht: "warm and child-friendly", romantisch: "romantic and tender", biografisch: "nostalgic and personal", episch: "epic and adventurous" }[tone] || "warm, personal, loving";

    const r = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [{
        role: "system",
        content: `Write a beautiful dedication for the last page of a comic book in ${lang}. 2-3 complete sentences. Elegant, flowing language. Address the main person(s) directly by name. Mention 1-2 concrete moments from the story. Tone: ${toneEn}. NO sender signature. Write ONLY the dedication text.`
      }, {
        role: "user",
        content: `Story: ${storyInput || ""}\n${Object.entries(guidedAnswers).filter(([k, v]) => v && k !== "category").map(([k, v]) => `${k}: ${v}`).join("\n")}${dedication ? `\nUser dedication: ${dedication}` : ""}`,
      }],
      temperature: 0.7, max_tokens: 300,
    });

    res.json({ endingText: r.choices[0].message.content?.trim() || "" });
  } catch (err) {
    console.error("[FLUX] Ending error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/comic-flux/export-pdf  (reuses the same pdf-generator)
// ─────────────────────────────────────────────────────────────────────────────
const { createComicPDF } = require('../lib/pdf-generator');

router.post("/export-pdf", async (req, res) => {
  try {
    const { project } = req.body;
    if (!project) return res.status(400).json({ error: "Project data required" });

    console.log(`[FLUX] Creating PDF for project: ${project.title}`);
    const pdfBuffer = await createComicPDF(project);

    const safe = (project.title || "comic").replace(/[^a-z0-9äöüß\s-]/gi, "").replace(/\s+/g, "-");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${safe}.pdf"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    res.send(pdfBuffer);
    console.log(`[FLUX] ✓ PDF created: ${pdfBuffer.length} bytes`);
  } catch (err) {
    console.error("[FLUX] PDF export error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/comic-flux/health
// Checks: DEEPINFRA_API_KEY set, DeepInfra reachable, correct model available
// ─────────────────────────────────────────────────────────────────────────────
router.get("/health", async (req, res) => {
  const result = {
    status: "ok",
    model: FLUX_MODEL,
    deepinfra_key: process.env.DEEPINFRA_API_KEY ? "✓ set" : "❌ MISSING",
    openai_key:    process.env.OPENAI_API_KEY    ? "✓ set" : "❌ MISSING",
    deepinfra_reachable: null,
    error: null,
  };

  // Only do live test if ?test=true is passed (avoids timeout on simple health checks)
  if (req.query.test === "true") {
    // First: basic TCP/HTTP connectivity to DeepInfra
    try {
      const pingRes = await fetch("https://api.deepinfra.com/v1/openai/models", {
        method: "GET",
        headers: { "Authorization": `Bearer ${process.env.DEEPINFRA_API_KEY}` },
        signal: AbortSignal.timeout(10000),
      });
      result.deepinfra_ping = `HTTP ${pingRes.status}`;
    } catch (pingErr) {
      result.deepinfra_ping = `FAILED: ${pingErr.message}`;
    }

    // Second: actual image generation
    try {
      const whitePng = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==",
        "base64"
      );
      const blob = new Blob([whitePng], { type: "image/png" });
      const file = new File([blob], "test.png", { type: "image/png" });

      const testRes = await deepinfra.images.edit({
        model:  FLUX_MODEL,
        image:  file,
        prompt: "A simple white square. Comic style.",
        n:      1,
        size:   "256x256",
      });

      const item = (testRes.data || [])[0];
      const hasImage = !!(item?.url || item?.b64_json);
      result.deepinfra_reachable = hasImage;
      result.test_image_returned = hasImage;
    } catch (e) {
      result.deepinfra_reachable = false;
      result.error = e.message;
      result.status = "error";
    }
  } else {
    result.deepinfra_reachable = "not tested (add ?test=true to run live test)";
  }

  const httpStatus = result.status === "ok" ? 200 : 500;
  console.log(`[FLUX] Health check: ${JSON.stringify(result)}`);
  res.status(httpStatus).json(result);
});

module.exports = router;
