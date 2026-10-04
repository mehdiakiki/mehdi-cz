import CaseStudyLayout from "@/components/CaseStudyLayout";
import { genPageMetadata } from "app/seo";

export const metadata = genPageMetadata({
  title: "MonitorMe: Product and Client Engineering",
  description:
    "How Mehdi Akiki founded MonitorMe as an open-source observability framework and delivered it into client environments.",
});

export default function MonitorMeCaseStudy() {
  return (
    <CaseStudyLayout
      eyebrow="Founder experience"
      title="Building MonitorMe as a product and a client system"
      summary="I founded MonitorMe as an open-source observability framework, designed its architecture end to end, and installed and configured it for several client environments."
      links={[
        {
          label: "Inspect the framework",
          href: "https://github.com/mehdiakiki/monitorme",
        },
      ]}
    >
      <h2>The product direction</h2>
      <p>
        MonitorMe brings backend traces and browser session replay into one debugging workflow. The
        goal is to help an engineer move from a visible user failure to the relevant backend
        behavior without reconstructing the incident from disconnected tools.
      </p>

      <h2>Owning the system end to end</h2>
      <p>
        I designed the product across telemetry ingestion, backend services, trace and metric
        storage, a real-time dashboard, and browser session replay. That scope required the data
        path and the product experience to evolve together: what the interface can explain depends
        on what the instrumentation captures and how the backend models it.
      </p>

      <h2>From framework to client environment</h2>
      <p>
        MonitorMe was not only published as source code. I installed and configured it for several
        clients through consulting engagements. Each environment brought its own services,
        deployment constraints, telemetry conventions, and operational expectations.
      </p>
      <p>
        That work shifted the engineering question from “does the framework run?” to “can a team
        integrate it, trust the data it captures, operate it, and use it when a production incident
        occurs?”
      </p>

      <h2>Founder scope</h2>
      <p>
        Building MonitorMe in the direction of a startup combined product definition, architecture,
        implementation, deployment, and direct client work. The open-source framework is part of the
        evidence; the larger story is carrying the product into real environments and being
        responsible for the result.
      </p>
    </CaseStudyLayout>
  );
}
