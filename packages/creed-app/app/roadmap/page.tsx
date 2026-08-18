import type { Metadata } from "next";
import { RoadmapPageView } from "@/components/marketing/roadmap-page-view";
import { fetchRoadmap } from "@/lib/marketing/fetch-roadmap";
import { JsonLd } from "@/components/marketing/json-ld";
import { marketingHomePath } from "@/lib/marketing/home";
import { breadcrumbSchema, graph, webPageSchema } from "@/lib/seo/structured-data";

const PATH = "/roadmap";
const TITLE = "Roadmap";
const DESCRIPTION =
  "A live view of what we're building, straight from Creed's task board.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
};

// The cached page keeps Linear traffic bounded while reflecting roadmap moves
// within about a minute. It reads no user state and publishes only fields that
// pass the server-side public-roadmap label gate.
export const revalidate = 60;

export default async function RoadmapPage() {
  const columns = await fetchRoadmap();
  return (
    <>
      <JsonLd
        data={graph(
          webPageSchema({ path: PATH, name: TITLE, description: DESCRIPTION }),
          breadcrumbSchema(PATH, [
            { name: "Creed", path: marketingHomePath() },
            { name: "Roadmap", path: PATH },
          ])
        )}
      />
      <RoadmapPageView columns={columns} />
    </>
  );
}
