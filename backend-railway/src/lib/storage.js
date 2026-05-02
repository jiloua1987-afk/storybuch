const { createClient } = require("@supabase/supabase-js");
const sharp = require("sharp");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function saveImage(b64OrUrl, folder, filename) {
  try {
    let buffer;
    if (b64OrUrl.startsWith("data:")) {
      buffer = Buffer.from(b64OrUrl.replace(/^data:image\/\w+;base64,/, ""), "base64");
    } else if (b64OrUrl.startsWith("http")) {
      const res = await fetch(b64OrUrl, { signal: AbortSignal.timeout(20000) });
      buffer = Buffer.from(await res.arrayBuffer());
    } else {
      buffer = Buffer.from(b64OrUrl, "base64");
    }

    const compressed = await sharp(buffer)
      .png({ quality: 95 })
      .toBuffer();

    const path = `${folder}/${filename}.png`;
    const { error } = await supabase.storage
      .from("comic-panels")
      .upload(path, compressed, { contentType: "image/png", upsert: true });

    if (error) throw error;

    const { data } = supabase.storage.from("comic-panels").getPublicUrl(path);
    return data.publicUrl;
  } catch (err) {
    console.error("Storage error:", err.message);
    return null;
  }
}

// ── Save character references after cover generation ──────────────────────────
async function saveCharacterRefs(projectId, characters, coverUrl) {
  try {
    const rows = characters.map(c => ({
      project_id: projectId,
      character_name: c.name,
      character_age: c.age || null,
      visual_anchor: c.visual_anchor || null,
      cover_url: coverUrl,
      in_photo: c.inPhoto === true,
    }));

    const { error } = await supabase
      .from("character_ref_image")
      .upsert(rows, { onConflict: "project_id,character_name" });

    if (error) throw error;
    console.log(`✓ Saved ${rows.length} character refs for project ${projectId}`);
  } catch (err) {
    console.error("saveCharacterRefs error:", err.message);
  }
}

// ── Get character references for a project ────────────────────────────────────
async function getCharacterRefs(projectId) {
  try {
    const { data, error } = await supabase
      .from("character_ref_image")
      .select("*")
      .eq("project_id", projectId);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("getCharacterRefs error:", err.message);
    return [];
  }
}

// ── Save generated page with quality score ────────────────────────────────────
async function savePage(projectId, pageNumber, imageUrl, charactersPresent, refSource, qualityScore = 0) {
  try {
    const { error } = await supabase
      .from("last_page_image")
      .upsert({
        project_id: projectId,
        page_number: pageNumber,
        image_url: imageUrl,
        characters_present: charactersPresent || [],
        ref_source: refSource || "unknown",
        quality_score: qualityScore,
      }, { onConflict: "project_id,page_number" });

    if (error) throw error;
  } catch (err) {
    console.error("savePage error:", err.message);
  }
}

// ── Get best previous page for a project (highest quality score) ──────────────
async function getBestPage(projectId) {
  try {
    const { data, error } = await supabase
      .from("last_page_image")
      .select("*")
      .eq("project_id", projectId)
      .order("quality_score", { ascending: false })
      .limit(1)
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    return null;
  }
}

module.exports = { saveImage, saveCharacterRefs, getCharacterRefs, savePage, getBestPage };
