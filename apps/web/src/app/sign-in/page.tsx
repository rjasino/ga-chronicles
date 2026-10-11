import { SignInForm } from "@/components/auth/auth-form";
import { Button } from "@/components/ui/button";
import { Message } from "@/components/ui/message";
import { startGoogleSignIn } from "@/features/auth/actions";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <main className="page-shell auth-page grid min-h-[65vh] place-items-center py-14"><section className="auth-panel w-[min(100%,520px)] border-t-[5px] border-yellow bg-paper p-9 max-[430px]:p-5"><p className="article-type m-0 mb-2.5 text-[.78rem] font-bold tracking-[.06em] text-red uppercase">Your account</p><h1 className="m-0 mb-6 font-display text-[clamp(2.4rem,5vw,3.5rem)] leading-[1.05] tracking-[-.05em] text-blue">Welcome back.</h1>{error === "oauth" && <Message tone="error">Google sign-in did not finish. Try again or use your username.</Message>}<SignInForm /><form action={startGoogleSignIn}><Button purpose="secondary">Continue with Google</Button></form></section></main>;
}
