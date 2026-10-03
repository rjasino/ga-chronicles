import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: { default: "Game Ako Chronicles", template: "%s | Game Ako Chronicles" },
  description: "Independent gaming stories, reviews, and commentary.",
};

/**
 * Applies a stored theme before the page paints so a returning visitor never sees
 * a flash of the opposite theme. Light stays the server default; only an explicit,
 * valid stored choice overrides it. Storage access is guarded so a blocked store
 * fails safe to light. Keep the key in sync with `features/theme/theme.ts`.
 */
const themeInitScript = `(function(){try{var t=window.localStorage.getItem("game-ako-theme");if(t==="dark"||t==="light"){document.documentElement.setAttribute("data-theme",t);}}catch(e){}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-theme="light" data-scroll-behavior="smooth" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: themeInitScript }} /></head><body><a className="skip-link" href="#main-content">Skip to content</a><SiteHeader /><div id="main-content">{children}</div><SiteFooter /></body></html>;
}
