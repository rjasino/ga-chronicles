import { requirePermission } from "@/lib/authz/require-role";
import { PasswordChangeForm } from "@/components/auth/password-change-form";

export default async function PasswordPage() {
  await requirePermission("read");
  return <main className="page-shell auth-page"><section className="auth-panel"><p className="article-type">Account security</p><h1>Change password</h1><PasswordChangeForm /></section></main>;
}
