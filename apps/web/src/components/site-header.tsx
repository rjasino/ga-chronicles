import Link from "next/link";
import Image from "next/image";
import { getVerifiedSession } from "@/lib/supabase/session";
import { signOut } from "@/features/auth/actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

const navLink = "inline-flex min-h-11 items-center font-semibold no-underline hover:text-red";

export async function SiteHeader() {
  const session = await getVerifiedSession();
  return <header className="site-header flex min-h-[82px] items-center justify-between border-b border-line px-[max(5vw,calc((100vw-1160px)/2))] max-[760px]:items-start max-[760px]:gap-4 max-[760px]:px-[5vw] max-[760px]:py-2.5 max-[430px]:items-center"><Link className="brand flex items-center gap-[.45rem] whitespace-nowrap font-display text-[.95rem] leading-[1.05] font-bold text-blue no-underline max-[430px]:text-[.8rem]" href="/" aria-label="Game Ako Chronicles home"><Image className="brand__logo h-[46px] w-[52px] object-contain max-[430px]:h-10 max-[430px]:w-[42px]" src="/brand/neon_ga_logo_2.png" alt="" width={60} height={54} priority /><span>Game Ako Chronicles</span></Link><nav aria-label="Main navigation" className="flex items-center gap-7 max-[760px]:flex-wrap max-[760px]:justify-end max-[760px]:gap-4 max-[430px]:gap-x-3.5 max-[430px]:gap-y-2 max-[430px]:text-[.85rem]"><Link className={navLink} href="/">Stories</Link>{session?.roles.some((role) => role === "contributor" || role === "admin") && <Link className={navLink} href="/admin/articles">Editorial</Link>}{session?.roles.some((role) => role === "moderator" || role === "admin") && <Link className={navLink} href="/admin/moderation">Moderation</Link>}{session?.roles.includes("admin") && <Link className={navLink} href="/admin/users">People</Link>}{session ? <><Link className={navLink} href="/account/password">Account</Link><form action={signOut} className="m-0"><Button purpose="text">Sign out</Button></form></> : <Link className={navLink} href="/sign-in">Sign in</Link>}<ThemeToggle /></nav></header>;
}
