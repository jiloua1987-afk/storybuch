// Supabase Storage Helper — saves images and returns public URLs
// Eliminates b64 from the response pipeline

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

/**
 * Save an image (b64 or URL) to Supabase Storage and return the public URL.
 * Falls back to the original input if Supabase is not configured.
 */
export async function saveImageToStorage(
  b64OrUrl: string,
  folder: string,
  filename: string
): Promise<string> {
  // If Supabase is not configured, return the original
  if (!supabase || !b64OrUrl) return b64OrUrl;

  try {
    let buffer: Buffer;

    if (b64OrUrl.startsWith("data:")) {
      buffer = Buffer.from(b64OrUrl.replace(/^data:image\/\w+;base64,/, ""), "base64");
    } else if (b64OrUrl.startsWith("http")) {
      const res = await fetch(b64OrUrl, { signal: AbortSignal.timeout(20000) });
      if (!res.ok) return b64OrUrl;
      buffer = Buffer.from(await res.arrayBuffer());
    } else {
      // Raw base64 string
      buffer = Buffer.from(b64OrUrl, "base64");
    }

    // Resize with sharp (only available server-side)
    const sharp = (await import("sharp")).default;
    const compressed = await sharp(buffer)
      .resize(1400, null, { withoutEnlargement: true, fit: "inside" })
      .jpeg({ quality: 90, progressive: true })
      .toBuffer();

    const path = `${folder}/${filename}.jpg`;
    const { error } = await supabase.storage
      .from("comic-panels")
      .upload(path, compressed, { contentType: "image/jpeg", upsert: true });

    if (error) {
      console.error("Supabase upload error:", error.message);
      return b64OrUrl;
    }

    const { data } = supabase.storage.from("comic-panels").getPublicUrl(path);
    return data.publicUrl;
  } catch (err: any) {
    console.error("Storage save error:", err.message);
    return b64OrUrl; // fallback to original
  }
}
