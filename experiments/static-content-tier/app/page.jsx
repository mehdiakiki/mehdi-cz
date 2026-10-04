export default function Index() {
  return (
    <main>
      <h1>PERF-030 static content tier</h1>
      <ul>
        <li>
          <a href="/hybrid/full/home">Full production CSS</a>
        </li>
        <li>
          <a href="/hybrid/pruned/home">Route-pruned CSS</a>
        </li>
        <li>
          <a href="/hybrid/shared/home">Shared-pruned CSS with document prefetch</a>
        </li>
        <li>
          <a href="/hybrid/prerender-immediate/home">Immediate intent prerender</a>
        </li>
        <li>
          <a href="/hybrid/prerender-dwell/home">Cancellable 150 ms intent dwell</a>
        </li>
      </ul>
    </main>
  );
}
