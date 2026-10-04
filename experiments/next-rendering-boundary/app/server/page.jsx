import Archive from "../../components/Archive";
import { createRecords, RECORD_COUNT } from "../../lib/records";

export default function ServerPage() {
  const records = createRecords();

  return (
    <main>
      <nav>
        <a href="/">All cases</a>
      </nav>
      <h1>Server Component archive</h1>
      <p className="summary">All {RECORD_COUNT} records are rendered by a Server Component.</p>
      <Archive records={records} />
    </main>
  );
}
