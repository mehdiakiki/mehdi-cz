import postcss from "postcss";

const customPropertyReference = /var\(\s*(--[\w-]+)/g;

function references(value) {
  const names = new Set();
  for (const match of value.matchAll(customPropertyReference)) names.add(match[1]);
  return names;
}

function addReferences(target, value) {
  let changed = false;
  for (const name of references(value)) {
    if (target.has(name)) continue;
    target.add(name);
    changed = true;
  }
  return changed;
}

function removeEmptyContainers(root) {
  let removed;
  do {
    removed = false;
    root.walk((node) => {
      if ((node.type === "rule" || node.type === "atrule") && node.nodes?.length === 0) {
        node.remove();
        removed = true;
      }
    });
  } while (removed);
}

export function pruneCriticalCss(css, html = "") {
  const root = postcss.parse(css);
  const definitions = new Map();
  const usedProperties = references(html);

  root.walkDecls((declaration) => {
    if (declaration.prop.startsWith("--")) {
      const dependencies = definitions.get(declaration.prop) || new Set();
      for (const dependency of references(declaration.value)) dependencies.add(dependency);
      definitions.set(declaration.prop, dependencies);
      return;
    }
    addReferences(usedProperties, declaration.value);
  });
  root.walkAtRules((atRule) => {
    if (atRule.name !== "property") addReferences(usedProperties, atRule.params);
  });

  let changed;
  do {
    changed = false;
    for (const name of [...usedProperties]) {
      for (const dependency of definitions.get(name) || []) {
        if (usedProperties.has(dependency)) continue;
        usedProperties.add(dependency);
        changed = true;
      }
    }
  } while (changed);

  root.walkDecls((declaration) => {
    if (declaration.prop.startsWith("--") && !usedProperties.has(declaration.prop)) declaration.remove();
  });
  root.walkAtRules("property", (atRule) => {
    const name = atRule.params.trim();
    if (!usedProperties.has(name)) atRule.remove();
  });

  const keyframes = new Map();
  root.walkAtRules((atRule) => {
    if (atRule.name.endsWith("keyframes")) keyframes.set(atRule.params.trim(), atRule);
  });
  const usedKeyframes = new Set();
  root.walkDecls((declaration) => {
    if (declaration.prop !== "animation" && declaration.prop !== "animation-name") return;
    for (const name of keyframes.keys()) {
      if (new RegExp(`(^|[^\\w-])${name.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}([^\\w-]|$)`).test(declaration.value)) {
        usedKeyframes.add(name);
      }
    }
  });
  for (const [name, atRule] of keyframes) {
    if (!usedKeyframes.has(name)) atRule.remove();
  }

  removeEmptyContainers(root);
  return { css: root.toString(), usedProperties: [...usedProperties].sort(), usedKeyframes: [...usedKeyframes].sort() };
}
