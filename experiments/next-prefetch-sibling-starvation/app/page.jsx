import { Suspense } from "react";
import { PrefetchHarness } from "../components/PrefetchHarness";

export default function Home() {
  return (
    <main>
      <h1>PERF-046 sibling prefetch fixture</h1>
      <Suspense fallback={<p>Loading fixture…</p>}>
        <PrefetchHarness />
      </Suspense>
    </main>
  );
}
