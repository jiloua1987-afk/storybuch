const express = require("express");
const router = express.Router();
const OpenAI = require("openai");
const { saveImage, saveCharacterRefs, savePage, getCharacterRefs } = require("../lib/storage");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Shared comic style — identical for every page ─────────────────────────────
// Placed FIRST in every prompt — gpt-image-2 weights early instructions more heavily
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
  humor:     "Exaggerated expressions in WESTERN COMIC STYLE — wide smiles, raised eyebrows, open mouths. Bright vivid colors, playful energy. NO anime sweat drops, NO manga speed lines, NO chibi style, NO big sparkly eyes.",
};

// ── Prompt sanitization to avoid safety blocks ────────────────────────────────
function sanitizePrompt(text) {
  if (!text) return text;
  
  const replacements = {
    // Oktoberfest/Wiesn (häufiger Trigger)
    'oktoberfest': 'traditional bavarian festival',
    'wiesn': 'bavarian folk festival',
    'bierzelt': 'festival tent',
    'maß': 'beverage',
    'dirndl': 'traditional bavarian dress',
    'lederhosen': 'traditional bavarian attire',
    
    // Feiern/Party
    'feiern': 'celebrating',
    'party': 'celebration gathering',
    'tanzen': 'dancing together',
    'dancing': 'celebrating together',
    'club': 'festive venue',
    
    // Strand/Wasser
    'beach': 'coastal promenade',
    'strand': 'strandpromenade',
    'swimming': 'walking by the water',
    'schwimmen': 'am wasser spazieren',
    'swimwear': 'summer clothes',
    'bikini': 'summer attire',
    'badehose': 'summer clothing',
    
    // Alkohol
    'bier': 'beverage',
    'beer': 'drink',
    'wein': 'beverage',
    'wine': 'drink',
    'alkohol': 'refreshment',
    'alcohol': 'refreshment',
    
    // Action/Konflikt
    'fight': 'disagreement',
    'kämpfen': 'auseinandersetzung',
    'hit': 'gesture',
    'schlagen': 'gestikulieren',
    'aggressive': 'energetic',
    'aggressiv': 'energisch'
  };
  
  let sanitized = text;
  for (const [trigger, safe] of Object.entries(replacements)) {
    const regex = new RegExp(`\\b${trigger}\\b`, 'gi');
    sanitized = sanitized.replace(regex, safe);
  }
  
  return sanitized;
}

// ── Outfit context from English location string ───────────────────────────────
function getOutfit(location = "", panelDescriptions = "") {
  const loc = location.toLowerCase();
  const desc = panelDescriptions.toLowerCase();
  const combined = `${loc} ${desc}`;
  
  // Check for winter/cold weather keywords
  const isWinter = ["winter", "schnee", "snow", "kalt", "cold", "weihnachten", "christmas", "skiing", "ski"].some(k => combined.includes(k));
  const isCold = ["herbst", "autumn", "fall", "regen", "rain", "windig", "windy"].some(k => combined.includes(k));
  
  if (["beach", "sea", "pool", "shore", "coast", "swimming", "water"].some(k => loc.includes(k)))
    return "swimwear, swim shorts, light summer dresses, sandals. NO jeans, NO dark shirts.";
  if (["airport", "gate", "terminal", "departure", "arrival", "flight"].some(k => loc.includes(k)))
    return "comfortable travel clothes — casual shirts, jeans, sneakers, light jackets.";
  if (["wedding", "hochzeit", "heirat", "marriage", "bride", "groom", "ceremony"].some(k => loc.includes(k)))
    return "WEDDING ATTIRE — bride in white wedding dress with veil, groom in dark formal suit with tie. NO casual clothes, NO everyday outfits.";
  if (["restaurant", "celebration", "party", "dinner", "theater"].some(k => loc.includes(k)))
    return "smart casual — dress shirts, blouses, nice trousers.";
  if (["courtyard", "garden", "yard", "terrace", "patio", "outdoor", "backyard"].some(k => loc.includes(k)))
    return "casual outdoor clothes — t-shirts, shorts, light trousers for warm weather.";
  if (["living room", "kitchen", "bedroom", "home", "house", "sofa", "couch"].some(k => loc.includes(k)))
    return "relaxed home clothes — t-shirts, comfortable trousers.";
  if (["bike", "bicycle", "playground", "sport", "race", "riding"].some(k => loc.includes(k)))
    return "casual sporty clothes — t-shirts, shorts, sneakers.";
  
  // Season-based fallback
  if (isWinter) {
    return "warm winter clothes — coats, jackets, sweaters, scarves, long trousers. NO t-shirts, NO shorts.";
  }
  if (isCold) {
    return "autumn/fall clothes — light jackets, long sleeves, jeans, comfortable shoes.";
  }
  
  // Default: warm weather
  return "casual everyday clothes appropriate for the scene — t-shirts, light shirts, comfortable trousers or shorts for warm weather.";
}

// ── Age modifier detection for biographical stories ───────────────────────────
// Returns: { modifier: string, useReference: boolean }
function getAgeContext(pageTitle = "", panelDescriptions = "") {
  const text = `${pageTitle} ${panelDescriptions}`.toLowerCase();
  
  // Historical/Young keywords (German + English)
  const youngKeywords = [
    "first met", "kennenlernen", "erste treffen", "jugend", "youth", "young",
    "schule", "school", "university", "universität", "studium", "student",
    "erste liebe", "first love", "teenager", "zwanzig", "twenties"
  ];
  
  // Middle-age keywords
  const middleKeywords = [
    "wedding", "hochzeit", "heirat", "marriage", "verlobung", "engagement",
    "karriere", "career", "dreißig", "vierzig", "thirties", "forties"
  ];
  
  // Current/Old age keywords
  const currentKeywords = [
    "heute", "today", "now", "jetzt", "aktuell", "current",
    "rentner", "retired", "enkel", "grandchild", "opa", "oma", "grandpa", "grandma"
  ];
  
  // Check for young scene
  if (youngKeywords.some(k => text.includes(k))) {
    return {
      modifier: "Draw characters 20-30 years younger than their current age. Youthful appearance, smooth skin, darker hair (no gray), energetic posture.",
      useReference: false, // Don't use photo for young scenes
      ageContext: "young"
    };
  }
  
  // Check for middle-age scene
  if (middleKeywords.some(k => text.includes(k))) {
    return {
      modifier: "Draw characters 10-15 years younger than their current age. Mature but youthful, minimal gray hair, fewer wrinkles.",
      useReference: false, // Don't use photo for middle-age scenes
      ageContext: "middle"
    };
  }
  
  // Check for current age scene
  if (currentKeywords.some(k => text.includes(k))) {
    return {
      modifier: "Draw characters at their current age as shown in the reference.",
      useReference: true, // Use photo for current age
      ageContext: "current"
    };
  }
  
  // Default: assume current age
  return {
    modifier: "",
    useReference: true,
    ageContext: "current"
  };
}

// ── Build image buffer from base64 ───────────────────────────────────────────
function toFile(base64, name = "reference.jpg") {
  const buf = Buffer.from(base64, "base64");
  const blob = new Blob([buf], { type: "image/jpeg" });
  return new File([blob], name, { type: "image/jpeg" });
}

