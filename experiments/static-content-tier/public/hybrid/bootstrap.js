const root = document.documentElement;
const variant = root.dataset.perf030Variant || "pruned";
const systemTheme = matchMedia("(prefers-color-scheme: dark)");

function applySystemTheme() {
  try {
    const theme = localStorage.getItem("theme");
    root.classList.toggle("dark", theme === "dark" || (theme !== "light" && systemTheme.matches));
  } catch {}
}

systemTheme.addEventListener?.("change", applySystemTheme);

for (const image of document.querySelectorAll('img[style*="background-image"]')) {
  const clearBlurPlaceholder = () => image.style.removeProperty("background-image");
  if (image.complete) clearBlurPlaceholder();
  else image.addEventListener("load", clearBlurPlaceholder, { once: true });
}

const menuButton = document.querySelector("[data-hybrid-menu-open]");
const menu = document.querySelector("[data-hybrid-menu]");
if (menuButton instanceof HTMLButtonElement && menu instanceof HTMLDialogElement) {
  menuButton.addEventListener("click", () => menu.showModal());
  menu.querySelector("[data-hybrid-menu-close]")?.addEventListener("click", () => menu.close());
  menu.addEventListener("click", (event) => {
    if (event.target === menu) menu.close();
  });
  menu.addEventListener("close", () => {
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.focus();
  });
  menu.addEventListener("cancel", () => menuButton.setAttribute("aria-expanded", "false"));
  menuButton.addEventListener("click", () => menuButton.setAttribute("aria-expanded", "true"));
}

let searchModule;
function prepareSearch() {
  searchModule ||= import("./search.js");
  return searchModule.then((module) => module.prepare());
}

const searchLink = document.querySelector("[data-hybrid-search]");
if (searchLink instanceof HTMLAnchorElement) {
  for (const eventName of ["pointerenter", "focus", "touchstart"]) {
    searchLink.addEventListener(eventName, prepareSearch, { once: true, passive: true });
  }
  searchLink.addEventListener("click", async (event) => {
    event.preventDefault();
    const module = await (searchModule ||= import("./search.js"));
    await module.openSearch(searchLink);
  });
  addEventListener("keydown", async (event) => {
    if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") return;
    event.preventDefault();
    const module = await (searchModule ||= import("./search.js"));
    await module.openSearch(searchLink);
  });
}

const newsletterBoundary = document.querySelector("[data-hybrid-newsletter]");
if (newsletterBoundary) {
  const activate = () => {
    if (newsletterBoundary.querySelector("form")) return;
    const template = newsletterBoundary.querySelector("template");
    if (template instanceof HTMLTemplateElement)
      newsletterBoundary.append(template.content.cloneNode(true));
    const form = newsletterBoundary.querySelector("form");
    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const status = form.querySelector("[role=status]");
      const button = form.querySelector("button");
      button.disabled = true;
      const response = await fetch(form.action, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: new FormData(form).get("email") }),
      });
      const result = await response.json();
      status.textContent = result.error || "Thank you!";
      status.dataset.error = result.error ? "true" : "false";
      if (result.error) button.disabled = false;
    });
  };
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        activate();
        observer.disconnect();
      },
      { rootMargin: "300px 0px" }
    );
    observer.observe(newsletterBoundary);
  } else {
    setTimeout(activate);
  }
}

const scrollControls = document.querySelector("[data-hybrid-scroll-controls]");
if (scrollControls) {
  const updateScrollControls = () => {
    scrollControls.dataset.visible = scrollY > 50 ? "true" : "false";
  };
  addEventListener("scroll", updateScrollControls, { passive: true });
  addEventListener("pageshow", updateScrollControls);
  updateScrollControls();
}

const prefetched = new Set();
function prefetchFromIntent(event) {
  const link = event.target.closest?.("a[data-prefetch-on-intent]");
  if (!link) return;
  const url = new URL(link.href, location.href);
  if (
    url.origin !== location.origin ||
    url.pathname === location.pathname ||
    prefetched.has(url.href)
  )
    return;
  prefetched.add(url.href);
  const hint = document.createElement("link");
  hint.rel = "prefetch";
  hint.href = url.href;
  hint.as = "document";
  document.head.append(hint);
}

document.addEventListener("pointerover", prefetchFromIntent, { passive: true });
document.addEventListener("focusin", prefetchFromIntent);
document.addEventListener("touchstart", prefetchFromIntent, { passive: true });

root.dataset.enhanced = "true";
root.dataset.searchVariant = variant;
