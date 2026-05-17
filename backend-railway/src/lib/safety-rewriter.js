"use strict";

/**
 * Safety System für ComicStyle.de
 *
 * 4 Schichten:
 *  1. sanitizePrompt()   — String-Ersetzungen, kein API-Call, kein Overhead
 *  2. classifyScene()    — Risiko-Level bestimmen (safe/low/medium/high)
 *  3. BD_STYLE_ANCHOR    — Bande-Dessinée-Stil in JEDEM Prompt verankern
 *  4. rewriteIfRisky()   — GPT-4o-mini reformuliert bei Bedarf (nur bei Bedarf)
 *
 * Exports (rückwärtskompatibel):
 *   rewriteIfRisky(text)         — wie bisher, jetzt mit erweiterter Logik
 *   rewriteSafeScene(text)       — GPT-Reformulierung
 *   containsRiskyKeywords(text)  — Keyword-Check
 *   classifyScene(text)          — NEU: Risiko-Level
 *   BD_STYLE_ANCHOR              — NEU: Stil-Anker String
 *   BD_STYLE_ANCHOR_STRONG       — NEU: Verstärkter Stil-Anker für Tier-3
 */

const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Bande-Dessinée Stil-Anker ─────────────────────────────────────────────────
// Wird am Anfang jedes Image-Prompts eingefügt
const BD_STYLE_ANCHOR = `COMIC ART STYLE — MANDATORY:
European Bande Dessinée illustration. Bold black ink outlines with varying line weight. Flat areas of warm color with subtle cel-shading. Expressive stylized faces. Cinematic panel composition. Warm amber and teal palette.
NOT photorealistic. NOT manga. NOT anime. NOT watercolor. NOT sketch.`;

// Verstärkte Version für Tier-3 (ohne Referenzbild)
const BD_STYLE_ANCHOR_STRONG = `ABSOLUTE STYLE REQUIREMENT — BANDE DESSINÉE:
European Bande Dessinée comic illustration. Bold ink outlines. Warm flat colors. Expressive faces. Cinematic composition.
NOT photorealistic. NOT manga. NOT anime. NOT watercolor.
This style requirement overrides all other considerations.`;

// ── Schicht 1: Prompt Sanitizer ───────────────────────────────────────────────
// Reine String-Operationen — kein API-Call, kein Overhead

const HARD_REPLACEMENTS = {
  // Gewalt
  'fist pump':   'arms raised in celebration',
  'fist':        'hand raised',
  'punch':       'gesture',
  'hit':         'touch',
  'fight':       'play together',
  'fighting':    'playing together',
  'weapon':      '',
  'gun':         '',
  'blood':       '',
  'corpse':      '',
  // Alkohol
  'drunk':       '',
  'intoxicated': '',
  'alcohol':     'beverage',
  'bier':        'beverage',
  'beer':        'drink',
  'wein':        'beverage',
  'wine':        'drink',
  'alkohol':     'refreshment',
  // Körper/Sexuell
  'naked':       '',
  'nude':        '',
  'undressed':   '',
  'underwear':   'casual clothes',
  'bikini':      'summer clothes',
  'swimwear':    'summer beach clothes',
  'badehose':    'summer clothing',
  // Gefahr
  'danger':      'excitement',
  'dangerous':   'exciting',
  'threat':      '',
  'scary':       'surprising',
  'terrifying':  'surprising',
};

