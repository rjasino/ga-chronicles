import { notFound } from "next/navigation";
import { GoForceResultsPage } from "@/components/go-force/results-page";
import { getPublishedResults } from "@/features/go-force/results-queries";

export const metadata = {
  title: "Go Force results",
};

export default async function GoForceResultsRoute({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const data = await getPublishedResults(sessionId);
  if (!data) notFound();

  return (
    <main className="page-shell min-h-[70vh] py-12 pb-20">
      <GoForceResultsPage data={data} />
    </main>
  );
}
