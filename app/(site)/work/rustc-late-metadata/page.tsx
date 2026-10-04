import CaseStudyLayout from "@/components/CaseStudyLayout";
import { genPageMetadata } from "app/seo";

export const metadata = genPageMetadata({
  title: "Changing What Goes Inside a Rust rlib",
  description:
    "Four merged rustc pull requests that add a link-time metadata member to rlib archives, replace a filename heuristic, and move link-only data out of crate metadata.",
});

const pullRequests = [
  {
    number: 154861,
    state: "Merged May 5, 2026",
    title: "Add rlib digest to identify Rust object files",
    detail:
      "Adds the lib.rmeta-link archive member, which lists the members that are Rust object files. The LTO readers of the LLVM and GCC backends read it instead of looking at file names, and the filename heuristic is deleted. The member sits right after lib.rmeta.",
  },
  {
    number: 156735,
    state: "Merged July 11, 2026",
    title: "Move NativeLib::filename to the rmeta-link archive member",
    detail:
      "The filename of a bundled native library is only needed at link time, so it left the crate metadata. The member stores the filenames as a list aligned by position with the crate's native libraries, and only the linking code reads them.",
  },
  {
    number: 158194,
    state: "Merged June 28, 2026",
    title: "RmetaLinkCache",
    detail:
      "A cache for one link, keyed by rlib path, so each lib.rmeta-link member is decoded at most once. It was split out of the review of the previous change after a performance run regressed.",
  },
  {
    number: 159571,
    state: "Merged July 20, 2026",
    title: "Remove unused bundled library lookup for the local crate",
    detail:
      "After the move, one branch computed bundled library filenames for the local crate that nothing read. Cleanup only, no change in behavior.",
  },
  {
    number: 161698,
    state: "Open, waiting on author",
    title: "Fix rmeta-link metadata not being read on AIX",
    detail:
      "On XCOFF the payload is written to a different section than on other formats, and the reader did not account for it. Review asked for the target's AIX flag instead of parsing the file, and one change remains before it can merge. It is not tested on AIX: CI has no AIX runner and I do not have access to a machine.",
  },
];

export default function RustcLateMetadataCaseStudy() {
  return (
    <CaseStudyLayout
      eyebrow="Upstream work · rust-lang/rust"
      title="Changing what goes inside a Rust rlib"
      summary="A Rust library is an archive that the compiler reads at two different times: early, to compile the crates that depend on it, and late, when it links the final binary. Some facts were only needed at link time but lived in the early metadata, and some were guessed from file names. I worked on a series of compiler changes that move them into a new archive member that only the linking code reads."
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
      <h2>How I came to this</h2>
      <p>
        I came to this work by reading the current compiler code: how rustc writes an rlib, reads it
        back, and links it. That is how I found the problem and started working on it.
      </p>
      <p>
        For me, understanding Rust was more than learning Rust. It was a way to become a much better
        software engineer, interested in hard and practical problems.
      </p>

      <h2>The problem</h2>
      <p>
        An rlib is an <code>ar</code> archive. It contains the crate metadata that other crates
        compile against, the object files produced by code generation, and sometimes native
        libraries bundled into it.
      </p>
      <p>
        When rustc needed to know which members are Rust object files, for example to read them for
        LTO, it looked at the member name: a Rust object file ends in <code>.rcgu.o</code>. But a
        bundled native library can put a member with any name into the archive, including one that
        ends in <code>.rcgu.o</code>. And facts that only the linker needs, like the filenames of
        bundled native libraries, were computed and decoded with the early metadata.
      </p>
      <p>
        The tracking issue, opened by Vadim Petrochenkov, proposed one more metadata member for
        rlibs: link-time facts, read only when rustc links the rlib into something.
      </p>

      <h2>How far down it went</h2>
      <p>
        The work sits in the compiler backend and the archive format, not in language features: the
        archive writer and reader in <code>rustc_codegen_ssa</code>, the LTO readers of the LLVM and
        GCC backends, native library handling in <code>rustc_metadata</code>, and how the member is
        found in different object file formats.
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

      <h2>What review changed</h2>
      <p>
        The pull request descriptions describe the first versions. The merged code is different, and
        the differences are the interesting part.
      </p>
      <ul>
        <li>
          <strong>No fallback for old rlibs.</strong> The first version kept the filename check for
          rlibs without the new member. The reviewers pointed out that an rlib only works with the
          compiler version that wrote it, so every rlib a new compiler reads has the member. The
          heuristic was deleted.
        </li>
        <li>
          <strong>Right after the crate metadata, not at the end.</strong> The issue proposed
          writing the member last. In review it moved next to <code>lib.rmeta</code>.
        </li>
        <li>
          <strong>Read only by the linking code.</strong> My first version of the native library
          change decoded the filenames through the metadata loader and patched them back. Review
          asked for the opposite: remove the field and read the member only during linking.
        </li>
        <li>
          <strong>Position, not name, as the key.</strong> A library name is not a reliable key, so
          the filenames are stored in the same order as the crate&apos;s native libraries.
        </li>
        <li>
          <strong>No metadata format version bump.</strong> I proposed one, and review showed the
          change did not need it.
        </li>
        <li>
          <strong>A performance regression.</strong> A benchmark run regressed on a large workspace.
          The read is now skipped for crates without bundled libraries, and the cache became its own
          pull request.
        </li>
      </ul>

      <h2>Where the change went next</h2>
      <p>
        Once the member existed, other work started to use it. bjorn3 added global assembly objects
        to the list (#157051). Vadim Petrochenkov gave archive entries an explicit kind (#157263),
        which later work on hiding internal symbols in static libraries relies on, and moved native
        library search out of <code>rustc_metadata</code> (#160272), noting that the tracking issue
        was now partially implemented.
      </p>
      <p>
        Not everything in the tracking issue is done. Bundling object files into the rlib for
        link-time <code>cfg</code> has not started, and the AIX read path is still open.
      </p>

      <h2>Review</h2>
      <p>
        The first change went through several review cycles with Vadim Petrochenkov and bjorn3
        before it merged. The later changes were reviewed by Vadim Petrochenkov. The evidence for
        everything on this page is in the pull requests and their review threads.
      </p>

      <h2>What is next</h2>
      <p>
        A longer technical write-up is planned: the archive layout before and after, why the
        filename heuristic existed, and how each review comment changed the design.
      </p>
    </CaseStudyLayout>
  );
}
