import CaseStudyLayout from "@/components/CaseStudyLayout";
import { genPageMetadata } from "app/seo";

export const metadata = genPageMetadata({
  title: "Changing What Goes Inside a Rust rlib",
  description:
    "Four merged rustc pull requests that add a late, link-time metadata member to rlib archives, replace a filename heuristic in LTO, and move link-only data out of crate metadata.",
});

const pullRequests = [
  {
    number: 154861,
    state: "Merged May 5, 2026",
    title: "Add rlib digest to identify Rust object files",
    detail:
      "Adds the lib.rmeta-link archive member, which lists the members that are Rust object files. The LLVM and GCC LTO paths read it instead of guessing from file names. Rlibs built by older compilers fall back to the old behavior.",
  },
  {
    number: 158194,
    state: "Merged June 28, 2026",
    title: "RmetaLinkCache",
    detail:
      "A per-link cache keyed by path, so each rlib's lib.rmeta-link member is decoded at most once per link. It was split out of the review discussion of the next change.",
  },
  {
    number: 156735,
    state: "Merged July 11, 2026",
    title: "Move NativeLib::filename to the rmeta-link archive member",
    detail:
      "The filename of a bundled native library is only needed at link time, so it moved out of the crate metadata. It is stored as (name, filename) pairs and patched back on decode. This changes the metadata format, so METADATA_VERSION went from 10 to 11. Includes a round-trip test.",
  },
  {
    number: 159571,
    state: "Merged July 20, 2026",
    title: "Remove unused bundled library lookup for the local crate",
    detail:
      "After the previous change, one branch computed bundled library filenames for the local crate that nothing read. Cleanup only, no change in behavior.",
  },
  {
    number: 161698,
    state: "Open, waiting on author",
    title: "Fix rmeta-link metadata not being read on AIX",
    detail:
      "On XCOFF the payload is written to the .info section, but the reader always looked for the named section. The fix checks the format the same way the writer does. It is not tested on AIX: CI has no AIX runner and I do not have access to a machine.",
  },
];

export default function RustcLateMetadataCaseStudy() {
  return (
    <CaseStudyLayout
      eyebrow="Upstream work · rust-lang/rust"
      title="Changing what goes inside a Rust rlib"
      summary="A Rust library is an archive that the compiler reads at two different times: early, to compile the crates that depend on it, and late, when it links the final binary. Some information was only needed at link time but lived with the early metadata, and some was guessed from file names. I worked on a series of compiler changes that move it into a new archive member written last and read only when linking."
      links={[
        {
          label: "Tracking issue #138243",
          href: "https://github.com/rust-lang/rust/issues/138243",
        },
        {
          label: "First pull request",
          href: "https://github.com/rust-lang/rust/pull/154861",
        },
      ]}
    >
      <h2>The problem</h2>
      <p>
        An rlib is an <code>ar</code> archive. It contains the crate metadata that other crates
        compile against, the object files produced by code generation, and sometimes native
        libraries bundled into it. The metadata is built early, before the rest of the archive
        exists.
      </p>
      <p>
        That timing creates two problems. Facts that only matter to the linker, like the filenames
        of bundled native libraries, still had to be computed and decoded with the early metadata.
        And when rustc needed to know which archive members are Rust object files during LTO, it
        used a heuristic on the member name, <code>looks_like_rust_object_file</code>.
      </p>
      <p>
        The tracking issue, opened by Vadim Petrochenkov, proposed one more member: a late metadata
        file added at the very end, when all other members are already in the archive, and read only
        when rustc links the rlib into something.
      </p>

      <h2>How far down it went</h2>
      <p>
        This work sits in the compiler backend and the metadata format, not in language features:
        the archive writer and reader in <code>rustc_codegen_ssa</code>, the LTO paths of both the
        LLVM and GCC backends, native library handling in <code>rustc_metadata</code>, and the
        object file section layout on different platforms.
      </p>

      <h2>The changes</h2>
      <div className="not-prose mt-6 space-y-5">
        {pullRequests.map((pr) => (
          <section
            key={pr.number}
            className="rounded-lg border border-gray-200 p-5 dark:border-gray-800"
          >
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
              <h3 className="text-lg font-bold text-gray-950 dark:text-gray-100">
                <a
                  href={`https://github.com/rust-lang/rust/pull/${pr.number}`}
                  className="hover:text-primary-600 dark:hover:text-primary-400"
                >
                  #{pr.number} · {pr.title}
                </a>
              </h3>
              <span className="shrink-0 text-sm text-gray-500 dark:text-gray-400">{pr.state}</span>
            </div>
            <p className="mt-3 leading-7 text-gray-700 dark:text-gray-300">{pr.detail}</p>
          </section>
        ))}
      </div>

      <h2>Decisions that mattered</h2>
      <ul>
        <li>
          <strong>Keep old rlibs working.</strong> Archives built by older compilers do not have the
          new member, so the filename heuristic stays as a fallback instead of breaking links that
          mix artifacts from different compiler versions.
        </li>
        <li>
          <strong>Make the format change explicit.</strong> Moving data out of the crate metadata
          changes what an old reader would find, so the metadata version was bumped.
        </li>
        <li>
          <strong>Decode once.</strong> Once the native library filenames moved to link time, every
          rlib member could be read repeatedly during one link. The path-keyed cache makes that a
          single decode.
        </li>
      </ul>

      <h2>Review</h2>
      <p>
        The first change went through several rounds of review with Vadim Petrochenkov and bjorn3
        before it merged. The later changes were reviewed by Vadim Petrochenkov. The evidence for
        everything on this page is in the pull requests themselves.
      </p>

      <h2>What is next</h2>
      <p>
        A longer technical write-up of this series is planned: the archive layout, why the filename
        heuristic existed, and what the review changed.
      </p>
    </CaseStudyLayout>
  );
}
