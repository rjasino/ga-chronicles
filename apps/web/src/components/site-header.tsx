import Link from "next/link";
import Image from "next/image";
import { getVerifiedSession } from "@/lib/supabase/session";
import { signOut } from "@/features/auth/actions";
import { ThemeToggle } from "@/components/theme-toggle";

export async function SiteHeader() {
  const session = await getVerifiedSession();
  return <header className="site-header"><Link className="brand" href="/" aria-label="Game Ako Chronicles home"><Image className="brand__logo" src="/brand/neon_ga_logo_2.png" alt="" width={60} height={54} priority /><span>Game Ako Chronicles</span></Link><nav aria-label="Main navigation"><Link href="/">Stories</Link>{session?.roles.some((role) => role === "contributor" || role === "admin") && <Link href="/admin/articles">Editorial</Link>}{session?.roles.some((role) => role === "moderator" || role === "admin") && <Link href="/admin/moderation">Moderation</Link>}{session?.roles.includes("admin") && <Link href="/admin/users">People</Link>}{session ? <><Link href="/account/password">Account</Link><form action={signOut}><button className="nav-button">Sign out</button></form></> : <Link href="/sign-in">Sign in</Link>}<ThemeToggle /></nav></header>;
}
