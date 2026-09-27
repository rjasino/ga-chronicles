import { SignInForm } from "@/components/auth/auth-form";
import { startGoogleSignIn } from "@/features/auth/actions";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <main className="page-shell auth-page"><section className="auth-panel"><p className="article-type">Your account</p><h1>Welcome back.</h1>{error === "oauth" && <p role="alert" className="form-error">Google sign-in did not finish. Try again or use your username.</p>}<SignInForm /><form action={startGoogleSignIn}><button className="button-secondary">Continue with Google</button></form></section></main>;
}
