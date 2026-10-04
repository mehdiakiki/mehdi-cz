import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { authorityOpportunities } from "../data/authority-opportunities.mjs";
import { calendarEntryForOpportunity } from "../lib/authority-schedule.mjs";

function argumentValue(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}

function tagsForCluster(cluster) {
  if (cluster === "rust-under-the-hood") {
    return ["rust", "systems-programming", "compiler-internals"];
  }
  if (cluster === "reliable-data-integrations") {
    return ["distributed-systems", "data-integration", "reliability"];
  }
  return ["ai-engineering", "system-design", "reliability"];
}

export function authorityArticleTemplate(opportunity, calendarEntry) {
  const tags = tagsForCluster(opportunity.cluster);

  return `---
title: ${JSON.stringify(opportunity.workingTitle)}
date: ${JSON.stringify(calendarEntry.scheduledFor)}
tags: ${JSON.stringify(tags)}
draft: true
reviewed: false
cluster: ${JSON.stringify(opportunity.cluster)}
campaign: "authority-2026"
opportunity: ${JSON.stringify(opportunity.id)}
summary: "TODO: replace with a specific, useful summary before review."
---

<!--
Publication is blocked until this article is validated, completed, reviewed, and approved.
Original evidence required: ${opportunity.evidencePlan}
-->

TODO: write the article around one reader problem and the promised evidence. Use concrete nouns in
headings so each section still makes sense when it is retrieved without the rest of the page.

## Short answer

TODO: answer the title's question or define its central claim in two to four direct sentences.

## The concrete problem

TODO

## The smallest useful model

TODO

## Reproducible evidence

TODO: add and verify ${opportunity.evidencePlan}.

## Failure modes and trade-offs

TODO

## What changes in production

TODO

## Verification checklist

TODO

## Primary sources

TODO: link the specifications, release notes, source code, or official documentation used to check
the article. Do not use this section as a substitute for contextual links near technical claims.
`;
}

export function scaffoldPlan(id, repositoryRoot) {
  const opportunity = authorityOpportunities.find((item) => item.id === id);
  if (!opportunity) throw new Error(`Unknown authority opportunity: ${id}`);
  if (opportunity.stage === "upgrade") {
    throw new Error(
      `${id} upgrades data/blog/${opportunity.slug}.mdx; it must not create a second URL.`
    );
  }

  const calendarEntry = calendarEntryForOpportunity(id);
  if (!calendarEntry || calendarEntry.action !== "publish") {
    throw new Error(`${id} has no publication slot`);
  }

  return {
    opportunity,
    calendarEntry,
    filePath: path.join(repositoryRoot, "data", "blog", `${opportunity.slug}.mdx`),
    source: authorityArticleTemplate(opportunity, calendarEntry),
  };
}

async function main() {
  const id = argumentValue("--id");
  if (!id) throw new Error("Pass an opportunity ID with --id, for example --id DATA-005");

  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const plan = scaffoldPlan(id, repositoryRoot);

  if (!process.argv.includes("--write")) {
    console.log(`# Dry run: ${path.relative(repositoryRoot, plan.filePath)}`);
    console.log(plan.source);
    console.log("Pass --write to create this held draft.");
    return;
  }

  await writeFile(plan.filePath, plan.source, { encoding: "utf8", flag: "wx" });
  console.log(`Created ${path.relative(repositoryRoot, plan.filePath)} as an unreviewed draft.`);
  console.log("The opportunity remains held until validation and approval are changed explicitly.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