// Deutsche Begriffe die Safety triggern — mit kontextsensitiven Ersetzungen
const GERMAN_SOFT_REPLACEMENTS = [
  // Jubel / Emotion
  { pattern: /\bjubeln\b/gi,    replacement: 'smiling with raised hands in joy' },
  { pattern: /\bjubelt\b/gi,    replacement: 'smiles with raised hands in joy' },
  { pattern: /\bjubelnd\b/gi,   replacement: 'joyfully smiling with raised hands' },
  { pattern: /\bschreit\b/gi,   replacement: 'exclaims enthusiastically' },
  { pattern: /\bschreien\b/gi,  replacement: 'exclaiming enthusiastically' },
  { pattern: /\bbrüllt\b/gi,    replacement: 'calls out happily' },
  { pattern: /\bweint\b/gi,     replacement: 'has tears of happiness' },
  // Essen / Trinken (Safety-Trigger bei Fotos)
  { pattern: /\bheiße suppe\b/gi,  replacement: 'warm meal at the table' },
  { pattern: /\bheisse suppe\b/gi, replacement: 'warm meal at the table' },
  { pattern: /\bsuppe\b/gi,        replacement: 'meal' },
  { pattern: /\bessen\b/gi,        replacement: 'enjoying food together' },
  { pattern: /\bisst\b/gi,         replacement: 'enjoys the food' },
  { pattern: /\bschmeckt\b/gi,     replacement: 'tries the food' },
  { pattern: /\btrinken\b/gi,      replacement: 'having beverages' },
  { pattern: /\btrinkt\b/gi,       replacement: 'has a beverage' },
  // Freizeitpark (Safety-Trigger)
  { pattern: /\beuropapark\b/gi,   replacement: 'amusement park' },
  { pattern: /\beuropa-park\b/gi,  replacement: 'amusement park' },
  { pattern: /\bdisneyland\b/gi,   replacement: 'theme park' },
  { pattern: /\bdisney\b/gi,       replacement: 'theme park' },
  { pattern: /\blegoland\b/gi,     replacement: 'theme park' },
  { pattern: /\bphantasialand\b/gi, replacement: 'amusement park' },
  { pattern: /\bachterbahn\b/gi,   replacement: 'park attraction' },
  { pattern: /\broller coaster\b/gi, replacement: 'park attraction' },
  { pattern: /\bwildwasser\b/gi,   replacement: 'water attraction' },
  { pattern: /\bgeisterbahn\b/gi,  replacement: 'fun attraction' },
  { pattern: /\bkarussell\b/gi,    replacement: 'park ride' },
  // Bewegung (Kinder)
  { pattern: /\bkind rennt\b/gi,           replacement: 'child walks quickly with excitement' },
  { pattern: /\bkind springt\b/gi,         replacement: 'child stands on tiptoes, excited' },
  { pattern: /\bkinder rennen\b/gi,        replacement: 'children walk quickly with excitement' },
  { pattern: /\bkleinkind klettert\b/gi,   replacement: 'toddler reaches up curiously' },
  { pattern: /\bkleinkind springt\b/gi,    replacement: 'toddler stands excitedly' },
  // Feuer / Grill
  { pattern: /\bfeuer\b/gi,    replacement: 'warm glowing grill' },
  { pattern: /\bflammen\b/gi,  replacement: 'warm glow' },
  { pattern: /\brauch\b/gi,    replacement: 'warm rising steam' },
  // Fallen / Stürzen
  { pattern: /\bstürzt\b/gi,   replacement: 'tumbles playfully' },
  { pattern: /\bfällt\b/gi,    replacement: 'tumbles gently' },
  { pattern: /\bspringt auf\b/gi, replacement: 'stands up excitedly' },
  // Englische Ergänzungen
  { pattern: /\bscreaming\b/gi,  replacement: 'exclaiming with joy' },
  { pattern: /\bscream\b/gi,     replacement: 'exclaim' },
  { pattern: /\byelling\b/gi,    replacement: 'calling out happily' },
  { pattern: /\bshouting\b/gi,   replacement: 'speaking enthusiastically' },
  { pattern: /\bcrying\b/gi,     replacement: 'having tears of happiness' },
  // Regex für Kinder + Action
  { pattern: /child(?:ren)?\s+(?:running|jumping|falling|climbing|wrestling)/gi,
    replacement: 'children playing together happily' },
  { pattern: /toddler\s+(?:running|jumping|climbing)/gi,
    replacement: 'toddler playing gently' },
];

