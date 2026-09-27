import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";

loadEnvConfig(process.cwd());

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Set the local Supabase URL and server-only service role key first.");
  const prompt = createInterface({ input: stdin, output: stdout });
  try {
    const email = (await prompt.question("First admin email: ")).trim();
    const username = (await prompt.question("First admin username: ")).trim().toLowerCase();
    const password = await prompt.question("Temporary password (input is local only): ");
    if (!email || !username || password.length < 12) throw new Error("Email, username, and a 12-character password are required.");
    const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw error;
    const { error: accountError } = await supabase.from("accounts").insert({ id: data.user.id, username });
    if (accountError) throw accountError;
    const { error: lookupError } = await supabase.from("account_auth_lookup").insert({ account_id: data.user.id, email: email.toLowerCase() });
    if (lookupError) throw lookupError;
    const { error: roleError } = await supabase.from("account_roles").insert({ account_id: data.user.id, role: "admin" });
    if (roleError) throw roleError;
    console.info("First administrator created. Store the credentials in an approved password manager.");
  } finally {
    prompt.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Bootstrap failed.");
  process.exitCode = 1;
});
