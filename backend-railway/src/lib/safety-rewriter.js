const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Rewrites a scene description to be safety-compliant
 * while keeping emotional meaning and visual details
 */
async function rewriteSafeScene(sceneText) {
  if (!sceneText || sceneText.trim().length === 0) {
    return sceneText;
  }
  
  const prompt = `Rewrite the following comic scene for OpenAI image generation safety compliance.

CRITICAL RULES:
- Keep emotional meaning and atmosphere
- Keep scene structure and characters
- Keep visual details (location, objects, activities)
- REMOVE or soften risky wording
- Replace food-related terms with family-friendly descriptions
- NEVER mention: eating, feeding, food in mouth, consuming, biting, chewing
- USE instead: "preparing food", "cooking together", "enjoying meal", "sharing food"
- Keep it visually descriptive and emotionally warm
- Focus on connection, joy, and warmth

EXAMPLES:
- "essen und backen" → "preparing food and baking together"
- "Sushi essen" → "enjoying a meal together with sushi on the table"
- "Kuchen essen" → "sharing a freshly baked cake"
- "Erdbeerkuchen backen und essen" → "baking strawberry cake together and enjoying it"
- "wild party with drunk friends" → "lively celebration with friends laughing together"
- "children screaming" → "children excitedly playing"

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
    // Fallback: return original (better than crashing)
    return sceneText;
  }
}

/**
 * Checks if a scene contains high-risk keywords
 */
function containsRiskyKeywords(text) {
  const riskWords = [
    // Food + Eating (triggers Safety with children)
    'essen', 'eating', 'eat', 'feed', 'feeding', 'consume', 'consuming',
    'bite', 'biting', 'chew', 'chewing', 'swallow', 'mouth', 'taste',
    
    // Alcohol/Drugs
    'drunk', 'beer', 'wine', 'alcohol', 'intoxicated', 'wasted', 'drinking',
    
    // Violence
    'fight', 'fighting', 'punch', 'punching', 'hit', 'hitting', 'weapon', 
    'blood', 'violence', 'aggressive', 'attack',
    
    // Danger
    'danger', 'dangerous', 'threat', 'threatening', 'scary', 'terrifying', 'horror',
    
    // Sexuality
    'sexy', 'naked', 'undressed', 'intimate',
    
    // Illegal
    'police', 'arrest', 'crime', 'illegal',
    
    // Extreme emotion
    'screaming', 'scream', 'yelling', 'yell', 'shouting', 'shout', 
    'crying', 'cry', 'sobbing', 'sob',
    
    // Crowds/Chaos
    'wild', 'crazy', 'chaotic', 'chaos', 'mob', 'riot',
    
    // Party
    'party', 'nightclub', 'club', 'rave',
  ];
  
  const lowerText = text.toLowerCase();
  return riskWords.some(word => lowerText.includes(word));
}

/**
 * Rewrites scene only if it contains risky keywords
 * This is the main function to use in the API
 */
async function rewriteIfRisky(sceneText) {
  if (!sceneText) return sceneText;
  
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
