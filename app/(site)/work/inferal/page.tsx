import CaseStudyLayout from "@/components/CaseStudyLayout";
import Link from "@/components/Link";
import { genPageMetadata } from "app/seo";

export const metadata = genPageMetadata({
  title: "Founding Engineering at Inferal",
  description:
    "Mehdi Akiki's founding-engineering work across Inferal's core engine, ontology system, and Relay data-synchronization capability.",
});

export default function InferalCaseStudy() {
  return (
    <CaseStudyLayout
      eyebrow="Founding engineering"
      title="Working across Inferal's engine, ontology, and Relay"
      summary="My work at Inferal spans the core engine, the ontology system that gives connected data explicit meaning, and Relay, the synchronization capability I built from the ground up."
      links={[
        { label: "Relay case study", href: "/work/inferal/relay" },
        { label: "Visit Inferal", href: "https://inferal.com" },
      ]}
    >
      <h2>One product, three connected layers</h2>
      <p>
        The engine, ontology, and data-ingestion path cannot be designed as unrelated pieces. Data
        has to arrive from external systems, retain a clear model of what it represents, and become
        usable by the runtime that acts on it. Working across all three gave me an end-to-end view
        of those boundaries and the decisions that connect them.
      </p>

      <h2>The engine</h2>
      <p>
        I worked on Inferal's core engine: the part of the product responsible for turning its data
        and behavior model into running software. The detailed implementation remains proprietary;
        the relevant scope is that this was foundational product work rather than an isolated
        application feature.
      </p>

      <h2>The ontology system</h2>
      <p>
        I also worked on the ontologies used to give connected data an explicit, shared model. That
        work sits at the boundary between external schemas, internal meaning, validation, and what
        the engine can safely infer or act upon.
      </p>

      <h2>Relay</h2>
      <p>
        I built Relay from the ground up as Inferal's data-synchronization capability. It brings
        data from internal systems and third-party APIs into the product while preserving the
        structure needed by the ontology and engine layers.
      </p>
      <p>
        The dedicated <Link href="/work/inferal/relay">Relay case study</Link> describes the public
        engineering scope and the design pressures behind that work without exposing proprietary
        implementation details.
      </p>

      <h2>Founding-engineer scope</h2>
      <p>
        The important part of this experience is the breadth of responsibility across a product
        whose architecture was still taking shape. It required reasoning about interfaces between
        subsystems, not optimizing one component in isolation, and making choices that later work
        could build on.
      </p>
    </CaseStudyLayout>
  );
}
