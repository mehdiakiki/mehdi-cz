import React from "react";
import { fromHtmlIsomorphic } from "hast-util-from-html-isomorphic";
import { find, hastToReact, html as htmlSchema } from "property-information";
import styleToObject from "style-to-object";

function toReactStyle(style) {
  const parsed = styleToObject(style) || {};
  return Object.fromEntries(
    Object.entries(parsed).map(([property, value]) => {
      if (property.startsWith("--")) return [property, value];
      const camel = property
        .replace(/^-ms-/, "ms-")
        .replace(/^-webkit-/, "Webkit-")
        .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
        .replace("Webkit-", "Webkit");
      return [camel, value];
    })
  );
}

function toReactProperties(properties) {
  return Object.fromEntries(
    Object.entries(properties).map(([property, value]) => {
      const name =
        /^aria[A-Z]/.test(property) || /^data[A-Z]/.test(property)
          ? find(htmlSchema, property).attribute
          : hastToReact[property] || property;

      if (name === "className" && Array.isArray(value)) {
        return [name, value.join(" ")];
      }
      if (name === "style" && typeof value === "string") {
        return [name, toReactStyle(value)];
      }
      return [name, value];
    })
  );
}

function renderNode(node, key) {
  if (node.type === "text") return node.value;
  if (node.type !== "element") return null;

  const properties = { ...toReactProperties(node.properties), key };
  const children = node.children.map((child, index) =>
    renderNode(child, `${key}.${index}`)
  );
  return React.createElement(node.tagName, properties, ...children);
}

function renderFragment(html, prefix) {
  const tree = fromHtmlIsomorphic(html, { fragment: true });
  return tree.children.map((node, index) => renderNode(node, `${prefix}.${index}`));
}

function renderHeadMetadata(html) {
  const tree = fromHtmlIsomorphic(html, { fragment: true });
  const kept = tree.children.filter((node) => {
    if (node.type !== "element") return false;
    if (node.tagName === "title") return true;
    if (node.tagName === "meta") {
      return !(
        "charSet" in node.properties || node.properties.name === "viewport"
      );
    }
    return false;
  });
  return kept.map((node, index) => renderNode(node, `head.${index}`));
}

export function RenderSnapshot({ snapshot }) {
  return (
    <>
      {renderHeadMetadata(snapshot.head)}
      {renderFragment(snapshot.body, "body")}
    </>
  );
}
