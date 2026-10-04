import { visit } from "unist-util-visit";

function headingNodes(tree) {
  const headings = [];

  visit(tree, "heading", (node) => {
    headings.push(node);
  });
  headings.sort((left, right) => left.position.start.offset - right.position.start.offset);

  return headings;
}

export function findHeadingOrderViolations(tree, { initialDepth = 1 } = {}) {
  const violations = [];
  let previousDepth = initialDepth;

  for (const heading of headingNodes(tree)) {
    if (heading.depth > previousDepth + 1) {
      violations.push({
        line: heading.position.start.line,
        from: previousDepth,
        to: heading.depth,
      });
    }
    previousDepth = heading.depth;
  }

  return violations;
}

export function normalizeHeadingOrder(tree, { initialDepth = 1 } = {}) {
  const headings = headingNodes(tree);
  const hierarchy = [{ sourceDepth: initialDepth, normalizedDepth: initialDepth }];
  let normalizedHeadings = 0;

  for (const heading of headings) {
    const sourceDepth = heading.depth;

    while (hierarchy.at(-1).sourceDepth > sourceDepth) hierarchy.pop();

    let normalizedDepth;
    if (hierarchy.at(-1).sourceDepth === sourceDepth) {
      normalizedDepth = hierarchy.at(-1).normalizedDepth;
    } else {
      normalizedDepth = Math.min(hierarchy.at(-1).normalizedDepth + 1, 6);
      hierarchy.push({ sourceDepth, normalizedDepth });
    }

    if (heading.depth !== normalizedDepth) {
      heading.depth = normalizedDepth;
      normalizedHeadings += 1;
    }
  }

  return { headingsScanned: headings.length, normalizedHeadings };
}

export default function remarkNormalizeHeadingOrder(options = {}) {
  return (tree) => {
    normalizeHeadingOrder(tree, options);
  };
}
