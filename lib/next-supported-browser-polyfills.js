// URL.canParse is the only API in Next.js 16.3.4's module-polyfill bundle
// that is absent from part of the framework's default browser-support range.
if (!("canParse" in URL)) {
  URL.canParse = function canParse(url, base) {
    try {
      return Boolean(new URL(url, base));
    } catch {
      return false;
    }
  };
}
