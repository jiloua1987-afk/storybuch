const { createClient } = require("@supabase/supabase-js");
const sharp = require("sharp");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function saveImageToStorage(b64OrUrl, bookId, panelId) {
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

    // Komprimieren
    const compressed = await sharp(buffer)
      .resize(1200, null, { withoutEnlargement: true })
      .jpeg({ quality: 88, progressive: true })
      .toBuffer();

    const filePath = `books/${bookId}/panels/${panelId}.jpg`;

    const { error } = await supabase.storage
      .from("comic-panels")
      .upload(filePath, compressed, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (error) throw error;

    const { data } = supabase.storage
      .from("comic-panels")
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (err) {
    console.error("Storage error:", err.message);
    return null;
  }
}

module.exports = { saveImageToStorage };
