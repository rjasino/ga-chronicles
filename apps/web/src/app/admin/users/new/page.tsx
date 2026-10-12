import { requireAnyRole } from "@/lib/authz/require-role";
import { NewAccountForm } from "@/components/admin/new-account-form";

export default async function NewUserPage() {
  await requireAnyRole(["admin"]);
  return <main className="page-shell admin-page min-h-[70vh] py-12 pb-20"><p className="article-type m-0 mb-2.5 text-[.78rem] font-bold tracking-[.06em] text-red uppercase">Account administration</p><h1 className="m-0 mb-2.5 font-display text-[clamp(2.4rem,5vw,3.5rem)] leading-[1.05] tracking-[-.05em] text-blue">Create an internal account</h1><NewAccountForm /></main>;
}
