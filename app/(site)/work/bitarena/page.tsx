import CaseStudyLayout from "@/components/CaseStudyLayout";
import { genPageMetadata } from "app/seo";

export const metadata = genPageMetadata({
  title: "Bitarena: Systems Design in Rust",
  description:
    "The design, invariants, validation, performance model, and tradeoffs behind Mehdi Akiki's Bitarena Rust crate.",
});

export default function BitarenaCaseStudy() {
  return (
    <CaseStudyLayout
      eyebrow="Original systems work"
      title="Bitarena: designing for sparse iteration"
      summary="A bitset-accelerated generational arena for stable handles, designed around a specific workload rather than a claim to be the best representation for every case."
      links={[
        { label: "Repository", href: "https://github.com/mehdiakiki/bitarena" },
        {
          label: "Design and invariants",
          href: "https://github.com/mehdiakiki/bitarena/blob/main/DESIGN.md",
        },
        {
          label: "Benchmarks",
          href: "https://github.com/mehdiakiki/bitarena/blob/main/BENCHMARKS.md",
        },
      ]}
    >
      <h2>The workload</h2>
      <p>
        Generational arenas provide stable handles while detecting stale references after removal.
        The tradeoff appears when a long-lived table becomes sparse: straightforward iteration still
        visits the holes, even when only a small part of the allocated space is live.
      </p>

      <h2>The design</h2>
      <p>
        Bitarena pairs generational slots with occupancy bitsets. Iteration can inspect a machine
        word of occupancy information at a time and skip empty blocks rather than checking every
        slot individually. Handles retain a slot and generation so a removed value cannot be
        accessed through an older index.
      </p>

      <h2>Correctness is part of the data structure</h2>
      <p>
        The repository documents the invariants instead of leaving them implicit. Unit tests cover
        expected behavior, property tests compare operations against an oracle, and Miri exercises
        the implementation for undefined behavior. The crate supports <code>no_std</code> with
        <code>alloc</code>, with optional Serde and Rayon integrations.
      </p>

      <h2>Performance without universal claims</h2>
      <p>
        The benchmark suite compares Bitarena with other arena and slot-map representations across
        sparse and dense workloads, different value sizes, and common operations. Results are kept
        with their reproduction instructions because a data structure only “wins” relative to a
        workload and measurement setup.
      </p>

      <h2>Where it fits—and where it does not</h2>
      <p>
        Bitarena is designed for long-lived tables that accumulate holes and are swept repeatedly. A
        dense packed representation remains a better fit when iteration dominates, mutations are
        rare, or ordering requirements conflict with arena semantics. Stating that boundary is part
        of the design, not a limitation to hide.
      </p>
    </CaseStudyLayout>
  );
}
