import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    const labels = formData.getAll("labels") as string[];

    if (!files.length) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const uploaded = await Promise.all(files.map(async (file, i) => {
      const label = labels[i] || `photo-${i + 1}`;
      const ext = file.name.split(".").pop() || "jpg";
      const path = `uploads/${Date.now()}-${i}-${label.replace(/\s+/g, "-")}.${ext}`;

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { error } = await supabase.storage
        .from("comic-panels")
        .upload(path, buffer, {
          contentType: file.type || "image/jpeg",
          upsert: false,
        });

      if (error) throw new Error(`Upload failed for ${label}: ${error.message}`);

      const { data } = supabase.storage.from("comic-panels").getPublicUrl(path);
      return { label, url: data.publicUrl, path };
    }));

    return NextResponse.json({ uploaded });
  } catch (err: any) {
    console.error("Upload error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
