import CaseStudyLayout from "@/components/CaseStudyLayout";
import { genPageMetadata } from "app/seo";

export const metadata = genPageMetadata({
  title: "Building Relay from the Ground Up",
  description:
    "A public account of Mehdi Akiki's work building Inferal Relay, a data-synchronization capability for internal systems and external APIs.",
});

export default function RelayCaseStudy() {
  return (
    <CaseStudyLayout
      eyebrow="Inferal · Relay"
      title="Building Relay from the ground up"
      summary="Relay synchronizes data from internal systems and third-party APIs into Inferal. I built the capability from its initial architecture through a working product foundation."
      links={[
        { label: "Inferal experience", href: "/work/inferal" },
        {
          label: "Public product context",
          href: "https://inferal.com/blog/palantir-for-the-rest-of-us/",
        },
      ]}
    >
      <h2>The problem</h2>
      <p>
        A system cannot reason about operational data it does not have. That data often lives behind
        unrelated third-party APIs, with different resource models, pagination rules, versioning
        policies, and operational limits. Relay exists to make those sources available inside
        Inferal with a model the rest of the product can understand.
      </p>

      <h2>Building the foundation</h2>
      <p>
        Building Relay from the ground up meant defining boundaries as well as implementing them:
        where provider-specific behavior should stop, how synchronized resources should be
        represented, and how the ingestion path should connect to Inferal's ontology and engine
        layers.
      </p>
      <p>
        Those boundaries matter because connector code grows quickly. Without a stable internal
        model, every new provider leaks its assumptions into the product and makes later behavior
        harder to reason about.
      </p>

      <h2>The engineering pressures</h2>
      <p>A synchronization system has to account for conditions the happy path hides:</p>
      <ul>
        <li>Remote APIs change shape and behavior across versions.</li>
        <li>Requests are paginated, rate-limited, interrupted, or partially successful.</li>
        <li>The same resource may be observed more than once or arrive out of order.</li>
        <li>Freshness has to be balanced against provider limits and operating cost.</li>
        <li>External schemas need a durable representation inside the receiving system.</li>
      </ul>
      <p>
        The public account deliberately describes these design pressures rather than proprietary
        implementation details. The relevant evidence is the ownership of the system boundary and
        its connection to the larger product architecture.
      </p>

      <h2>Why this work is foundational</h2>
      <p>
        Relay is not a standalone importer. It is the path between external operational data, the
        ontologies that describe its meaning, and the engine that uses it. Decisions made at that
        boundary determine how safely the product can add sources, evolve schemas, and reason about
        synchronized state later.
      </p>
    </CaseStudyLayout>
  );
}
