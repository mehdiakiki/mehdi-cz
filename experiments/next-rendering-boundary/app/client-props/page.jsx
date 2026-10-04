import ClientPropArchive from "../../components/ClientPropArchive";
import { createRecords, RECORD_COUNT } from "../../lib/records";

export default function ClientPropsPage() {
  const records = createRecords();

  return (
    <main>
      <nav>
        <a href="/">All cases</a>
      </nav>
      <h1>Client component with server props</h1>
      <p className="summary">
        All {RECORD_COUNT} records cross the Server-to-Client Component boundary as props.
      </p>
      <ClientPropArchive records={records} />
    </main>
  );
}
