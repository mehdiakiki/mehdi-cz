import CaseStudyLayout from "@/components/CaseStudyLayout";
import Link from "@/components/Link";
import {
  experimentsBaseUrl,
  labInvestigations,
  labUpstream,
  labWall,
  upstreamDraftsUrl,
  type LabEvidence,
  type LabOutcome,
} from "@/data/siteLab";
import { genPageMetadata } from "app/seo";

export const metadata = genPageMetadata({
  title: "This Site as an Engineering Laboratory",
  description:
    "More than fifty performance experiments on this site: what changed, what was rejected even when a headline metric improved, what was found in Next.js and Chrome DevTools, and why I stopped.",
});

const outcomeLabels: Record<LabOutcome, string> = {
  kept: "Kept",
  rejected: "Rejected",
  "lab-only": "Lab only",
  upstream: "Upstream",
};

const outcomeStyles: Record<LabOutcome, string> = {
  kept: "border-emerald-300 text-emerald-800 dark:border-emerald-800 dark:text-emerald-300",
  rejected: "border-rose-300 text-rose-800 dark:border-rose-800 dark:text-rose-300",
  "lab-only": "border-amber-300 text-amber-800 dark:border-amber-800 dark:text-amber-300",
  upstream: "border-sky-300 text-sky-800 dark:border-sky-800 dark:text-sky-300",
};

