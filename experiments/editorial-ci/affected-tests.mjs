function repositoryPath(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !value.startsWith("/") &&
    !value.includes("\\") &&
    !value.split("/").some((part) => part === ".." || part === "." || part === "")
  );
}

function checkedGraph(graph) {
  if (!Array.isArray(graph) || graph.length === 0) throw new Error("missing package graph");
  const names = new Set();
  const directories = [];
  for (const node of graph) {
    if (
      !node ||
      typeof node.name !== "string" ||
      !/^[a-z][a-z0-9-]*$/.test(node.name) ||
      names.has(node.name) ||
      !repositoryPath(node.directory) ||
      !Array.isArray(node.dependencies)
    ) {
      throw new Error("invalid package graph");
    }
    if (
      directories.some(
        (directory) =>
          directory === node.directory ||
          directory.startsWith(node.directory + "/") ||
          node.directory.startsWith(directory + "/")
      )
    ) {
      throw new Error("overlapping package directories");
    }
    names.add(node.name);
    directories.push(node.directory);
  }
  for (const node of graph) {
    if (node.dependencies.some((dependency) => !names.has(dependency)))
      throw new Error("unknown dependency");
  }
  return graph;
}

export function selectAffected(graphInput, changedFiles, { fullReason } = {}) {
  const graph = checkedGraph(graphInput);
  if (!Array.isArray(changedFiles) || changedFiles.some((file) => !repositoryPath(file))) {
    throw new Error("changed files must be explicit repository-relative paths");
  }
  const all = (reason) => ({ kind: "all", reason, checks: graph.map((node) => node.name).sort() });
  if (fullReason) return all(fullReason);
  const roots = new Set();
  for (const file of changedFiles) {
    if (
      ["package.json", "yarn.lock", "package-lock.json", "tsconfig.json"].includes(file) ||
      file.startsWith(".github/")
    ) {
      return all("root configuration or lockfile changed");
    }
    const owner = graph.find(
      (node) => file === node.directory || file.startsWith(node.directory + "/")
    );
    if (!owner) return all(`unclassified path: ${file}`);
    roots.add(owner.name);
  }
  let expanded;
  do {
    expanded = false;
    for (const node of graph) {
      if (!roots.has(node.name) && node.dependencies.some((dependency) => roots.has(dependency))) {
        roots.add(node.name);
        expanded = true;
      }
    }
  } while (expanded);
  return {
    kind: roots.size ? "affected" : "none",
    reason: "declared reverse dependencies",
    checks: [...roots].sort(),
  };
}

// Inputs come from trusted workflow plumbing, not a PR-supplied success claim.
export function requiredResult({ selectorConclusion, selection, results }) {
  if (
    selectorConclusion !== "success" ||
    !selection ||
    !Array.isArray(selection.checks) ||
    !Array.isArray(results)
  )
    return false;
  if (!["all", "affected", "none"].includes(selection.kind)) return false;
  if (selection.kind === "none" ? selection.checks.length !== 0 : selection.checks.length === 0)
    return false;
  if (new Set(selection.checks).size !== selection.checks.length) return false;
  return selection.checks.every((name) => {
    const matching = results.filter((result) => result.name === name);
    return matching.length === 1 && matching[0].conclusion === "success";
  });
}
