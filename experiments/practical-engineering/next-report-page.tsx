import ReportPicker from "./ReportPicker";
import { reportHistory } from "./report-history";

export default function ReportsPage() {
  const eventCount = reportHistory.reduce((sum, row) => sum + row.events, 0);
  const options = [{ id: "weekly", label: "Weekly report" }, { id: "monthly", label: "Monthly report" }];
  return <main><h1>Reports</h1><p>{eventCount} events in the archived reports. Choose a period.</p><ReportPicker options={options} /></main>;
}
