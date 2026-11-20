import { GoForceAdminControls } from "@/components/go-force/admin-controls";
import { getGoForceAdminData } from "@/features/go-force/admin-queries";
import { requireAnyRole } from "@/lib/authz/require-role";

export const metadata = {
  title: "Go Force admin",
};

export default async function GoForceAdminPage() {
  await requireAnyRole(["admin"]);
  const data = await getGoForceAdminData();

  return (
    <main className="page-shell admin-page min-h-[70vh] py-12 pb-20">
      <p className="article-type m-0 mb-2.5 text-[.78rem] font-bold tracking-[.06em] text-red uppercase">Live event controls</p>
      <h1 className="m-0 mb-2.5 font-display text-[clamp(2.4rem,5vw,3.5rem)] leading-[1.05] tracking-[-.05em] text-blue">Go Force GOTY</h1>
      <p className="mb-5 max-w-[760px]">Maintain the annual eligible list, control public visibility, and open the facilitator screen for a live session.</p>
      <GoForceAdminControls data={data} />
    </main>
  );
}