function sanitizePrompt(text) {
  if (!text) return text;

  let result = text;

  // Hard replacements (case-insensitive word boundaries)
  for (const [trigger, safe] of Object.entries(HARD_REPLACEMENTS)) {
    const regex = new RegExp(`\\b${trigger.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    result = result.replace(regex, safe);
  }

  // German soft replacements
  for (const { pattern, replacement } of GERMAN_SOFT_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }

  // Clean up double spaces
  result = result.replace(/\s{2,}/g, ' ').trim();

  return result;
}

// ── Schicht 2: Szenen-Klassifizierer ─────────────────────────────────────────

const HIGH_RISK_PATTERNS = [
  /jubel|schreit|brüllt|fist|springt.*freude/i,
  /kind.*(?:rennt|springt|klettert|fällt|stürzt)/i,
  /kleinkind.*(?:rennt|springt|klettert)/i,
  /feuer|flammen|rauch.*(?:person|kind|mensch|familie)/i,
  /(?:person|kind|mensch|familie).*(?:feuer|flammen|rauch)/i,
  /strand.*kind|kind.*strand|beach.*child|child.*beach/i,
  /swimwear.*child|child.*swimwear|bikini.*kind|kind.*bikini/i,
];

const MEDIUM_RISK_PATTERNS = [
  /sport.*(?:jubel|emotion|aufgeregt)/i,
  /grill|barbecue|bbq/i,
  /kind.*außen|outdoor.*kind/i,
  /großeltern.*umarm|oma.*umarm|opa.*umarm/i,
  /grandparent.*hug|grandma.*hug|grandpa.*hug/i,
];

/**
 * Klassifiziert das Risiko einer Szene
 * @returns {{ level: 'safe'|'low'|'medium'|'high', reasons: string[] }}
 */
function classifyScene(text) {
  if (!text) return { level: 'safe', reasons: [] };
  const reasons = [];

  for (const pattern of HIGH_RISK_PATTERNS) {
    if (pattern.test(text)) {
      reasons.push(pattern.toString());
      return { level: 'high', reasons };
    }
  }

  for (const pattern of MEDIUM_RISK_PATTERNS) {
    if (pattern.test(text)) {
      reasons.push(pattern.toString());
      return { level: 'medium', reasons };
    }
  }

  if (containsRiskyKeywords(text)) {
    return { level: 'low', reasons: ['risky keyword detected'] };
  }

  return { level: 'safe', reasons: [] };
}

// ── Schicht 3: Keyword-Check (rückwärtskompatibel) ───────────────────────────

function containsRiskyKeywords(text) {
  const riskWords = [
    // Food + Eating
    'essen', 'eating', 'eat', 'feed', 'feeding', 'consume', 'consuming',
    'bite', 'biting', 'chew', 'chewing', 'swallow', 'taste',
    // Alcohol
    'drunk', 'beer', 'wine', 'alcohol', 'intoxicated',
    // Violence
    'fight', 'fighting', 'punch', 'weapon', 'blood', 'violence',
    'danger', 'dangerous', 'threat', 'threatening', 'scary', 'terrifying',
    // Emotional intensity
    'screaming', 'scream', 'yelling', 'yell', 'shouting', 'shout',
    // Chaos
    'chaotic', 'mob',
    // Other
    'sexy', 'naked', 'undressed', 'nightclub',
    'police', 'arrest', 'crime',
  ];

  const lowerText = text.toLowerCase();
  return riskWords.some(word => lowerText.includes(word));
}

// ── Schicht 4: GPT-Reformulierung ────────────────────────────────────────────

/**
 * GPT-4o-mini reformuliert die Szene auf Englisch — sicher und familienfreundlich.
 * Nur aufgerufen wenn nötig (~$0.0001 pro Aufruf).
 */
async function rewriteSafeScene(sceneText) {
  if (!sceneText || sceneText.trim().length === 0) return sceneText;

  const prompt = `Rewrite this comic scene description for OpenAI image generation safety.

RULES:
- Keep the emotional meaning and characters
- Replace ALL action/intensity words with calm alternatives
- Replace food/eating with "enjoying a meal together" or "sharing food"
- Replace fire/smoke with "warm glowing light"
- Replace children running/jumping with "children playing gently"
- Replace shouting/screaming with "speaking enthusiastically"
- Replace crying with "having tears of happiness" (if joyful context)
- Keep it warm, family-friendly, visually descriptive
- Max 60 words
- English only

Scene: ${sceneText}

Return ONLY the rewritten scene.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 150,
    });

    const rewritten = response.choices[0].message.content.trim();
    console.log(`🛡️ Safety Rewrite:`);
    console.log(`   Original:  ${sceneText.substring(0, 80)}`);
    console.log(`   Rewritten: ${rewritten.substring(0, 80)}`);
    return rewritten;

  } catch (err) {
    console.error('Safety rewrite failed:', err.message);
    return sceneText;
  }
}

/**
 * Hauptfunktion — rückwärtskompatibel mit bisherigem Code.
 * Jetzt mit Klassifizierung: HIGH → sofort GPT-Rewrite, LOW → nur Sanitize.
 */
async function rewriteIfRisky(sceneText) {
  if (!sceneText || sceneText.trim().length === 0) return sceneText;

  // Schritt 1: Sanitize (immer, kein API-Call)
  const sanitized = sanitizePrompt(sceneText);

  // Schritt 2: Klassifizieren
  const { level, reasons } = classifyScene(sanitized);

  if (level === 'safe') {
    console.log(`✓ Scene appears safe, no rewrite needed`);
    return sanitized;
  }

  if (level === 'low') {
    console.log(`⚠️ Low risk keywords detected — sanitized only`);
    return sanitized;
  }

  // medium oder high → GPT-Reformulierung
  console.log(`⚠️ Scene risk level: ${level} (${reasons.length} pattern(s)) — GPT rewrite`);
  return await rewriteSafeScene(sanitized);
}

module.exports = {
  rewriteSafeScene,
  rewriteIfRisky,
  containsRiskyKeywords,
  classifyScene,
  sanitizePrompt,
  BD_STYLE_ANCHOR,
  BD_STYLE_ANCHOR_STRONG,
};