function OutcomeBadges({ outcomes }: { outcomes: LabOutcome[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {outcomes.map((outcome) => (
        <span
          key={outcome}
          className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${outcomeStyles[outcome]}`}
        >
          {outcomeLabels[outcome]}
        </span>
      ))}
    </div>
  );
}

function Evidence({ evidence }: { evidence: LabEvidence }) {
  if (evidence.kind === "historical") {
    return (
      <span>
        Single historical measurement: byte counts are deterministic, timings come from one trace,
        and the raw trace was not kept.{evidence.note ? ` ${evidence.note}` : ""}
      </span>
    );
  }

  return (
    <span>
      {evidence.folders.map((folder, index) => (
        <span key={folder}>
          {index > 0 && ", "}
          <Link href={`${experimentsBaseUrl}/${folder}`}>
            <code>{folder}</code>
          </Link>
        </span>
      ))}
      {evidence.note ? `. ${evidence.note}` : ""}
    </span>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-4">
      <dt className="text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
        {label}
      </dt>
      <dd className="leading-7 text-gray-700 dark:text-gray-300">{children}</dd>
    </div>
  );
}

export default function SitePerformanceLab() {
  return (
    <CaseStudyLayout
      eyebrow="Investigation"
      title="This site as an engineering laboratory"
      summary="I started with one question: why is a mostly static site this heavy? I kept going until my intuition was not reliable any more. Several of the most promising ideas lost, a few problems turned out to live in the framework and the browser, and I stopped when six experiments planned in advance all failed their own gates."
      links={[
        { label: "Experiment folders", href: experimentsBaseUrl },
        { label: "Upstream drafts", href: upstreamDraftsUrl },
      ]}
    >
      <h2>How to read this page</h2>
      <p>
        Every investigation below separates four things, because they are easy to mix up and the
        mix-up is where most performance claims go wrong.
      </p>
      <ul>
        <li>
          <strong>Result</strong>: what changed on this site, or that nothing changed.
        </li>
        <li>
          <strong>Experiment</strong>: the protocol, scripts and raw data. Early work only kept
          single traces, and it is labelled that way.
        </li>
        <li>
          <strong>Conclusion</strong>: the decision rule I took away from it.
        </li>
        <li>
          <strong>Upstream</strong>: something found below my application, in Next.js, Chrome
          DevTools or a library, with my exact role and whether it is submitted.
        </li>
      </ul>
      <p>
        All timings are lab measurements. The analytics on the live site does not collect
        performance data yet, so no result here is a field result. Lab-only conclusions are marked.
      </p>

      <h2>The original question</h2>
      <p>
        On September 7, 2026 the homepage of a mostly static site transferred 829,434 bytes in 17
        requests. A custom webpack setting forced every dependency into one shared vendor chunk. The
        full search index, 2.48 MB raw, was fetched at startup even if nobody opened search. The
        Rust hub and the Atlas landing page serialized hundreds of entries into single documents of
        1.45 MB and 3.29 MB. And the site shipped Web Vitals code that reported to an analytics sink
        that did not exist.
      </p>
      <p>
        So most of the cost was not in the pages. It was global work that every route paid for. That
        is why the first changes were about ownership, not about compressing assets.
      </p>

      <h2>How I measured</h2>
      <ul>
        <li>
          Production builds served locally with <code>next start</code>, never the development
          server.
        </li>
        <li>
          A fixed Chromium mobile profile: 390 × 844 viewport, Fast 4G, 4× CPU slowdown. Bytes come
          from Resource Timing, not from build reports.
        </li>
        <li>
          Later experiments have their own folder with scripts and retained data. Where timing
          matters, runs alternate between variants in fresh browser contexts.
        </li>
        <li>
          The last experiments, PERF-050 to PERF-056, have protocols with go and no-go gates that
          were written before the run.
        </li>
        <li>
          A faster result is not accepted if it changes behavior. Screenshots, keyboard paths,
          no-JavaScript paths and back navigation are checked alongside the timings.
        </li>
        <li>Failed and excluded runs are kept and labelled, not deleted.</li>
      </ul>

      <h2>Before and after, for context</h2>
      <p>
        These numbers matter because of what they showed, not as a score. They are lab byte counts,
        which are deterministic for a given build.
      </p>
      <ul>
        <li>
          Homepage: 17 requests and 829,434 transferred bytes, down to 13 requests and 146,265 bytes
          (82.4% less) after the first four changes.
        </li>
        <li>
          Search index at startup: 2.48 MB raw, down to zero bytes until someone opens search.
        </li>
        <li>
          Atlas landing page: gzip HTML 91.9% smaller and DOM 90.3% smaller, with every case still
          reachable without JavaScript.
        </li>
        <li>
          An isolated Tailwind compile: 77.2 seconds and 14.0 GiB of memory, down to 355 ms and 157
          MiB.
        </li>
      </ul>

      <h2>The layers it went through</h2>
      <p>
        The questions started in application code and kept moving down when the application could
        not explain the measurement:
      </p>
      <ol>
        <li>Application configuration and the bundler&apos;s chunking rules.</li>
        <li>React server and client boundaries, and the Flight payload they produce.</li>
        <li>The Next.js router&apos;s prefetch protocol and its task scheduler.</li>
        <li>HTML delivery: compressed prefix size, head order, HTTP revalidation.</li>
        <li>The browser image pipeline: priority, decode, raster, presentation.</li>
        <li>CSS delivery as a cache graph across a journey, not as isolated files.</li>
        <li>Tailwind&apos;s compiler inputs, and the cost of producing the site.</li>
        <li>Chrome DevTools&apos; trace model, when a warning blamed the wrong thread.</li>
        <li>HTTP compression dictionaries (RFC 9842) and font fallback metrics.</li>
      </ol>

      <h2>Investigations</h2>
      <p>
        Grouped by mechanism, not by date. PERF numbers refer to the experiment log; the folders
        hold the protocols and data.
      </p>
      <div className="not-prose mt-8 space-y-6">
        {labInvestigations.map((investigation) => (
          <section
            key={investigation.id}
            id={investigation.id}
            className="scroll-mt-8 rounded-lg border border-gray-200 p-5 md:p-6 dark:border-gray-800"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-xl font-bold tracking-tight text-gray-950 dark:text-gray-100">
                  {investigation.title}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {investigation.perf}
                </p>
              </div>
              <OutcomeBadges outcomes={investigation.outcomes} />
            </div>
            <dl className="mt-5 space-y-4">
              <Row label="Result">{investigation.result}</Row>
              <Row label="Conclusion">{investigation.conclusion}</Row>
              <Row label="Experiment">
                <Evidence evidence={investigation.evidence} />
              </Row>
              {investigation.upstream && <Row label="Upstream">{investigation.upstream}</Row>}
            </dl>
          </section>
        ))}
      </div>

      <h2>The wall: six planned experiments, stopped by their own gates</h2>
      <p>
        After the first fifty experiments I chose the next candidates in advance and wrote the gates
        before running them. All six stopped.
      </p>
      <div className="not-prose mt-6 overflow-x-auto">
        <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-gray-300 text-gray-500 dark:border-gray-700 dark:text-gray-400">
              <th className="py-2 pr-4 font-semibold">Experiment</th>
              <th className="py-2 pr-4 font-semibold">Gate set in advance</th>
              <th className="py-2 font-semibold">What happened</th>
            </tr>
          </thead>
          <tbody>
            {labWall.map((entry) => (
              <tr
                key={entry.perf}
                className="border-b border-gray-200 align-top dark:border-gray-800"
              >
                <td className="py-3 pr-4">
                  <div className="font-semibold text-gray-950 dark:text-gray-100">{entry.idea}</div>
                  <div className="mt-1 text-gray-500 dark:text-gray-400">
                    {entry.folder ? (
                      <Link href={`${experimentsBaseUrl}/${entry.folder}`}>{entry.perf}</Link>
                    ) : (
                      entry.perf
                    )}
                  </div>
                </td>
                <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">{entry.gate}</td>
                <td className="py-3 text-gray-700 dark:text-gray-300">{entry.outcome}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Why I stopped there</h2>
      <p>
        I did not stop because I ran out of ideas. There is still a queue. I stopped because each
        remaining idea could only win under conditions I cannot show exist yet: reading sessions
        longer than three pages for dictionaries, an edge path with room for Early Hints, a smaller
        shared CSS core, or field data showing that a cold font shift of at most 0.0023 matters.
      </p>
      <p>
        The gates were written before the runs, so I could not move them after seeing the numbers.
        And the CSS work had already shown the trap: inlining all CSS improved cold LCP by 372 to
        480 ms, and it was still the worse system once reloads, the full journey and the build were
        measured. Shipping a change like that only because one metric looks better is the decision I
        wanted to avoid.
      </p>

      <h2>Upstream</h2>
      <p>
        Some problems were not in my code. The roles below are exact: finding a bug is different
        from validating a fix someone else already wrote. None of these is submitted yet.
      </p>
      <div className="not-prose mt-6 overflow-x-auto">
        <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-gray-300 text-gray-500 dark:border-gray-700 dark:text-gray-400">
              <th className="py-2 pr-4 font-semibold">Finding</th>
              <th className="py-2 pr-4 font-semibold">Layer</th>
              <th className="py-2 pr-4 font-semibold">My role</th>
              <th className="py-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {labUpstream.map((entry) => (
              <tr
                key={entry.item}
                className="border-b border-gray-200 align-top dark:border-gray-800"
              >
                <td className="py-3 pr-4 font-semibold text-gray-950 dark:text-gray-100">
                  {entry.href ? <Link href={entry.href}>{entry.item}</Link> : entry.item}
                </td>
                <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">{entry.layer}</td>
                <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">{entry.role}</td>
                <td className="py-3 text-gray-700 dark:text-gray-300">{entry.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>What is not here yet</h2>
      <ul>
        <li>
          Field data. Every timing above is from the lab until real-user LCP, INP and CLS are
          collected.
        </li>
        <li>
          Raw data for the early experiments. Some of them will be measured again against the
          version of the site from before this work.
        </li>
        <li>
          RSC-aware edge caching (PERF-012) was planned but never run, so there is no result to
          report.
        </li>
        <li>Separate write-ups for each investigation. They will be linked from here.</li>
      </ul>
    </CaseStudyLayout>
  );
}
