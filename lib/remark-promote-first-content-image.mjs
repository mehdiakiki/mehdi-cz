import { visit } from "unist-util-visit";

function setAttribute(node, name, value) {
  const existing = node.attributes.find(
    (attribute) => attribute.type === "mdxJsxAttribute" && attribute.name === name
  );
  if (existing) existing.value = value;
  else node.attributes.push({ type: "mdxJsxAttribute", name, value });
}

function getStringAttribute(node, name) {
  return node.attributes.find(
    (attribute) =>
      attribute.type === "mdxJsxAttribute" &&
      attribute.name === name &&
      typeof attribute.value === "string"
  )?.value;
}

export function remarkPromoteFirstContentImage({ preloadMediaBySrc = {} } = {}) {
  return (tree) => {
    let promoted = false;

    visit(tree, "mdxJsxFlowElement", (node) => {
      if (promoted || node.name !== "Image") return;

      node.attributes ||= [];
      setAttribute(node, "loading", "lazy");
      setAttribute(node, "fetchPriority", "high");
      const preloadMedia = preloadMediaBySrc[getStringAttribute(node, "src")];
      if (preloadMedia) setAttribute(node, "preloadMedia", preloadMedia);
      promoted = true;
    });
  };
}
