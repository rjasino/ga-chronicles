import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getPublicEnv, getServiceRoleKey } from "@/lib/env";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const env = getPublicEnv();
      const admin = createAdminClient(env.NEXT_PUBLIC_SUPABASE_URL, getServiceRoleKey(), { auth: { autoRefreshToken: false, persistSession: false } });
      const username = `player-${data.user.id.slice(0, 8)}`.toLowerCase();
      await admin.from("accounts").upsert({ id: data.user.id, username, display_name: String(data.user.user_metadata.full_name ?? "") || null }, { onConflict: "id" });
      if (data.user.email) await admin.from("account_auth_lookup").upsert({ account_id: data.user.id, email: data.user.email.toLowerCase() }, { onConflict: "account_id" });
      return NextResponse.redirect(new URL("/", url.origin));
    }
  }
  return NextResponse.redirect(new URL("/sign-in?error=oauth", url.origin));
}
