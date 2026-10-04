import { authorityCalendar, validateAuthorityCalendar } from "../lib/authority-schedule.mjs";

function argumentValue(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}

const month = argumentValue("--month");
const action = argumentValue("--action");
const cluster = argumentValue("--cluster");
const asJson = process.argv.includes("--json");
const errors = validateAuthorityCalendar();

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  const entries = authorityCalendar.filter(
    (entry) =>
      (!month || entry.scheduledFor.startsWith(month)) &&
      (!action || entry.action === action) &&
      (!cluster || entry.cluster === cluster)
  );

  if (asJson) {
    console.log(JSON.stringify(entries, null, 2));
  } else {
    for (const entry of entries) {
      console.log(
        `${entry.scheduledFor} | ${entry.action.padEnd(7)} | ${entry.id} | ${entry.workingTitle}`
      );
    }
    console.log("");
    console.log(`${entries.length} of ${authorityCalendar.length} campaign actions shown.`);
  }
}
