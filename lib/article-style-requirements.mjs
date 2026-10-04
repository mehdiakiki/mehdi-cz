/**
 * Detect the class markers emitted by the configured rehype plugins in the
 * compiled MDX program. Looking at compiled output keeps stylesheet delivery
 * aligned with what the browser will actually render.
 */
export function articleStyleRequirements(compiledMdx) {
  const code = typeof compiledMdx === "string" ? compiledMdx : "";

  return {
    prism: code.includes('className:"language-') && code.includes("code-highlight"),
    katex: code.includes('className:"katex"'),
  };
}