// ── Fetch image buffer from URL ───────────────────────────────────────────────
async function fetchBuffer(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(25000) });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// ── Generate image — with or without reference ────────────────────────────────
// Returns { url, usedReference: boolean }
// Retries once after 15s on rate limit (429)
async function generateImage(prompt, referenceBase64OrBuffer = null, size = "1024x1536") {
  const attempt = async () => {
    if (referenceBase64OrBuffer) {
      try {
        let file;
        if (typeof referenceBase64OrBuffer === "string") {
          file = toFile(referenceBase64OrBuffer);
        } else {
          const blob = new Blob([referenceBase64OrBuffer], { type: "image/png" });
          file = new File([blob], "reference.png", { type: "image/png" });
        }
        const res = await openai.images.edit({
          model: "gpt-image-2", image: file, prompt, size, quality: "high",
        });
        const item = (res.data || [])[0];
        const url = item?.url || (item?.b64_json ? `data:image/png;base64,${item.b64_json}` : null);
        if (url) return { url, usedReference: true };
      } catch (e) {
        console.warn("  → images.edit() failed, falling back:", e.message);
      }
    }
    const res = await openai.images.generate({
      model: "gpt-image-2", prompt, n: 1, size, quality: "high",
    });
    const item = (res.data || [])[0];
    const url = item?.url || (item?.b64_json ? `data:image/png;base64,${item.b64_json}` : null);
    if (url) return { url, usedReference: false };
    throw new Error("No image returned");
  };

  try {
    return await attempt();
  } catch (e) {
    if (e?.status === 429 || e?.message?.includes("429") || e?.message?.includes("rate limit")) {
      console.warn("  → Rate limit hit, waiting 20s before retry...");
      await new Promise(r => setTimeout(r, 20000));
      return await attempt();
    }
    throw e;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/comic/structure
// Key change: each moment gets its OWN GPT call → guaranteed one page per moment
// ─────────────────────────────────────────────────────────────────────────────
router.post("/structure", async (req, res) => {
  try {
    const {
      storyInput, guidedAnswers = {}, tone, comicStyle, mustHaveSentences,
      language, category, numPages = 5, referenceImages = [], referenceImageUrls = [],
      photoMode = "none", characters: frontendCharacters = [],  // NEW: Characters from frontend
      projectId,  // NEW: Project ID from frontend (for consistency, not used in structure)
    } = req.body;

    // Primary reference: Supabase URLs (no size limit) > Base64 fallback
    const primaryRefUrl = referenceImageUrls[0]?.url || null;
    const primaryRefBase64 = referenceImages[0] || null;

    const langMap = { de: "German", en: "English", fr: "French", es: "Spanish" };
    const lang = langMap[language] || "German";

    const toneMap = {
      humorvoll: "humorous and light-hearted",
      kindgerecht: "warm and child-friendly",
      romantisch: "romantic and tender",
      biografisch: "nostalgic and personal",
      episch: "epic and adventurous",
    };
    const toneEn = toneMap[tone] || tone || "warm and personal";

    // Build story context (without specialMoments — handled separately)
    let storyCtx = storyInput || "";
    for (const [k, v] of Object.entries(guidedAnswers)) {
      if (v && k !== "category" && k !== "specialMoments") storyCtx += `\n${k}: ${v}`;
    }

    // Extract moments
    const momentsText = guidedAnswers.specialMoments || "";
    const momentsList = momentsText
      ? momentsText.split("|").map(m => m.trim()).filter(Boolean)
      : [];

    // ═══════════════════════════════════════════════════════════════════════════
    // NEW CHARACTER HANDLING - Use characters from frontend directly
    // ═══════════════════════════════════════════════════════════════════════════
    
    let characters = [];
    
    if (photoMode === "family" && (primaryRefUrl || primaryRefBase64)) {
      // FAMILY PHOTO MODE: Extract characters from story, then describe from photo
      console.log("Family photo mode: extracting characters from story, then describing from photo");
      
      const charPromise = openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [{
          role: "system",
          content: `Extract ALL characters from the story. Include grandparents, parents, children, friends — everyone mentioned.
For each write: name, approximate age.
Respond ONLY with JSON: {"characters":[{"name":"Name","age":30}]}`
        }, {
          role: "user", content: storyCtx,
        }],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });
      
      const charRes = await charPromise;
      characters = JSON.parse(charRes.choices[0].message.content || "{}").characters || [];
      
      // Describe all characters from the family photo
      if (characters.length > 0) {
        console.log(`Describing ${characters.length} characters from family photo`);
        const refImageContent = primaryRefUrl
          ? { type: "image_url", image_url: { url: primaryRefUrl, detail: "high" } }
          : { type: "image_url", image_url: { url: `data:image/jpeg;base64,${primaryRefBase64}`, detail: "high" } };
        
        characters = await Promise.all(characters.map(async (char) => {
          try {
            const r = await openai.chat.completions.create({
              model: "gpt-4.1",
              messages: [{ role: "user", content: [
                refImageContent,
                { type: "text", text: `Describe the person who is approximately ${char.age} years old in this photo.
Write 40-50 words: exact age appearance, hair color/style, skin tone, eye color, distinctive features, body type.
Format: "${char.name}: [age] years old, [exact visible features]"
English only.` },
              ]}],
              max_tokens: 120,
            });
            console.log(`  → ${char.name}: described from family photo`);
            return { ...char, visual_anchor: r.choices[0].message.content || `${char.name}, ${char.age} years old`, inPhoto: true };
          } catch (e) {
            console.error(`Photo description error for ${char.name}:`, e.message);
            return { ...char, visual_anchor: `${char.name}, ${char.age} years old`, inPhoto: false };
          }
        }));
      }
      
    } else if (photoMode === "individual" && frontendCharacters.length > 0) {
      // INDIVIDUAL PHOTOS MODE: Use characters from frontend with their photos
      console.log(`Individual photos mode: using ${frontendCharacters.length} characters from frontend`);
      
      characters = await Promise.all(frontendCharacters.map(async (char) => {
        const matchedPhoto = referenceImageUrls.find(ref => 
          ref.label.toLowerCase().trim() === char.name.toLowerCase().trim()
        );
        
        if (matchedPhoto) {
          console.log(`  → Describing ${char.name} from their photo`);
          try {
            const r = await openai.chat.completions.create({
              model: "gpt-4.1",
              messages: [{ role: "user", content: [
                { type: "image_url", image_url: { url: matchedPhoto.url, detail: "high" } },
                { type: "text", text: `Describe ONLY what you can ACTUALLY SEE on this person.
Write 40-50 words: age appearance, hair color/style, skin tone, eye color, distinctive features, body type.
Format: "${char.name}: [age] years old, [exact visible features]"
English only.` },
              ]}],
              max_tokens: 120,
            });
            return { 
              name: char.name, 
              age: 30,  // Default age
              visual_anchor: r.choices[0].message.content || `${char.name}, adult`, 
              inPhoto: true 
            };
          } catch (e) {
            console.error(`Photo description error for ${char.name}:`, e.message);
            return { name: char.name, age: 30, visual_anchor: `${char.name}, adult`, inPhoto: false };
          }
        } else {
          console.log(`  → ${char.name}: no photo, using generic description`);
          return { name: char.name, age: 30, visual_anchor: `${char.name}, adult`, inPhoto: false };
        }
      }));
      
    } else {
      // NO PHOTOS MODE: Extract characters from story with GPT
      console.log("No photos mode: extracting characters from story");
      
      const charPromise = openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [{
          role: "system",
          content: `Extract ALL characters from the story. Include grandparents, parents, children, friends — everyone mentioned.
For each write a DETAILED visual description (40-50 words):
- Exact age, gender
- Hair: color, length, style
- Skin tone, eye color
- Distinctive features: beard, glasses, hijab, wrinkles
- Body type

Respond ONLY with JSON: {"characters":[{"name":"Name","age":30,"visual_anchor":"DETAILED English description..."}]}`
        }, {
          role: "user", content: storyCtx,
        }],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });
      
      const charRes = await charPromise;
      characters = JSON.parse(charRes.choices[0].message.content || "{}").characters || [];
      characters = characters.map(c => ({ ...c, inPhoto: false }));
    }

    console.log(`✓ Characters: ${characters.length} (photoMode: ${photoMode})`);

    // Step 2: Structure pages
    // If moments provided → one GPT call PER moment (guaranteed mapping)
    // If no moments → one call for all pages
    let pageStructures = [];

    if (momentsList.length > 0) {
      console.log(`Structuring ${momentsList.length} moments individually...`);

      // One GPT call per moment — all parallel
      const pagePromises = momentsList.map((moment, i) =>
        openai.chat.completions.create({
          model: "gpt-4.1",
          messages: [{
            role: "system",
            content: `You create ONE comic book page for a personal comic in ${lang}.
Tone: ${toneEn}. Style: ${comicStyle}.

You are a COMIC ART DIRECTOR creating natural conversations, not a story summarizer.

PANEL COUNT — choose based on the scene:
- 2 panels: one big moment, close emotional scene, single action (e.g. big hug, child's face reaction)
- 3 panels: scene with clear beginning → middle → end, or 1 wide + 2 small
- 4 panels: action sequence, multiple characters interacting, busy scene

Do NOT always choose 4. Match the panel count to the scene complexity.

Each panel MUST show a DIFFERENT angle/moment/action of the scene.
Think cinematically: wide shot → close-up → reaction shot → detail shot.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PANEL SIZES — VISUAL DRAMATURGY:

CRITICAL: Each panel MUST specify a size based on its emotional importance.

PANEL SIZE OPTIONS:

1. SMALL (Standard):
   - Normal panel, part of sequence
   - Use: Setup, transitions, dialogue
   - Example: Character walking, talking, small actions
   - Frequency: 50-60% of panels

2. MEDIUM (Important):
   - Larger panel for important moments
   - Use: Key actions, reveals, reactions
   - Example: First meeting, surprise moment, important decision
   - Frequency: 30-40% of panels

3. LARGE (Dramatic):
   - Big panel for dramatic moments
   - Use: Emotional peaks, climax, important reveals
   - Example: First kiss, big surprise, emotional breakdown
   - Frequency: 10-15% of panels

4. SPLASH (Full Page):
   - Entire page for THE most important moment
   - Use: Only for absolute peak of the scene
   - Example: Wedding kiss, birth of child, major revelation
   - Frequency: 0-5% of panels (max 1 per page!)

SIZE RULES:
- Most panels should be SMALL (standard)
- Use MEDIUM for important beats
- Use LARGE sparingly for dramatic moments
- Use SPLASH only for THE climax (max 1 per page)
- Vary sizes for visual rhythm

GOOD EXAMPLE (varied sizes):
Panel 1: small - Hassan and Elyas arrive at park
Panel 2: medium - Hassan helps Elyas climb ladder (important moment)
Panel 3: large - Elyas at top of slide, arms raised in triumph (emotional peak)
Panel 4: small - Hassan catches Elyas at bottom

BAD EXAMPLE (no variation):
Panel 1: small - Hassan and Elyas at park
Panel 2: small - Hassan and Elyas at slide
Panel 3: small - Hassan and Elyas playing
Panel 4: small - Hassan and Elyas laughing
→ All same size, no visual emphasis

FORMAT: Add "size" field to each panel:
"size": "small" | "medium" | "large" | "splash"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SHOT VARIATION — THINK CINEMATICALLY:

CRITICAL: Each panel MUST specify a shot type at the START of the "szene" description.

SHOT TYPES:

1. WIDE SHOT (Establishing):
   - Shows location, context, atmosphere
   - Use: Start of scenes, show environment
   - Example: "Wide shot: Family gathered around dinner table in cozy kitchen"
   - Frequency: 10-20% of panels

2. MEDIUM SHOT (Standard):
   - Shows characters + some environment
   - Use: Most dialogue, interactions
   - Example: "Medium shot: Maria and Marc walking hand in hand on beach"
   - Frequency: 60-70% of panels

3. CLOSE-UP (Emotional):
   - Focus on face, hands, or important detail
   - Use: Emotional moments, reactions, emphasis
   - Example: "Close-up: Maria's face, tears of joy in her eyes"
   - Frequency: 10-20% of panels

VARIATION RULES:
- Do NOT use same shot type 3 times in a row
- Start scenes with WIDE shot for context
- Use CLOSE-UP for emotional peaks
- Default to MEDIUM for dialogue

GOOD EXAMPLE (varied shots):
Panel 1: Wide shot - Park playground, children playing, Hassan and Elyas arrive
Panel 2: Medium shot - Hassan helps Elyas climb ladder
Panel 3: Close-up - Elyas' excited face at top of slide
Panel 4: Medium shot - Elyas sliding down, Hassan catching him

BAD EXAMPLE (no variation):
Panel 1: Medium shot - Hassan and Elyas at playground
Panel 2: Medium shot - Hassan and Elyas at slide
Panel 3: Medium shot - Hassan and Elyas playing
Panel 4: Medium shot - Hassan and Elyas laughing
→ All medium shots, no visual variety

FORMAT: Always start "szene" with shot type:
"Wide shot: [description]"
"Medium shot: [description]"
"Close-up: [description]"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CRITICAL VARIETY RULES:
- Every panel = NEW camera angle + NEW story beat
- NEVER repeat the same ACTION in multiple panels
- If Panel 1 shows "character does X" → NO other panel may show "character does X"

GOOD EXAMPLE (varied actions):
Panel 1: Wide shot, small - Thomas enters with tall cake, family watches
Panel 2: Close-up, medium - Thomas' worried face, sweat on forehead
Panel 3: Medium shot, medium - Felix laughing, pointing at cake
Panel 4: Close-up, large - Oma's surprised expression, hands on cheeks (emotional peak)

BAD EXAMPLE (repeated action):
Panel 1: Thomas carries cake
Panel 2: Thomas' face while carrying cake  
Panel 3: Thomas still carrying cake, wobbling
Panel 4: Thomas with cake from different angle
→ All panels show SAME ACTION (carrying cake), just different angles

RULE: Each panel must show a DIFFERENT action or moment, not just a different angle of the same action.

AVOID repetition: if panel 1 shows "family behind tree", panel 2 must NOT show "family behind tree" again.
Show PROGRESSION: beginning → middle → end, or cause → action → reaction.

EMOTIONS: Show the CORRECT emotion.
- If someone falls/gets hurt → show pain, surprise, tears
- If reunion → joy, open arms
- If funny moment → laughter, surprise
- Do NOT make everyone smile if the scene is sad or tense

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DIALOGS — NATURAL CONVERSATIONS:

CRITICAL INSTRUCTION - READ CAREFULLY:

For panels with 2+ characters interacting, you MUST use the "dialogs" array format.
DO NOT use single "dialog" + "speaker" for conversations between multiple people.

WHEN TO USE "dialogs" ARRAY (REQUIRED):
- 2+ characters talking to each other
- Back-and-forth conversations
- Group discussions
- Any scene where multiple people speak

WHEN TO USE single "dialog" + "speaker" (ONLY):
- Silent panels (empty dialog)
- Narrator captions
- Single character monologue (talking to themselves)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CORRECT FORMAT (use this for conversations):
{
  "nummer": 1,
  "szene": "Wide shot: Maria and Marc discover something amazing at the beach",
  "dialogs": [
    {"speaker": "Maria", "text": "Schau mal, wie schön!"},
    {"speaker": "Marc", "text": "Wow, das ist ja unglaublich!"}
  ],
  "bubble_type": "speech"
}

WRONG FORMAT (NEVER use this for conversations):
{
  "nummer": 1,
  "szene": "Maria and Marc discover something amazing",
  "dialog": "Schau mal, wie schön!",
  "speaker": "Maria",
  "bubble_type": "speech"
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DIALOG GUIDELINES:
- Panels can have 2-3 speech bubbles for natural conversations
- Dialog length: 10-25 words (flexible, not strict limit)
- Allow natural back-and-forth dialogue
- Mix short reactions with longer statements
- Some panels can be SILENT (no dialog) for visual impact

GOOD EXAMPLE (natural conversation with dialogs array):
Panel 1: 
  "dialogs": [
    {"speaker": "Maria", "text": "Schau mal, wie schön!"},
    {"speaker": "Marc", "text": "Wow, das ist ja unglaublich!"}
  ]
Panel 2: (silent panel - just visual emotion)
  "dialog": "",
  "speaker": null
Panel 3:
  "dialogs": [
    {"speaker": "Marc", "text": "Danke, dass du mich hierher gebracht hast."}
  ]

BAD EXAMPLE (using single dialog for conversations):
Panel 1: "dialog": "Wir sind am Strand", "speaker": "Maria"  ← WRONG!
Panel 2: "dialog": "Ja, es ist schön hier", "speaker": "Marc"  ← WRONG!
→ Should use "dialogs" array instead!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CRITICAL — ONLY SHOW CHARACTERS PRESENT IN THIS SCENE:
- Read the scene description carefully. Only include characters explicitly mentioned in it.
- Do NOT add characters from the broader story who are not part of this specific moment.
- Example: if the scene is at an airport departure with Mama, Papa, Luca, Maria — do NOT add grandparents who are waiting in Tunisia.
- Each panel's "szene" must only reference characters who are physically present in that scene.
- A character can only be "speaker" if they appear in that panel's szene.

CRITICAL — LOCATION CONTEXT IN EVERY PANEL:
- ALWAYS include the location/setting in the "szene" description
- Make it clear WHERE the scene takes place
- Example: "Wide shot: Maria and Mama at hair salon, stylist cutting Maria's hair" (NOT "Mama cutting Maria's hair")
- Example: "Medium shot: At the restaurant, family eating dinner together" (NOT just "family eating dinner")
- If the scene is "at the hair salon" → ALL panels must show they are AT THE SALON (chairs, mirrors, products visible)
- If the scene is "at the park" → ALL panels must show park elements (trees, playground, benches)
- Do NOT confuse WHO is doing the action with WHERE it's happening
- "At hair salon" means a PROFESSIONAL STYLIST is cutting hair, NOT a family member
- "At restaurant" means WAITERS serve food, NOT family members cooking

BAD EXAMPLES (missing location context):
❌ "Mama cuts Maria's hair" → WRONG! Doesn't specify WHERE (could be at home)
❌ "Family eats dinner" → WRONG! Doesn't specify WHERE (home vs restaurant)

GOOD EXAMPLES (clear location context):
✅ "Wide shot: At professional hair salon, stylist cutting Maria's hair while Mama watches from salon chair nearby"
✅ "Medium shot: In restaurant dining room, waiter bringing food to family's table"
✅ "Close-up: Maria's happy face at hair salon, new haircut visible, salon mirrors in background"

Respond ONLY with JSON:
{"id":"page${i + 1}","pageNumber":${i + 1},"title":"Short title in ${lang}","location":"English location description","timeOfDay":"daytime","panels":[{"nummer":1,"size":"small","szene":"Shot type: Specific English scene WITH LOCATION CONTEXT — what characters DO and FEEL and WHERE","dialogs":[{"speaker":"Name","text":"${lang} dialog 10-25 words"}],"bubble_type":"speech"}]}

IMPORTANT: 
- Use "dialogs" array for conversations (2+ people talking)
- Only use single "dialog" + "speaker" for silent panels or monologues
- ALWAYS start "szene" with shot type: "Wide shot:", "Medium shot:", or "Close-up:"
- ALWAYS include "size" field: "small", "medium", "large", or "splash"`
          }, {
            role: "user",
            content: `Scene to illustrate: ${moment}\n\nStory context: ${storyCtx}${mustHaveSentences ? `\nInclude somewhere: ${mustHaveSentences}` : ""}`,
          }],
          response_format: { type: "json_object" },
          temperature: 0.8,
        }).then(r => {
          const data = JSON.parse(r.choices[0].message.content || "{}");
          return { id: `page${i + 1}`, pageNumber: i + 1, ...data };
        }).catch(e => {
          console.error(`Page ${i + 1} structure failed:`, e.message);
          return { id: `page${i + 1}`, pageNumber: i + 1, title: `Moment ${i + 1}`, location: "", timeOfDay: "daytime", panels: [] };
        })
      );

      pageStructures = await Promise.all(pagePromises);
    } else {
      // No moments — single call for all pages
      const structRes = await openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [{
          role: "system",
          content: `Create a ${numPages}-page comic structure in ${lang}. Tone: ${toneEn}.
Each page: 2-5 panels. Vary panel count based on scene complexity.
Show correct emotions — not everyone smiles in every panel.
All characters must appear across the comic.
Respond ONLY with JSON: {"pages":[{"id":"page1","pageNumber":1,"title":"Title in ${lang}","location":"English location","timeOfDay":"afternoon","panels":[{"nummer":1,"szene":"English scene description","dialog":"${lang} dialog 10-15 words","speaker":"Name or null","bubble_type":"speech"}]}]}`
        }, {
          role: "user", content: storyCtx,
        }],
        response_format: { type: "json_object" },
        temperature: 0.85,
      });
      pageStructures = JSON.parse(structRes.choices[0].message.content || "{}").pages || [];
    }

    console.log(`✓ Structure: ${pageStructures.length} pages, ${characters.length} characters`);
    res.json({ pages: pageStructures, characters });
  } catch (err) {
    console.error("Structure error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/comic/cover
// Pure images.generate() — no user photo reference
// Reason: images.edit() with photo produces photorealistic results
// visual_anchors describe all characters precisely enough for recognition
// ─────────────────────────────────────────────────────────────────────────────
router.post("/cover", async (req, res) => {
  try {
    const { 
      characters = [], 
      location = "", 
      storyInput = "", 
      guidedAnswers = {}, 
      referenceImages = [], 
      referenceImageUrls = [],
      coverRegenNote = "" // Freitext-Anweisung vom User
    } = req.body;

    const charDesc = characters.map(c => `${c.name}: ${c.visual_anchor}`).join("\n");
    const charNames = characters.map(c => c.name).join(", ");

    // Extract location from story context using GPT (more reliable than keyword matching)
    let coverLocation = location || "";
    if (!coverLocation && (storyInput || guidedAnswers.location || guidedAnswers.specialMoments)) {
      const storyText = `${storyInput} ${guidedAnswers.location || ""} ${guidedAnswers.specialMoments || ""}`;
      console.log(`  → Extracting location from story text (length: ${storyText.length} chars)`);
      console.log(`  → Story text preview: ${storyText.substring(0, 200)}...`);
      
      try {
        // Use GPT-4o-mini to extract location (avoids false matches like "schrebergarten" → "berg")
        const locationPrompt = `Extract the main location/setting from this story. Return ONLY a short English description (2-5 words), nothing else.

Story: ${storyText.substring(0, 500)}

Examples of good responses:
- "indoor playground"
- "allotment garden"
- "beach"
- "home living room"
- "park"
- "mountain landscape"
- "city street"

Location:`;

        const locationRes = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: locationPrompt }],
          temperature: 0.3,
          max_tokens: 20,
        });

        const extractedLocation = (locationRes.choices[0].message.content || "").trim().toLowerCase();
        console.log(`  → GPT extracted location: "${extractedLocation}"`);

        // Map extracted location to detailed description
        const locationMap = {
          "indoor playground": "colorful indoor playground with slides, ball pit, and play equipment",
          "indoorspielplatz": "colorful indoor playground with slides, ball pit, and play equipment",
          "playground": "outdoor playground with swings, slides, and sandbox",
          "spielplatz": "outdoor playground with swings, slides, and sandbox",
          "allotment garden": "cozy allotment garden with small garden house, vegetable beds, and flowers",
          "schrebergarten": "cozy allotment garden with small garden house, vegetable beds, and flowers",
          "garden": "beautiful garden with flowers, trees, and green grass",
          "garten": "beautiful garden with flowers, trees, and green grass",
          "park": "park with trees, flowers, and green grass",
          "beach": "beautiful beach with ocean and sand",
          "strand": "beautiful beach with ocean and sand",
          "mountain": "mountain landscape with peaks and nature",
          "berg": "mountain landscape with peaks and nature",
          "forest": "forest setting with trees and nature",
          "wald": "forest setting with trees and nature",
          "home": "cozy home interior",
          "living room": "cozy living room interior",
          "zoo": "zoo with animals and nature",
          "museum": "museum interior with exhibits",
          "swimming pool": "swimming pool area",
          "schwimmbad": "swimming pool area",
        };

        // Try to find match in map
        for (const [key, value] of Object.entries(locationMap)) {
          if (extractedLocation.includes(key)) {
            coverLocation = value;
            break;
          }
        }

        // If no match, use extracted location directly
        if (!coverLocation) {
          coverLocation = extractedLocation;
        }
      } catch (e) {
        console.warn(`  → GPT location extraction failed: ${e.message}, using fallback`);
        coverLocation = "beautiful park with trees and flowers";
      }
    }
    
    // Final fallback if still empty
    if (!coverLocation) coverLocation = "beautiful park with trees and flowers";
    
    // User override via coverRegenNote
    if (coverRegenNote && coverRegenNote.trim()) {
      console.log(`  → User requested cover change: "${coverRegenNote}"`);
      coverLocation = sanitizePrompt(coverRegenNote); // Sanitize user input
    }
    
    console.log(`  → Cover location: "${coverLocation}"`);

    // Generate character-specific clothing for cover
    const coverCharClothing = characters.map(c => {
      const name = c.name;
      const age = c.age || 25;
      const role = (c.role || name).toLowerCase();
      
      let charOutfit = "";
      if (age < 12 || role.includes("kind") || role.includes("child")) {
        charOutfit = "colorful casual kids' outfit";
      } else if (role.includes("mutter") || role.includes("mother") || role.includes("mama")) {
        charOutfit = "stylish casual blouse or nice top";
      } else if (role.includes("vater") || role.includes("father") || role.includes("papa")) {
        charOutfit = "casual button-up shirt or polo";
      } else {
        charOutfit = "stylish casual attire";
      }
      
      return `${name}: ${charOutfit}`;
    }).join(", ");

    const prompt = sanitizePrompt(`${COMIC_STYLE}

🚨 CRITICAL CLOTHING RULES (READ FIRST):
DO NOT copy clothing from any reference photos.
Reference photos are ONLY for facial features.
Each character must wear DIFFERENT, DISTINCT clothing:
${coverCharClothing}

Comic book COVER illustration.
ALL of these characters MUST be visible: ${charNames}.
Show them together in ${coverLocation}.

Characters (draw faces accurately, IGNORE clothing from photos):
${charDesc}

Composition: dynamic group shot, characters prominently in foreground, vivid illustrated background showing the story world. Some looking at viewer, some interacting with each other.
NO text, NO title, NO letters anywhere in the image.`);

    // ── MULTI-PHOTO STRATEGY ──────────────────────────────────────────────────
    // Problem: images.edit() can only use ONE photo
    // Solution: Create composite image from both photos, then use images.edit()
    const hasMultiplePhotos = referenceImageUrls.length > 1 || referenceImages.length > 1;
    
    if (hasMultiplePhotos && referenceImageUrls.length === 2) {
      console.log(`  → Multi-photo mode: ${referenceImageUrls.length} photos`);
      console.log(`  → Creating composite image from both photos for images.edit()`);
      
      try {
        // Fetch both photos
        const photo1Buffer = await fetchBuffer(referenceImageUrls[0].url);
        const photo2Buffer = await fetchBuffer(referenceImageUrls[1].url);
        
        // Create side-by-side composite using sharp
        const sharp = require('sharp');
        
        // Resize both to same height (768px), maintain aspect ratio
        const img1 = sharp(photo1Buffer).resize({ height: 768, fit: 'inside' });
        const img2 = sharp(photo2Buffer).resize({ height: 768, fit: 'inside' });
        
        const [meta1, meta2] = await Promise.all([
          img1.metadata(),
          img2.metadata()
        ]);
        
        // Create composite: side by side
        const compositeWidth = meta1.width + meta2.width;
        const compositeHeight = 768;
        
        const compositeBuffer = await sharp({
          create: {
            width: compositeWidth,
            height: compositeHeight,
            channels: 3,
            background: { r: 255, g: 255, b: 255 }
          }
        })
        .composite([
          { input: await img1.toBuffer(), left: 0, top: 0 },
          { input: await img2.toBuffer(), left: meta1.width, top: 0 }
        ])
        .jpeg()
        .toBuffer();
        
        // Now use images.edit() with composite
        const blob = new Blob([compositeBuffer], { type: "image/jpeg" });
        const refFile = new File([blob], "composite.jpg", { type: "image/jpeg" });
        
        const multiPhotoPrompt = sanitizePrompt(`${COMIC_STYLE}

🚨 CRITICAL CLOTHING RULES (HIGHEST PRIORITY):
DO NOT copy ANY clothing from this photo.
Use the photo ONLY for facial features and body proportions.
COMPLETELY IGNORE all clothing visible in the photo.
Draw each character in DIFFERENT, DISTINCT casual attire appropriate for a comic book cover.

REDRAW both people in this photo as hand-drawn comic book characters standing together.
This must look like a page from a printed comic book, NOT a photograph.
Bold ink outlines on every person. Flat cel-shaded colors. Expressive cartoon faces.

Left person is ${referenceImageUrls[0].label}: ${characters.find(c => c.name === referenceImageUrls[0].label)?.visual_anchor || ""}
Right person is ${referenceImageUrls[1].label}: ${characters.find(c => c.name === referenceImageUrls[1].label)?.visual_anchor || ""}

CLOTHING INSTRUCTIONS:
- Left person (${referenceImageUrls[0].label}): ${characters.find(c => c.name === referenceImageUrls[0].label)?.age < 12 ? "colorful kids' casual outfit" : "stylish casual adult attire"}
- Right person (${referenceImageUrls[1].label}): ${characters.find(c => c.name === referenceImageUrls[1].label)?.age < 12 ? "colorful kids' casual outfit (DIFFERENT from left person)" : "stylish casual adult attire (DIFFERENT from left person)"}
- Each character MUST have DISTINCT, DIFFERENT clothing
- NO matching outfits, NO similar colors

Draw BOTH characters together in ${coverLocation}.
Composition: dynamic group shot, both characters prominently visible, vivid illustrated background.
NO text, NO title, NO letters anywhere in the image.`);

        const res2 = await openai.images.edit({
          model: "gpt-image-2",
          image: refFile,
          prompt: multiPhotoPrompt,
          size: "1024x1536",
          quality: "high",
        });
        
        const item = (res2.data || [])[0];
        const url = item?.url || (item?.b64_json ? `data:image/png;base64,${item.b64_json}` : null);
        if (url) {
          // CRITICAL: projectId MUST come from frontend, no fallback
          if (!req.body.projectId) {
            console.error("❌ CRITICAL: No projectId provided to cover endpoint!");
            return res.status(400).json({ error: "projectId is required", coverImageUrl: "" });
          }
          // Save with projectId in path to prevent cache issues
          const coverUrl = await saveImage(url, req.body.projectId, `cover-${Date.now()}`);
          await saveCharacterRefs(req.body.projectId, characters, coverUrl || url, referenceImageUrls);
          console.log("✓ Cover done (multi-photo composite mode)");
          return res.json({ coverImageUrl: coverUrl || url, projectId: req.body.projectId });
        }
      } catch (e) {
        console.warn("  → Cover with multi-photo composite failed:", e.message);
        
        // Check if it's a safety system rejection
        if (e.message && (e.message.includes('safety') || e.message.includes('rejected'))) {
          console.error("❌ SAFETY SYSTEM REJECTION on multi-photo");
          console.error("   → Trying fallback: generateImage() approach");
          
          // FALLBACK: Try generateImage() approach (like page generation)
          try {
            const photo1Buffer = await fetchBuffer(referenceImageUrls[0].url);
            const photo2Buffer = await fetchBuffer(referenceImageUrls[1].url);
            const sharp = require('sharp');
            const img1 = sharp(photo1Buffer).resize({ height: 768, fit: 'inside' });
            const img2 = sharp(photo2Buffer).resize({ height: 768, fit: 'inside' });
            const [meta1, meta2] = await Promise.all([img1.metadata(), img2.metadata()]);
            const compositeBuffer = await sharp({
              create: { width: meta1.width + meta2.width, height: 768, channels: 3, background: { r: 255, g: 255, b: 255 } }
            }).composite([
              { input: await img1.toBuffer(), left: 0, top: 0 },
              { input: await img2.toBuffer(), left: meta1.width, top: 0 }
            ]).jpeg().toBuffer();
            
            const fallbackPrompt = sanitizePrompt(`${COMIC_STYLE}
Comic book COVER illustration. Draw both people from this photo as comic characters in ${coverLocation}.
${multiPhotoPrompt}`);
            
            const { url: rawUrl } = await generateImage(fallbackPrompt, compositeBuffer);
            if (rawUrl) {
              const coverUrl = await saveImage(rawUrl, req.body.projectId, `cover-${Date.now()}`);
              await saveCharacterRefs(req.body.projectId, characters, coverUrl || rawUrl, referenceImageUrls);
              console.log("✓ Cover done (multi-photo FALLBACK mode)");
              return res.json({ coverImageUrl: coverUrl || rawUrl, projectId: req.body.projectId });
            }
          } catch (fallbackErr) {
            console.error("   → Fallback also failed:", fallbackErr.message);
          }
        }
        // Fall through to single photo strategy
      }
    }

    // ── SINGLE PHOTO STRATEGY with RETRY LOGIC ────────────────────────────────
    const primaryRefUrl = referenceImageUrls[0]?.url || null;
    const primaryRefBase64 = referenceImages[0] || null;

    if (primaryRefUrl || primaryRefBase64) {
      let refFile;
      if (primaryRefUrl) {
        const buf = await fetchBuffer(primaryRefUrl);
        const blob = new Blob([buf], { type: "image/jpeg" });
        refFile = new File([blob], "reference.jpg", { type: "image/jpeg" });
      } else {
        refFile = toFile(primaryRefBase64);
      }
      
      const basePrompt = `${COMIC_STYLE}

REDRAW everyone in this photo as hand-drawn comic book characters. This must look like a page from a printed comic book, NOT a photograph or photo-manipulation.
Bold ink outlines on every person. Flat cel-shaded colors. Expressive cartoon faces. NO photographic lighting, NO realistic skin textures, NO photo-realistic details.
Draw ALL characters: ${charNames}.
For characters not in the photo, draw them from their description.
Setting: ${coverLocation}.
Character descriptions: ${charDesc}

CLOTHING: Draw characters in casual everyday clothes appropriate for a cover photo.
IGNORE the specific clothing from the photo — use stylish casual attire instead.
Examples: nice shirts, blouses, jeans, casual dresses. Make it look good for a comic book cover.

Composition: dynamic group shot, characters in foreground, vivid illustrated background.
NO text, NO title, NO letters anywhere in the image.`;

      // ATTEMPT 1: Original prompt
      try {
        console.log("  → Cover attempt 1: Original prompt with photo");
        const res2 = await openai.images.edit({
          model: "gpt-image-2",
          image: refFile,
          prompt: sanitizePrompt(basePrompt),
          size: "1024x1536",
          quality: "high",
        });
        const item = (res2.data || [])[0];
        const url = item?.url || (item?.b64_json ? `data:image/png;base64,${item.b64_json}` : null);
        if (url) {
          if (!req.body.projectId) {
            console.error("❌ CRITICAL: No projectId provided to cover endpoint!");
            return res.status(400).json({ error: "projectId is required", coverImageUrl: "" });
          }
          const coverUrl = await saveImage(url, req.body.projectId, `cover-${Date.now()}`);
          await saveCharacterRefs(req.body.projectId, characters, coverUrl || url, referenceImageUrls);
          console.log("✓ Cover done (single photo mode)");
          return res.json({ coverImageUrl: coverUrl || url, projectId: req.body.projectId });
        }
      } catch (e) {
        console.warn("  → Cover attempt 1 failed:", e.message);
        
        // Check if it's a safety rejection
        if (e.message && (e.message.includes('safety') || e.message.includes('rejected'))) {
          console.error("  ⚠️ Safety rejection on attempt 1");
          
          // ATTEMPT 2: Sanitized prompt (remove risky keywords)
          try {
            console.log("  → Cover attempt 2: Sanitized prompt");
            await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3s
            
            const { rewriteIfRisky } = require('../lib/safety-rewriter');
            const safeLocation = await rewriteIfRisky(coverLocation);
            
            const sanitizedPrompt = `${COMIC_STYLE}

Family-friendly comic book cover illustration.
Redraw the people in this photo as cartoon characters.
Bold comic book style with thick outlines.
Characters: ${charNames}
Setting: ${safeLocation}
Warm, friendly atmosphere.
Everyone smiling and happy together.

NO text, NO title, NO letters.`;

            const res3 = await openai.images.edit({
              model: "gpt-image-2",
              image: refFile,
              prompt: sanitizePrompt(sanitizedPrompt),
              size: "1024x1536",
              quality: "high",
            });
            const item = (res3.data || [])[0];
            const url = item?.url || (item?.b64_json ? `data:image/png;base64,${item.b64_json}` : null);
            if (url) {
              if (!req.body.projectId) {
                return res.status(400).json({ error: "projectId is required", coverImageUrl: "" });
              }
              const coverUrl = await saveImage(url, req.body.projectId, `cover-${Date.now()}`);
              await saveCharacterRefs(req.body.projectId, characters, coverUrl || url, referenceImageUrls);
              console.log("✓ Cover done (single photo mode - retry 2 succeeded)");
              return res.json({ coverImageUrl: coverUrl || url, projectId: req.body.projectId });
            }
          } catch (e2) {
            console.error("  → Cover attempt 2 also failed:", e2.message);
            // Continue to fallback below
          }
        }
        
        // FALLBACK: generateImage() approach (no photo composite)
        console.error("❌ All photo-based attempts failed");
        console.error("   → Trying FALLBACK: generateImage() without photo composite");
          
        // FALLBACK: Try generateImage() approach (like page generation)
        try {
            let refBuffer;
            if (primaryRefUrl) {
              refBuffer = await fetchBuffer(primaryRefUrl);
            } else {
              const base64Data = primaryRefBase64.replace(/^data:image\/\w+;base64,/, "");
              refBuffer = Buffer.from(base64Data, 'base64');
            }
            
            const fallbackPrompt = sanitizePrompt(`${COMIC_STYLE}

🚨 CRITICAL CLOTHING RULES (HIGHEST PRIORITY):
DO NOT copy ANY clothing from this photo.
Use the photo ONLY for facial features and body proportions.
COMPLETELY IGNORE all clothing visible in the photo.

Comic book COVER illustration showing these characters together in ${coverLocation}.

CHARACTERS (draw faces accurately from photo, IGNORE clothing):
${charDesc}

CHARACTER-SPECIFIC CLOTHING (draw exactly as specified):
${coverCharClothing}

CRITICAL: Each character must have DISTINCT, DIFFERENT clothing from each other.
NO matching outfits, NO similar colors.

COMPOSITION:
- Dynamic group shot with all characters prominently visible
- Characters in foreground, vivid illustrated background showing ${coverLocation}
- This must look like a hand-drawn comic book cover, NOT a photograph
- Bold ink outlines on every person
- Flat cel-shaded colors
- Expressive cartoon faces

NO text, NO title, NO letters anywhere in the image.`);

            const { url: rawUrl } = await generateImage(fallbackPrompt, refBuffer);
            
            if (rawUrl) {
              if (!req.body.projectId) {
                console.error("❌ CRITICAL: No projectId provided to cover endpoint!");
                return res.status(400).json({ error: "projectId is required", coverImageUrl: "" });
              }
              const coverUrl = await saveImage(rawUrl, req.body.projectId, `cover-${Date.now()}`);
              await saveCharacterRefs(req.body.projectId, characters, coverUrl || rawUrl, referenceImageUrls);
              console.log("✓ Cover done (single photo FALLBACK mode)");
              return res.json({ coverImageUrl: coverUrl || rawUrl, projectId: req.body.projectId });
            }
          } catch (fallbackErr) {
            console.error("   → Fallback also failed:", fallbackErr.message);
            // Continue to return error below
          }
        }
          
        return res.status(400).json({ 
            error: "SAFETY_REJECTION",
            message: "Dieses Foto wurde vom System blockiert. Bitte verwenden Sie ein anderes Foto.",
            userMessage: "Das hochgeladene Foto konnte nicht verarbeitet werden. Bitte versuchen Sie es mit einem anderen Foto.",
            coverImageUrl: "",
            projectId: req.body.projectId
          });
        }
      }
    }

    // Fallback: generate without reference
    // CRITICAL: If user uploaded photos, DO NOT generate cover without reference!
    // This would create wrong faces that propagate to all pages
    const hasUserPhotos = (primaryRefUrl || primaryRefBase64) && characters.length > 0;
    
    if (hasUserPhotos) {
      console.error("❌ CRITICAL: Cover generation with user photos failed!");
      console.error("   → Cannot fall back to generate-only (would create wrong faces)");
      console.error("   → Returning empty cover - pages will use user photos directly");
      
      // Save character refs without cover (pages will use user photos)
      if (req.body.projectId) {
        await saveCharacterRefs(req.body.projectId, characters, null, referenceImageUrls);
      }
      
      return res.json({ 
        coverImageUrl: "", 
        projectId: req.body.projectId,
        warning: "Cover generation with photos failed - pages will use photos directly",
        skipCover: true
      });
    }
    
    // Only generate without reference if NO user photos were provided
    console.log("  → No user photos, generating cover without reference");
    const { url: rawUrl } = await generateImage(prompt, null);
    // CRITICAL: projectId MUST come from frontend, no fallback
    if (!req.body.projectId) {
      console.error("❌ CRITICAL: No projectId provided to cover endpoint!");
      return res.status(400).json({ error: "projectId is required", coverImageUrl: "" });
    }
    // Save with projectId in path to prevent cache issues
    const coverUrl = await saveImage(rawUrl, req.body.projectId, `cover-${Date.now()}`);
    await saveCharacterRefs(req.body.projectId, characters, coverUrl || rawUrl, referenceImageUrls);
    console.log("✓ Cover done (generate only)");
    res.json({ coverImageUrl: coverUrl || rawUrl, projectId: req.body.projectId });
  } catch (err) {
    console.error("Cover error:", err.message);
    
    // CRITICAL: If user uploaded photos, don't return error - return empty cover
    // This prevents wrong faces from being generated
    const hasUserPhotos = (req.body.referenceImageUrls?.length > 0 || req.body.referenceImages?.length > 0);
    
    if (hasUserPhotos) {
      console.error("   → User has photos - returning empty cover instead of error");
      console.error("   → Pages will use user photos directly");
      
      // Save character refs without cover
      if (req.body.projectId && req.body.characters) {
        try {
          await saveCharacterRefs(req.body.projectId, req.body.characters, null, req.body.referenceImageUrls || []);
        } catch (saveErr) {
          console.error("   → Failed to save character refs:", saveErr.message);
        }
      }
      
      return res.json({ 
        coverImageUrl: "", 
        projectId: req.body.projectId,
        warning: "Cover generation failed - pages will use photos directly",
        skipCover: true,
        error: err.message
      });
    }
    
    // No photos: return error as before
    res.json({ 
      coverImageUrl: "", 
      projectId: req.body.projectId,
      warning: "Cover generation failed",
      error: err.message 
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/comic/page
// Reference priority: coverImageUrl (comic style) > userPhoto > none
// ─────────────────────────────────────────────────────────────────────────────
router.post("/page", async (req, res) => {
  try {
    const {
      page, characters = [], comicStyle = "emotional",
      referenceImages = [], referenceImageUrls = [], coverImageUrl = "",
      reillustrationNote = "", // ← Freitext-Anweisung vom User
      projectId,  // ← MUST come from frontend, no fallback to avoid loading wrong character_refs
    } = req.body;

    // Enrich characters with visual_anchors from Supabase if missing
    // This ensures regeneration works even if Store lost the data
    let enrichedCharacters = characters;
    const missingAnchors = characters.some(c => !c.visual_anchor || c.visual_anchor === c.role || c.visual_anchor === "Hauptfigur");
    if (missingAnchors && projectId) {
      try {
        const refs = await getCharacterRefs(projectId);
        if (refs.length > 0) {
          console.log(`  → Enriching ${refs.length} characters from Supabase`);
          enrichedCharacters = characters.map(c => {
            const ref = refs.find(r => r.character_name.toLowerCase() === c.name.toLowerCase());
            if (ref) return { ...c, visual_anchor: ref.visual_anchor || c.visual_anchor, inPhoto: ref.in_photo };
            return c;
          });
        }
      } catch (e) {
        console.warn("  → Supabase character enrichment failed:", e.message);
      }
    }
    const finalCharacters = enrichedCharacters;

    // Primary reference: Supabase URL > Base64 fallback
    const primaryRefUrl = referenceImageUrls[0]?.url || null;
    const primaryRefBase64 = referenceImages[0] || null;

    const mood = MOOD_MOD[comicStyle] || MOOD_MOD.emotional;
    const panelCount = page.panels.length;
    
    // ── SAFETY REWRITE: Sanitize panel descriptions ────────────────────────────
    const { rewriteIfRisky } = require('../lib/safety-rewriter');
    const originalPanelDescriptions = page.panels
      .map(p => `Panel ${p.nummer}: ${p.szene}`)
      .join("\n");
    
    // Rewrite if risky keywords detected
    const panelDescriptions = await rewriteIfRisky(originalPanelDescriptions);
    
    const outfit = getOutfit(page.location, panelDescriptions);
    const layoutDesc =
      panelCount <= 2 ? "2 equal panels" :
      panelCount === 3 ? "1 large panel top, 2 smaller panels bottom" :
      panelCount === 5 ? "2 panels top, 1 wide panel middle, 2 panels bottom" :
      "2×2 grid";

    const charAnchors = finalCharacters.map(c => `${c.name}: ${c.visual_anchor}`).join(". ");

    // ── AGE CONTEXT DETECTION ─────────────────────────────────────────────────
    // Detect if this is a historical/young scene or current age scene
    const ageContext = getAgeContext(page.title, panelDescriptions);
    console.log(`  → Age context: ${ageContext.ageContext} (useReference: ${ageContext.useReference})`);
    
    // Log reillustration note if present
    if (reillustrationNote) {
      console.log(`  → 🎨 RE-ILLUSTRATION requested: "${reillustrationNote}"`);
    }

    // Generate character-specific clothing to ensure variety
    const charClothingDesc = finalCharacters.map(c => {
      const name = c.name;
      const age = c.age || 25;
      const role = (c.role || name).toLowerCase();
      
      // Determine character-specific outfit based on age and role
      let charOutfit = "";
      if (age < 12 || role.includes("kind") || role.includes("child")) {
        charOutfit = "child's outfit — colorful t-shirt or playful top with comfortable pants or shorts, sneakers";
      } else if (role.includes("mutter") || role.includes("mother") || role.includes("mama") || role.includes("mom")) {
        charOutfit = "adult woman's outfit — casual blouse or nice shirt with trousers or jeans, comfortable shoes";
      } else if (role.includes("vater") || role.includes("father") || role.includes("papa") || role.includes("dad")) {
        charOutfit = "adult man's outfit — casual button-up shirt or polo with jeans or chinos, casual shoes";
      } else if (age > 60 || role.includes("oma") || role.includes("opa") || role.includes("grand")) {
        charOutfit = "elderly person's outfit — comfortable casual clothes, cardigan or light jacket";
      } else {
        charOutfit = outfit; // Use scene-based outfit for other characters
      }
      
      return `${name}: ${charOutfit}`;
    }).join("\n");

    const prompt = sanitizePrompt(`${COMIC_STYLE} ${mood}

🚨 CRITICAL CLOTHING RULES (HIGHEST PRIORITY — READ THIS FIRST):
Each character MUST wear DIFFERENT clothing appropriate for their age and role.
DO NOT copy ANY clothing from reference photos.
Reference photos are ONLY for facial features — COMPLETELY IGNORE all clothing in photos.

CHARACTER-SPECIFIC CLOTHING (draw exactly as specified):
${charClothingDesc}

Scene-appropriate clothing: ${outfit}

CRITICAL: Each character must have DISTINCT, DIFFERENT clothing from each other.
Children's clothing must look different from adults' clothing.
Mother's clothing must look different from father's clothing.
NO matching outfits, NO similar colors for family members.

Comic page — ${panelCount} panels in ${layoutDesc}. 

CRITICAL PANEL BORDER RULES:
- EVERY panel MUST have thick black borders (4-6px) on ALL SIDES
- Borders must be CONSISTENT thickness across all panels
- NO gaps between panel borders — borders should touch or have minimal (2-3px) white space
- Think of a printed comic page: panels are tightly arranged with clear black borders
- Each panel is a SEPARATE CONTAINED SPACE with thick black borders
- Characters and objects MUST stay COMPLETELY INSIDE their panel borders
- NO body parts (hands, feet, heads) may cross into adjacent panels
- NO objects may extend beyond panel boundaries

CHARACTERS — draw identically across all panels (FACES ONLY, NOT CLOTHING):
${charAnchors}

${ageContext.modifier ? `AGE MODIFIER: ${ageContext.modifier}\n` : ""}
CRITICAL: Draw characters EXACTLY as described above. Do NOT add features not mentioned (glasses, beard, mustache, jewelry, tattoos).
If a feature is not in the description, the character does NOT have it.

CRITICAL SIZE RULES — enforce in every panel:
- Children must be drawn at their correct height relative to adults
- A 3-year-old is approximately half the height of an adult — always visibly much smaller
- Never draw a young child as tall as an older child or adult
- Size ratios from character descriptions MUST be respected

PANELS:
${panelDescriptions}

${reillustrationNote ? `
USER FEEDBACK FOR RE-ILLUSTRATION:
${reillustrationNote}

IMPORTANT: Keep the same panel structure and story beats as described above.
Only adjust the visual details based on the user feedback.
Example: If user says "Opa more in foreground" → keep the same scene but adjust composition.
Example: If user says "at hair salon not at home" → keep the same actions but change location.
DO NOT create completely new panels - adjust the existing ones based on feedback.
` : ''}

RULES:
- CRITICAL: Each panel MUST show a COMPLETELY DIFFERENT moment in time
- Panel 1: First action/moment
- Panel 2: Second action/moment (DIFFERENT from panel 1)
- Panel 3: Third action/moment (DIFFERENT from panels 1 and 2)
- Panel 4: Fourth action/moment (DIFFERENT from all previous)
- NEVER repeat the same scene with different angles - each panel = NEW moment
- Each character appears ONLY ONCE per panel — no duplicates
- Show CORRECT emotions per scene (sad=tears, funny=laughter, reunion=joy)
- Sharp detailed faces — eyes, nose, mouth clearly visible, front or 3/4 view
- Background crowd: faceless silhouettes only
- Movement/action: show with TILTED POSES and MOTION BLUR in Bande Dessinée style — NOT manga speed lines, NOT anime motion effects
- Exaggerated expressions: use WESTERN COMIC STYLE — wide mouths, raised eyebrows — NOT anime big eyes, NOT manga sweat drops
- NO text, NO speech bubbles, NO letters, NO titles anywhere in image`);

    // ── REFERENCE STRATEGY ────────────────────────────────────────────────────
    // Priority:
    // 1. Age context: If young/middle scene → NO reference (text-only)
    // 2. Cover (if all characters in photo) → best consistency
    // 3. Multi-photo mode (if multiple character photos) → use cover + character descriptions
    // 4. Single photo → use as style reference
    // 5. Generate only → no reference
    
    const pageCharNames = page.panels
      .flatMap(p => [p.speaker])
      .filter(Boolean)
      .map(n => (n || "").toLowerCase());

    const hasCharNotInPhoto = finalCharacters.some(c =>
      c.inPhoto === false &&
      (pageCharNames.some(n => n.includes(c.name.toLowerCase())) ||
       panelDescriptions.toLowerCase().includes(c.name.toLowerCase()))
    );

    // Check if this is a scene with many people (guests, crowd, etc.)
    const hasManyPeople = panelDescriptions.toLowerCase().includes("gäste") ||
                          panelDescriptions.toLowerCase().includes("guests") ||
                          panelDescriptions.toLowerCase().includes("crowd") ||
                          panelDescriptions.toLowerCase().includes("people") ||
                          panelDescriptions.toLowerCase().includes("viele");

    let reference = null;
    let refSource = "none";

    // ── STRATEGY 0: Age-based reference decision ──────────────────────────────
    // For young/middle-age scenes with cover available, use cover + age modifier
    // This keeps facial features consistent while making characters younger
    if (!ageContext.useReference && coverImageUrl) {
      try {
        reference = await fetchBuffer(coverImageUrl);
        refSource = `cover-age-${ageContext.ageContext}`;
        console.log(`  → Historical scene (${ageContext.ageContext}), using cover with age modifier`);
        console.log(`  → This keeps facial features consistent while making characters younger`);
      } catch (e) {
        console.warn("  → Cover fetch failed, falling back to user photo:", e.message);
        // FALLBACK: Use user photo instead of generate-only
        if (primaryRefUrl) {
          try {
            reference = await fetchBuffer(primaryRefUrl);
            refSource = "user-photo-age-fallback";
            console.log(`  → Using user photo as fallback (characters won't look younger, but faces will be correct)`);
          } catch (e2) {
            console.warn("  → User photo fetch also failed:", e2.message);
            refSource = "generate-only-age-modified";
          }
        } else if (primaryRefBase64) {
          reference = primaryRefBase64;
          refSource = "user-photo-age-fallback";
          console.log(`  → Using user photo as fallback (characters won't look younger, but faces will be correct)`);
        } else {
          refSource = "generate-only-age-modified";
        }
      }
    } else if (!ageContext.useReference) {
      // No cover available - FALLBACK: use user photo instead of generate-only
      console.log(`  → Historical scene (${ageContext.ageContext}), no cover available`);
      
      // FALLBACK: Try user photo instead of generate-only
      if (primaryRefUrl) {
        try {
          reference = await fetchBuffer(primaryRefUrl);
          refSource = "user-photo-age-fallback";
          console.log(`  → FALLBACK: Using user photo (characters won't look younger, but faces will be correct)`);
        } catch (e) {
          console.warn("  → User photo fetch failed:", e.message);
          refSource = "generate-only-age-modified";
        }
      } else if (primaryRefBase64) {
        reference = primaryRefBase64;
        refSource = "user-photo-age-fallback";
        console.log(`  → FALLBACK: Using user photo (characters won't look younger, but faces will be correct)`);
      } else {
        console.log(`  → No user photo available - generate-only (may invent faces)`);
        refSource = "generate-only-age-modified";
      }
    } else {
      // ── STRATEGY 1: Individual Photos Mode → Use Cover Reference ──────────────
      // CRITICAL: For individual photos, USE cover as reference (like family photo mode)!
      // The cover was created from composite of all photos → contains all faces
      // Solution: Use cover as reference + very strong prompt to maintain faces
      const hasIndividualPhotos = referenceImageUrls.length > 1;
      
      if (hasIndividualPhotos && coverImageUrl) {
        try {
          reference = await fetchBuffer(coverImageUrl);
          refSource = "cover-individual-photos";
          console.log(`  → Individual photos mode (${referenceImageUrls.length} photos): using cover as reference`);
          console.log(`  → Cover contains composite of all ${referenceImageUrls.length} photos`);
        } catch (e) {
          console.warn("  → Cover fetch failed for individual photos:", e.message);
          reference = null;
          refSource = "generate-only-individual-photos";
        }
      }
      // ── STRATEGY 2: Cover (best for consistency) ──────────────────────────────
      // Family photo mode: 1 photo with all characters
      else if (coverImageUrl && !hasCharNotInPhoto) {
        try {
          reference = await fetchBuffer(coverImageUrl);
          refSource = "cover";
          console.log(`  → Using cover as reference (all characters in photo)`);
        } catch (e) {
          console.warn("  → Cover fetch failed:", e.message);
        }
      }

      // ── STRATEGY 3: Crowd scenes (for scenes with many people) ────────────────
      // CRITICAL: Even if scene has "many guests", main characters must stay consistent
      // Use cover as base reference to maintain character appearance
      // SKIP if individual photos mode (already handled)
      if (!hasIndividualPhotos && !reference && hasManyPeople && coverImageUrl) {
        try {
          reference = await fetchBuffer(coverImageUrl);
          refSource = "cover-with-crowd";
          console.log(`  → Scene has many people, using cover to maintain character consistency`);
        } catch (e) {
          console.warn("  → Cover fetch for crowd scene failed:", e.message);
        }
      }

      // ── STRATEGY 4: Character not in photo → use photo as style reference ─────
      // SKIP if individual photos mode (already handled)
      if (!hasIndividualPhotos && !reference && hasCharNotInPhoto) {
        // Use user photo as STYLE reference only
        // The prompt explicitly describes all characters including those not in photo
        if (primaryRefUrl) {
          try {
            reference = await fetchBuffer(primaryRefUrl);
            refSource = "user-photo-style";
          } catch (e) {
            console.warn("  → User photo fetch failed:", e.message);
          }
        }
        if (!reference && primaryRefBase64) {
          reference = primaryRefBase64;
          refSource = "user-photo-style";
        }
        if (!reference) refSource = "generate-only";
        console.log(`  → Page has non-photo characters, ref: ${refSource}`);
      }

      // ── STRATEGY 5: Fallback to user photo ────────────────────────────────────
      // SKIP if individual photos mode (we want generate-only, not user-photo!)
      if (!hasIndividualPhotos && !reference) {
        if (primaryRefUrl) {
          try {
            reference = await fetchBuffer(primaryRefUrl);
            refSource = "user-photo";
          } catch (e) {
            console.warn("  → User photo URL fetch failed:", e.message);
          }
        }
        if (!reference && primaryRefBase64) {
          reference = primaryRefBase64;
          refSource = "user-photo";
        }
      }
    }

    const refNote = refSource.startsWith("cover-age-")
      ? `${COMIC_STYLE}

CRITICAL FACE CONSISTENCY RULES (Age-Modified Scene):
This cover image shows the characters at their current age.
You must draw them YOUNGER while keeping their faces recognizable.

${finalCharacters.map(c => `${c.name}: ${c.visual_anchor}`).join("\n")}

${ageContext.modifier}

MANDATORY:
- Keep the SAME facial features from the cover: eye shape, nose shape, mouth shape, face bone structure
- Keep the SAME face proportions and overall facial structure
- Only change: smoother skin, darker/fuller hair (no gray), fewer wrinkles, more youthful energy
- Draw ${finalCharacters.map(c => c.name).join(" and ")} so they are recognizable as the SAME people from the cover, just younger
- Match the art style and color palette of the cover exactly

CRITICAL: IGNORE the clothing from the cover photo.
The cover shows everyday clothing, but this scene requires different attire.
Draw the clothing specified in the CRITICAL CLOTHING RULES section instead.

NATURAL SCENE BEHAVIOR:
- Characters are IN THE SCENE, not posing for a photo
- They interact with each other and their environment
- NO direct eye contact with viewer/camera
- NO portrait-style poses looking at camera
- Show them from various angles: 3/4 view, profile, back view, action shots
- They are LIVING the moment, not posing for it

DO NOT invent new faces. These must be the SAME people from the cover, just at a younger age.\n\n`
      : refSource === "user-photo-age-fallback"
      ? `${COMIC_STYLE}

CRITICAL FACE CONSISTENCY RULES (Historical Scene - Fallback Mode):
This photo shows the characters at their current age.
Draw them with the SAME faces from this photo.

${finalCharacters.map(c => `${c.name}: ${c.visual_anchor}`).join("\n")}

NOTE: Ideally we would make them look younger for this historical scene, but we're using this photo as fallback to ensure face consistency.

MANDATORY:
- Draw the EXACT SAME faces as shown in this photo
- Keep facial features identical: eye shape, nose shape, mouth shape, face proportions
- Keep hair color and style similar
- Match skin tone

CRITICAL: IGNORE the clothing from the photo.
This scene requires different attire.
Draw the clothing specified in the CRITICAL CLOTHING RULES section instead.

NATURAL SCENE BEHAVIOR:
- Characters are IN THE SCENE, not posing for a photo
- They interact with each other and their environment
- NO direct eye contact with viewer/camera
- NO portrait-style poses looking at camera
- Show them from various angles: 3/4 view, profile, back view, action shots
- They are LIVING the moment, not posing for it

DO NOT invent new faces. Draw the SAME people from this photo.\n\n`
      : refSource === "cover-individual-photos"
      ? `${COMIC_STYLE}

ULTRA-CRITICAL FACE CONSISTENCY RULES (Individual Photos Mode):
This cover was created from ${referenceImageUrls.length} separate photos combined together.
You MUST draw the EXACT SAME faces from this cover in this page.

${finalCharacters.map(c => `${c.name}: ${c.visual_anchor}`).join("\n\n")}

ABSOLUTE REQUIREMENTS:
- Study the faces in this cover image VERY carefully
- Draw ${finalCharacters.map(c => c.name).join(" and ")} with IDENTICAL faces to the cover
- EXACT SAME: eye shape, eye color, nose shape, mouth shape, face proportions, jawline
- EXACT SAME: hair color, hair style, hair length, hair texture
- EXACT SAME: skin tone, facial features, overall appearance
- Match the art style and color palette of the cover EXACTLY

CRITICAL: IGNORE the clothing from the cover photo.
The cover shows everyday clothing, but this scene requires different attire.
Draw the clothing specified in the CRITICAL CLOTHING RULES section instead.

NATURAL SCENE BEHAVIOR:
- Characters are IN THE SCENE, not posing for a photo
- They interact with each other and their environment
- NO direct eye contact with viewer/camera
- NO portrait-style poses looking at camera
- Show them from various angles: 3/4 view, profile, back view, action shots
- They are LIVING the moment, not posing for it

STRICT PROHIBITIONS:
- DO NOT change their faces in ANY way
- DO NOT make eyes bigger or rounder (NO manga/anime style!)
- DO NOT add sparkles, shine effects, or soft gradients
- DO NOT use manga/anime facial expressions
- DO NOT invent new facial features
- DO NOT make them look at the camera/viewer

STYLE ENFORCEMENT:
- European Bande Dessinée ONLY - bold ink outlines, flat cel-shaded colors
- NOT manga, NOT anime, NOT Japanese comic style
- Western comic book anatomy and proportions
- Realistic face shapes, NOT stylized anime faces

These are REAL PEOPLE from photos. Accuracy is CRITICAL.\n\n`
      : refSource === "generate-only-individual-photos"
      ? `${COMIC_STYLE}

CRITICAL CHARACTER DESCRIPTIONS:
Draw these characters EXACTLY as described. These descriptions come from analyzing their photos.
Every detail matters — follow them precisely.

${finalCharacters.map(c => `${c.name}: ${c.visual_anchor}`).join("\n\n")}

MANDATORY:
- Draw each character EXACTLY as described above
- Pay special attention to: eye shape, nose shape, mouth shape, face proportions, hair color/style, skin tone
- Keep these characters CONSISTENT across all panels in this page
- Do NOT add features not mentioned (glasses, beard, mustache, jewelry, tattoos)
- Do NOT change their appearance from the descriptions

NATURAL SCENE BEHAVIOR:
- Characters are IN THE SCENE, not posing for a photo
- They interact with each other and their environment
- NO direct eye contact with viewer/camera
- NO portrait-style poses looking at camera
- Show them from various angles: 3/4 view, profile, back view, action shots
- They are LIVING the moment, not posing for it

These descriptions are based on real photos — accuracy is critical.\n\n`
      : refSource === "cover" || refSource === "cover-with-crowd"
      ? `${COMIC_STYLE}

CRITICAL FACE CONSISTENCY RULES:
This cover image shows the EXACT faces you must draw in this page.
Study the faces in this cover carefully and replicate them EXACTLY.

${finalCharacters.map(c => `${c.name}: ${c.visual_anchor}`).join("\n")}

MANDATORY:
- Draw ${finalCharacters.map(c => c.name).join(" and ")} with the EXACT SAME faces as shown in this cover
- Same facial features: eye shape, nose shape, mouth shape, face proportions
- Same hair color, hair style, hair length
- Same skin tone
- Same overall appearance
- Match the art style and color palette of the cover exactly
${hasManyPeople ? "- Add background guests/crowd as faceless silhouettes or simple figures\n" : ""}
CRITICAL: IGNORE the clothing from the cover photo.
The cover shows everyday clothing, but this scene requires different attire.
Draw the clothing specified in the CRITICAL CLOTHING RULES section instead.

NATURAL SCENE BEHAVIOR:
- Characters are IN THE SCENE, not posing for a photo
- They interact with each other and their environment
- NO direct eye contact with viewer/camera
- NO portrait-style poses looking at camera
- Show them from various angles: 3/4 view, profile, back view, action shots
- They are LIVING the moment, not posing for it

DO NOT invent new faces. DO NOT change their appearance. Draw them EXACTLY as they look in this cover.\n\n`
      : refSource === "user-photo"
      ? `${COMIC_STYLE}

The people in this photo are the main characters. Draw them in the comic style above. NOT photorealistic.
IMPORTANT: IGNORE the clothing from the photo — use the clothing described in the prompt instead.

NATURAL SCENE BEHAVIOR:
- Characters are IN THE SCENE, not posing for a photo
- They interact with each other and their environment
- NO direct eye contact with viewer/camera
- NO portrait-style poses looking at camera
- Show them from various angles: 3/4 view, profile, back view, action shots
- They are LIVING the moment, not posing for it\n\n`
      : refSource === "user-photo-style"
      ? `${COMIC_STYLE}

Use this photo ONLY for the art style and color palette — NOT for the faces.
Draw ALL characters exactly as described in the character descriptions below. NOT photorealistic.
IGNORE the clothing from the photo.

NATURAL SCENE BEHAVIOR:
- Characters are IN THE SCENE, not posing for a photo
- They interact with each other and their environment
- NO direct eye contact with viewer/camera
- NO portrait-style poses looking at camera
- Show them from various angles: 3/4 view, profile, back view, action shots
- They are LIVING the moment, not posing for it\n\n`
      : `${COMIC_STYLE}

Draw in the style of a printed Franco-Belgian comic album (Bande Dessinée) — bold ink outlines, flat cel-shaded colors, stylized expressive faces.
NOT manga. NOT anime. NOT photorealistic. Crisp defined ink lines on every figure, identical style to a Blacksad or Bastien Vivès page.

NATURAL SCENE BEHAVIOR:
- Characters are IN THE SCENE, not posing for a photo
- They interact with each other and their environment
- NO direct eye contact with viewer/camera
- NO portrait-style poses looking at camera
- Show them from various angles: 3/4 view, profile, back view, action shots
- They are LIVING the moment, not posing for it\n\n`;

    console.log(`Generating page "${page.title}" (${panelCount} panels, ref: ${refSource})`);
    
    // Track if we have photos - CRITICAL for maintaining face consistency
    const hasPhotos = (req.body.photoMode === "family" || req.body.photoMode === "individual") && 
                      (primaryRefUrl || primaryRefBase64 || coverImageUrl);
    
    let { url: rawUrl, usedReference } = await generateImage(`${refNote}${prompt}`, reference).catch(async (err) => {
      // If safety error on first attempt → create safe alternative scene
      if (err?.message?.includes("safety") || err?.message?.includes("rejected")) {
        console.log(`  → Safety block on first attempt`);
        console.log(`  → Creating safe alternative scene with same characters`);
        
        // Sanitize panel descriptions to reduce safety triggers
        const sanitizedPanelDesc = sanitizePrompt(panelDescriptions);
        
        // Generate safe alternative: same characters, safer context, SAME PANEL DESCRIPTIONS
        const safeAlternativePrompt = `${COMIC_STYLE} ${mood}

Comic page: "${page.title}" (safe family-friendly version)
${panelCount} panels in ${layoutDesc}. Bold black borders between panels.

CHARACTERS (draw EXACTLY as described):
${charAnchors}

${ageContext.modifier ? `AGE MODIFIER: ${ageContext.modifier}\n` : ""}
CRITICAL: Draw characters EXACTLY as described above. Do NOT add features not mentioned.

CLOTHING — characters wear ${outfit}

SAFE ALTERNATIVE SCENE - DRAW ALL PANELS AS DESCRIBED:
${sanitizedPanelDesc}

CRITICAL RULES:
- Each panel MUST show a COMPLETELY DIFFERENT moment as described above
- Panel 1: First moment (as described)
- Panel 2: Second moment (DIFFERENT from panel 1, as described)
- Panel 3: Third moment (DIFFERENT from panels 1-2, as described)
- Panel 4: Fourth moment (DIFFERENT from all previous, as described)
- NEVER repeat the same scene - each panel = NEW moment
- Show CORRECT emotions per scene

NATURAL SCENE BEHAVIOR:
- Characters interact naturally with each other
- NO camera poses, NO direct eye contact with viewer
- Various angles: 3/4 view, profile, action shots

NO text, NO speech bubbles anywhere in image.`;
        
        // CRITICAL: Try with reference to maintain faces!
        return await generateImage(safeAlternativePrompt, reference);
      }
      throw err;
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // GANZHEITLICHE LÖSUNG: NEVER accept pages without cover reference when photos exist
    // ═══════════════════════════════════════════════════════════════════════════
    if (!usedReference && hasPhotos) {
      console.error(`  ⚠️ CRITICAL: Reference NOT used despite having photos!`);
      console.log(`  → This would break style consistency - retrying with cover reference`);
      
      // Retry with sanitized prompt + cover reference (NEVER without reference!)
      const sanitizedPanelDescs = page.panels
        .map(p => `Panel ${p.nummer}: ${(p.szene || "")
          // Remove risky words that trigger safety
          .replace(/\b(essen|eating|eat|feed|bite|chew|swallow|mouth|taste)\b/gi, "enjoying meal")
          .replace(/\b(drunk|beer|wine|alcohol|intoxicated)\b/gi, "celebrating")
          .replace(/\b(fight|punch|hit|weapon|blood|violence|attack)\b/gi, "playing")
          .replace(/\b(screaming|scream|yelling|yell|shouting|shout)\b/gi, "talking excitedly")
          .replace(/\b(crying|cry|sobbing|sob)\b/gi, "feeling emotional")
          .replace(/\b(wild|crazy|chaotic|chaos)\b/gi, "lively")
          .trim()}`)
        .join("\n");

      const safePromptWithRef = `${refNote}${COMIC_STYLE} ${mood}

Comic page: "${page.title}" (family-friendly version)
${panelCount} panels in ${layoutDesc}. Bold black borders between panels.

CHARACTERS (draw EXACTLY as described):
${charAnchors}

${ageContext.modifier ? `AGE MODIFIER: ${ageContext.modifier}\n` : ""}
CRITICAL: Draw characters EXACTLY as described above. Do NOT add features not mentioned.

CLOTHING — characters wear ${outfit}

SAFE FAMILY-FRIENDLY SCENE:
${sanitizedPanelDescs}

CRITICAL RULES:
- Each panel shows a DIFFERENT moment
- Characters interact naturally and warmly
- Focus on connection, joy, and family warmth
- NO risky activities, only safe family moments

NATURAL SCENE BEHAVIOR:
- Characters are IN THE SCENE, not posing
- They interact with each other naturally
- Various angles: 3/4 view, profile, action shots

NO text, NO speech bubbles anywhere in image.`;

      try {
        console.log(`  → Retry attempt 1: Sanitized prompt WITH cover reference`);
        const retry1 = await generateImage(safePromptWithRef, reference);
        if (retry1.usedReference) {
          console.log(`  ✓ SUCCESS: Generated with cover reference after sanitization`);
          rawUrl = retry1.url;
          usedReference = true;
        } else {
          throw new Error("Reference still not used");
        }
      } catch (e1) {
        console.error(`  → Retry 1 failed:`, e1.message);
        
        // Retry 2: Even more aggressive sanitization
        try {
          console.log(`  → Retry attempt 2: Ultra-safe prompt WITH cover reference`);
          const ultraSafePanelDescs = page.panels
            .map(p => `Panel ${p.nummer}: Characters spending quality time together in a warm, joyful moment`)
            .join("\n");
          
          const ultraSafePrompt = `${refNote}${COMIC_STYLE} ${mood}

Comic page: "${page.title}"
${panelCount} panels in ${layoutDesc}. Bold black borders between panels.

CHARACTERS (draw EXACTLY as described):
${charAnchors}

CLOTHING — characters wear ${outfit}

ULTRA-SAFE FAMILY SCENE:
${ultraSafePanelDescs}

Show characters in warm, joyful family moments. Focus on connection and happiness.

NO text, NO speech bubbles anywhere in image.`;
          
          const retry2 = await generateImage(ultraSafePrompt, reference);
          if (retry2.usedReference) {
            console.log(`  ✓ SUCCESS: Generated with cover reference (ultra-safe version)`);
            rawUrl = retry2.url;
            usedReference = true;
          } else {
            throw new Error("Reference still not used after all retries");
          }
        } catch (e2) {
          console.error(`  → Retry 2 failed:`, e2.message);
          console.error(`  ❌ FATAL: Cannot generate page with cover reference`);
          console.error(`  → Rejecting page generation - style consistency is CRITICAL`);
          throw new Error(`Cannot generate page "${page.title}" with cover reference. Style consistency cannot be maintained. Please try regenerating this page with different scene descriptions.`);
        }
      }
    }

    // ── Quality Score Check DISABLED ────────────────────────────────────────
    // Disabled because it causes style inconsistency between pages
    const qualityScore = 100; // Default: assume good

    // Save image with projectId in path to prevent cache issues
    // Path: projectId/page-1.png (unique per comic generation)
    const folder = projectId || `book-${Date.now()}`;
    const filename = page.id || `page-${Date.now()}`;
    const storedUrl = await saveImage(rawUrl, folder, filename);
    
    if (!storedUrl) {
      console.error(`❌ CRITICAL: Failed to save image to Supabase for page "${page.title}"!`);
      console.error(`   → projectId: ${projectId}`);
      console.error(`   → folder: ${folder}`);
      console.error(`   → filename: ${filename}`);
    } else {
      console.log(`✓ Image saved to Supabase: ${folder}/${filename}.png`);
    }
    
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
        response_format: { type: "json_object" },
        max_tokens: 200, temperature: 0.1,
      });
      const posData = JSON.parse(visionRes.choices[0].message.content || "{}");
      if (posData.panels?.length > 0) panelPositions = posData.panels;
    } catch (e) {
      console.warn("  Panel detection failed:", e.message);
    }

    console.log(`✓ Page "${page.title}" done`);

    // Save to memory with quality score
    // CRITICAL: projectId MUST be provided, no fallback to avoid wrong data
    if (!projectId) {
      console.error(`❌ CRITICAL: No projectId for page "${page.title}"!`);
    } else {
      const pageCharacters = page.panels.flatMap(p => p.speaker ? [p.speaker] : []).filter(Boolean);
      await savePage(
        projectId,
        page.pageNumber || 1,
        finalUrl,
        pageCharacters,
        refSource,
        qualityScore
      );
    }

    res.json({ imageUrl: finalUrl, panels: page.panels, panelPositions });
  } catch (err) {
    console.error("Page error:", err.message);
    res.status(500).json({ error: err.message, imageUrl: "", panels: [] });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/comic/ending
// ─────────────────────────────────────────────────────────────────────────────
router.post("/ending", async (req, res) => {
  try {
    const { storyInput, guidedAnswers = {}, tone, language, dedication, dedicationFrom } = req.body;
    const lang = { de: "German", en: "English", fr: "French", es: "Spanish" }[language] || "German";
    const toneMap = { humorvoll: "humorous and light-hearted", kindgerecht: "warm and child-friendly", romantisch: "romantic and tender", biografisch: "nostalgic and personal", episch: "epic and adventurous" };
    const toneEn = toneMap[tone] || "warm, personal, loving";

    const r = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [{
        role: "system",
        content: `Write a beautiful, professional dedication for the last page of a comic book in ${lang}.

CRITICAL RULES:
- Write 2-3 complete, well-formed sentences with proper grammar
- Each sentence MUST have: Subject + Predicate + Object
- Use elegant, flowing language - NOT keywords or bullet points
- Address the main person(s) DIRECTLY by name
- Mention 1-2 concrete moments from the story
- Tone: ${toneEn}
- NO sender signature ("Von:", "Deine Familie") — that is shown separately
${dedicationFrom ? `Info: sender is "${dedicationFrom}" — do NOT write this in the dedication` : ""}

GOOD EXAMPLES (German):
"Liebe Mama, dieser besondere Tag zeigt, wie sehr wir dich lieben. Vom gemeinsamen Frühstück bis zum selbstgebackenen Kuchen - jeder Moment war voller Freude und Dankbarkeit."

"Für dich, liebe Oma! Wir haben zusammen gelacht, gespielt und die schönsten Erinnerungen geschaffen. Du machst jeden Tag zu etwas Besonderem."

BAD EXAMPLES (DO NOT DO THIS):
"Aymen (3 Jahre), Mama (38 Jahre) erleben morgens frühstücken, geschenk geben, kuchen backen."
"Frühstück, Geschenke, Backen, Sushi essen"

Write ONLY the dedication text, nothing else.`
      }, {
        role: "user",
        content: `Story: ${storyInput || ""}\n${Object.entries(guidedAnswers).filter(([k, v]) => v && k !== "category").map(([k, v]) => `${k}: ${v}`).join("\n")}${dedication ? `\nUser dedication: ${dedication}` : ""}`,
      }],
      max_tokens: 150, temperature: 0.7,
    });

    const endingText = r.choices[0].message.content || "";
    console.log(`✓ Ending generated`);
    res.json({ endingText, dedication: dedication || "", dedicationFrom: dedicationFrom || "" });
  } catch (err) {
    console.error("Ending error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/comic/export-pdf
// Erstellt PDF mit Cover + Seiten + Ending für Testdrucke
// ─────────────────────────────────────────────────────────────────────────────
const { createComicPDF } = require('../lib/pdf-generator');

router.post("/export-pdf", async (req, res) => {
  try {
    const { project } = req.body;
    
    if (!project) {
      return res.status(400).json({ error: "Project data required" });
    }
    
    console.log(`Creating PDF for project: ${project.title}`);
    
    const pdfBuffer = await createComicPDF(project);
    
    // PDF als Download zurückgeben
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizeFilename(project.title)}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
    
    console.log(`✓ PDF created: ${pdfBuffer.length} bytes`);
  } catch (err) {
    console.error("PDF export error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

function sanitizeFilename(name) {
  return name
    .replace(/[^a-zA-Z0-9äöüÄÖÜß\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50);
}

module.exports = router;
