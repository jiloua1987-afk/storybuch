import { NextResponse } from "next/server";

export async function GET() {
  const checks: Record<string, string> = {};

  // Check env vars
  checks.OPENAI_API_KEY = process.env.OPENAI_API_KEY ? "✅ set" : "❌ missing";
  checks.SUPABASE_URL = process.env.SUPABASE_URL ? "✅ set" : "❌ missing";
  checks.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ? "✅ set" : "❌ missing";
  checks.NEXT_PUBLIC_RAILWAY_URL = process.env.NEXT_PUBLIC_RAILWAY_URL ? "✅ set" : "❌ missing";
  checks.NEXT_PUBLIC_DRY_RUN = process.env.NEXT_PUBLIC_DRY_RUN || "not set";

  // Test Supabase connection
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
      const { data, error } = await supabase.storage.listBuckets();
      if (error) {
        checks.SUPABASE_CONNECTION = `❌ ${error.message}`;
      } else {
        const bucketNames = (data || []).map((b: any) => b.name).join(", ");
        checks.SUPABASE_CONNECTION = `✅ connected (buckets: ${bucketNames})`;
      }
    } catch (e: any) {
      checks.SUPABASE_CONNECTION = `❌ ${e.message}`;
    }
  }

  return NextResponse.json(checks);
}
