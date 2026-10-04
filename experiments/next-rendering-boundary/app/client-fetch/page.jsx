import ClientFetchedArchive from "../../components/ClientFetchedArchive";
import { RECORD_COUNT } from "../../lib/records";

export default function ClientFetchPage() {
  return (
    <main>
      <nav>
        <a href="/">All cases</a>
      </nav>
      <h1>Client-fetched archive</h1>
      <p className="summary">
        The initial document contains a shell; {RECORD_COUNT} records arrive as JSON after
        hydration.
      </p>
      <ClientFetchedArchive />
    </main>
  );
}
