import { requireAnyRole } from "@/lib/authz/require-role";
import { NewAccountForm } from "@/components/admin/new-account-form";

export default async function NewUserPage() {
  await requireAnyRole(["admin"]);
  return <main className="page-shell admin-page"><p className="article-type">Account administration</p><h1>Create an internal account</h1><NewAccountForm /></main>;
}
