const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Rewrite a scene description to be safer for OpenAI image generation
 * while maintaining emotional meaning and visual composition
 */
async function rewriteSafeScene(sceneText) {
  if (!sceneText || sceneText.trim().length === 0) {
    return sceneText;
  }
  
  const prompt = `Rewrite the following comic scene for OpenAI image generation safety compliance.

IMPORTANT RULES:
- Keep emotional meaning and atmosphere
- Keep scene structure and characters
- REMOVE or soften risky wording
- Replace food-related terms with family-friendly descriptions
- NEVER mention: eating, feeding, food in mouth, consuming, biting, chewing
- Use instead: "preparing food", "cooking together", "enjoying meal", "sharing food"
- Replace aggressive/dramatic terms with warm, celebratory language
- NEVER mention: violence, intoxication, sexuality, danger, illegal activity, weapons
- Keep it visually descriptive and emotionally warm
- Use positive, celebratory language
- Focus on connection, joy, and warmth

EXAMPLES:
- "essen und backen" → "preparing food and baking together"
- "Sushi essen" → "enjoying a meal together"
- "Kuchen essen" → "sharing a cake together"
- "wild party with drunk friends" → "lively celebration with friends laughing together"
- "couple argued emotionally" → "couple had an intense emotional conversation"
- "children screaming through crowd" → "children excitedly running through busy festival"
- "fist pump celebration" → "arms raised in joyful celebration"

Scene to rewrite:
${sceneText}

Return ONLY the rewritten scene, nothing else.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 500,
    });
    
    const rewritten = response.choices[0].message.content.trim();
    
    console.log(`🛡️ Safety Rewrite:`);
    console.log(`   Original: ${sceneText.substring(0, 80)}...`);
    console.log(`   Rewritten: ${rewritten.substring(0, 80)}...`);
    
    return rewritten;
    
  } catch (err) {
    console.error('Safety rewrite failed:', err.message);
    return sceneText; // Fallback to original
  }
}

/**
 * Check if text contains risky keywords that might trigger safety rejection
 */
function containsRiskyKeywords(text) {
  const riskWords = [
    // Food + Eating (triggers safety with children)
    'essen', 'eating', 'eat', 'feed', 'feeding', 'consume', 'consuming',
    'bite', 'biting', 'chew', 'chewing', 'swallow', 'mouth', 'taste',
    // Alcohol
    'drunk', 'beer', 'wine', 'alcohol', 'intoxicated', 'drinking',
    // Violence
    'fight', 'fighting', 'punch', 'hit', 'hitting', 'weapon', 'blood', 'violence',
    'danger', 'dangerous', 'threat', 'threatening', 'scary', 'terrifying',
    // Emotional intensity
    'screaming', 'scream', 'yelling', 'yell', 'shouting', 'shout', 'crying', 'cry',
    // Chaos (removed 'crowd' and 'wild' — too broad, triggers on normal scenes)
    'chaotic', 'mob',
    // Party (can be risky with alcohol context)
    'nightclub', 'club',
    // Other
    'sexy', 'naked', 'undressed',
    'police', 'arrest', 'crime',
  ];
  
  const lowerText = text.toLowerCase();
  return riskWords.some(word => lowerText.includes(word));
}

/**
 * Main function: Rewrite scene if it contains risky keywords
 */
async function rewriteIfRisky(sceneText) {
  if (!sceneText || sceneText.trim().length === 0) {
    return sceneText;
  }
  
  if (containsRiskyKeywords(sceneText)) {
    console.log(`⚠️ Risky keywords detected in scene, rewriting for safety...`);
    return await rewriteSafeScene(sceneText);
  }
  
  console.log(`✓ Scene appears safe, no rewrite needed`);
  return sceneText;
}

module.exports = {
  rewriteSafeScene,
  rewriteIfRisky,
  containsRiskyKeywords,
};
