import { SignUpForm } from "@/components/auth/sign-up-form";

export default function SignUpPage() {
  return <main className="page-shell auth-page grid min-h-[65vh] place-items-center py-14"><section className="auth-panel w-[min(100%,520px)] border-t-[5px] border-yellow bg-paper p-9 max-[430px]:p-5"><p className="article-type m-0 mb-2.5 text-[.78rem] font-bold tracking-[.06em] text-red uppercase">Join the conversation</p><h1 className="m-0 mb-6 font-display text-[clamp(2.4rem,5vw,3.5rem)] leading-[1.05] tracking-[-.05em] text-blue">Create your reader account.</h1><SignUpForm /></section></main>;
}
