import CaseStudyLayout from "@/components/CaseStudyLayout";
import { genPageMetadata } from "app/seo";

export const metadata = genPageMetadata({
  title: "Changing What Goes Inside a Rust rlib",
  description:
    "Five merged Rust compiler changes, explained step by step: what an rlib contains, why link-time metadata belongs separately, and what review changed.",
  alternates: { canonical: "/work/rustc-late-metadata" },
  authors: [{ name: "Mehdi Akiki", url: "https://www.mehdi.cz" }],
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
    state: "Merged October 17, 2026",
    title: "Fix rmeta-link metadata not being read on AIX",
    detail:
      "Passes the existing AIX target flag to the shared reader, so it uses the XCOFF metadata reader on the paths that need it. The change merged, but I did not run it on AIX hardware and the PR reported no AIX CI runner.",
  },
];

export default function RustcLateMetadataCaseStudy() {
  return (
    <CaseStudyLayout
      eyebrow="Upstream work · rust-lang/rust"
      title="Changing what goes inside a Rust rlib"
      summary="Building a Rust program has two different jobs: understand the code, then join the compiled pieces into a program. A Rust library stores information for both. I worked on five merged compiler changes that put link-time details in their own part of the library, replace a guess based on file names, and fix a reader that handled AIX differently."
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
      <p className="text-sm text-gray-500 dark:text-gray-400">
        By Mehdi Akiki. Pull request status checked October 31, 2026.
      </p>
      <h2>First, what is an rlib?</h2>
      <p>
        An <code>rlib</code> is a Rust library file. Think of it as a box containing smaller files.
        The compiler needs some of those files to understand a library&apos;s types and functions.
        Later, it needs others to build the final executable.
      </p>
      <p>
        The second step is called <strong>linking</strong>: joining compiled code and its
        dependencies into the result you run. The linker does not need every fact that helped the
        compiler check your Rust code. The compiler does not need every link-time detail while
        checking the next crate.
      </p>
      <p>
        My changes make that boundary clearer. They do not change how you write a function or add a
        new Rust language feature.
      </p>
      <p>
        A crate is one unit of Rust code being compiled, such as a library. Metadata describes that
        code, including its types and functions. An archive member is one file inside the archive.
      </p>

      <div className="not-prose my-8 overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm leading-6">
          <caption className="mb-3 text-left font-semibold">
            A simplified view of a Rust library
          </caption>
          <thead>
            <tr className="border-b border-gray-300 dark:border-gray-700">
              <th className="p-3">Part of the archive</th>
              <th className="p-3">What it tells the compiler</th>
              <th className="p-3">When it is needed</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-200 dark:border-gray-800">
              <td className="p-3">
                <code>lib.rmeta</code>
              </td>
              <td className="p-3">Information about the crate&apos;s Rust code</td>
              <td className="p-3">While compiling code that uses the crate</td>
            </tr>
            <tr className="border-b border-gray-200 dark:border-gray-800">
              <td className="p-3">
                <code>lib.rmeta-link</code>
              </td>
              <td className="p-3">Which objects came from Rust, and link-only library filenames</td>
              <td className="p-3">While linking</td>
            </tr>
            <tr>
              <td className="p-3">Object files and bundled native libraries</td>
              <td className="p-3">The compiled code that will be joined together</td>
              <td className="p-3">While linking</td>
            </tr>
          </tbody>
        </table>
      </div>

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

      <h2>Why a filename was not enough</h2>
      <p>
        A filename is a label, not proof of where the code came from. Rust-generated object files
        used a particular ending, <code>.rcgu.o</code>. A bundled native library could also contain
        a file with that ending.
      </p>
      <p>
        The first change records the Rust object members explicitly in <code>lib.rmeta-link</code>.
        Code doing link-time optimization can read that list instead of guessing. Link-time
        optimization, or LTO, lets the compiler optimize across compiled pieces before it finishes
        the program.
      </p>
      <p>
        In plain terms, the archive now carries a list written by the component that knows which
        objects it produced. The reader uses that list. The old filename check was removed in{" "}
        <a href="https://github.com/rust-lang/rust/pull/154861">the merged change</a>.
      </p>

      <h2>Moving the information also meant moving its reader</h2>
      <p>
        A later change moved the filenames of bundled native libraries out of the ordinary crate
        metadata. A native library here is compiled code from outside Rust, such as a C library.
        Rust still needs to know about these libraries. The change moves the filenames needed for
        linking; it does not remove all native-library information from crate metadata.
      </p>
      <p>
        Putting the field in a new file would not help much if the early metadata loader immediately
        read it back. Review asked for the field to leave that loader entirely. The linking code
        reads it when needed. The filename list follows the order of the native-library list,
        because a library name alone is not a reliable key.
      </p>
      <p>
        Those decisions are visible in the reviews of{" "}
        <a href="https://github.com/rust-lang/rust/pull/156735#discussion_r3265352732">
          when to read the data
        </a>{" "}
        and{" "}
        <a href="https://github.com/rust-lang/rust/pull/156735#discussion_r3265394249">
          how to identify each library
        </a>
        .
      </p>

      <h2>A cache with a small lifetime</h2>
      <p>
        The same library can be inspected more than once during linking. Reading and decoding its
        link-time metadata each time repeats work. <code>RmetaLinkCache</code> keeps the decoded
        result, keyed by the rlib path, for that link operation.
      </p>
      <p>
        It is not a persistent build cache shared by future builds. That short lifetime matters: a
        later build must read its own inputs. The cache became{" "}
        <a href="https://github.com/rust-lang/rust/pull/158194">a separate pull request</a> while
        the filename move was under review.
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
        The AIX follow-up merged on October 17, 2026. AIX uses the XCOFF object format. An archive
        member is a file inside the archive; a section is a region inside that file. Finding the
        right archive member is only the first step. The reader also has to find the metadata inside
        it in the way that format expects.
      </p>
      <p>
        The merged fix passes the existing <code>is_like_aix</code> target flag through the shared
        reader and the LTO paths. This reuses information the compiler already knows. It also
        removes a separate AIX path that had duplicated part of the reading logic. The{" "}
        <a href="https://github.com/rust-lang/rust/pull/161698#discussion_r3935089872">review</a>{" "}
        and <a href="https://github.com/rust-lang/rust/pull/161698/files">merged diff</a> show that
        choice.
      </p>
      <p>
        I did not test the change on AIX hardware. The pull request reported that its CI had no AIX
        runner. A merged change and a successful run on that target are different pieces of
        information, so I keep that limit explicit.
      </p>

      <h2>Review</h2>
      <p>
        The first change went through several review cycles with Vadim Petrochenkov and bjorn3
        before it merged. The later changes were reviewed by Vadim Petrochenkov. The evidence for
        everything on this page is in the pull requests and their review threads.
      </p>

      <h2>What this work establishes</h2>
      <p>
        Five changes merged: an explicit object list, link-only filenames, a per-link cache, a
        cleanup of unused work, and the AIX reader follow-up. The tracking issue covers a wider
        design; these changes do not complete every item in it.
      </p>
      <p>
        I do not claim a general build-time speedup from moving a field. Review included performance
        regressions and changes to avoid repeated work. Any performance claim needs its benchmark,
        compiler revisions, workload, and measurement conditions beside it.
      </p>
      <p>
        The useful design lesson is concrete: record a fact where it is known, read it where it is
        needed, and check every reader when the format changes. That applies to an rlib, a generated
        file, or an application cache.
      </p>
    </CaseStudyLayout>
  );
}
