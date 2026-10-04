import { authorityOpportunities } from "../data/authority-opportunities.mjs";
import { getContentCluster } from "../data/content-clusters.mjs";

function argumentValue(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}

const cluster = argumentValue("--cluster");
const stage = argumentValue("--stage");
const subcluster = argumentValue("--subcluster");
const query = argumentValue("--query")?.toLowerCase();

const rows = authorityOpportunities.filter(
  (item) =>
    (!cluster || item.cluster === cluster) &&
    (!stage || item.stage === stage) &&
    (!subcluster || item.subcluster === subcluster) &&
    (!query || item.workingTitle.toLowerCase().includes(query))
);

for (const item of rows) {
  console.log(`${item.id} | ${getContentCluster(item.cluster)?.shortTitle} | ${item.subcluster}`);
  console.log(
    `  stage: ${item.stage}; validation: ${item.validation}; decision: ${item.publishDecision}`
  );
  console.log(`  title: ${item.workingTitle}`);
  console.log(`  evidence: ${item.evidencePlan}`);
  if (item.slug) console.log(`  source: data/blog/${item.slug}.mdx`);
  console.log("");
}

console.log(`${rows.length} of ${authorityOpportunities.length} opportunities shown.`);
