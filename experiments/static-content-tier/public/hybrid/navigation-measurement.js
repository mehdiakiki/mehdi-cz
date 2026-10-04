const root = document.documentElement;
const navigation = performance.getEntriesByType("navigation")[0];

function updateNavigationMeasurement() {
  const firstContentfulPaint = performance
    .getEntriesByType("paint")
    .find((entry) => entry.name === "first-contentful-paint");
  const clickEpoch = Number(localStorage.getItem("perf031-click-epoch"));
  root.dataset.perf031MeasureActivationStart = String(navigation?.activationStart ?? 0);
  root.dataset.perf031MeasureFcp = String(firstContentfulPaint?.startTime ?? 0);
  root.dataset.perf031MeasureClickToFcp = String(
    firstContentfulPaint && clickEpoch
      ? performance.timeOrigin + firstContentfulPaint.startTime - clickEpoch
      : 0
  );
}

new PerformanceObserver(updateNavigationMeasurement).observe({ type: "paint", buffered: true });
document.addEventListener("prerenderingchange", updateNavigationMeasurement);
addEventListener("pageshow", updateNavigationMeasurement);
setTimeout(updateNavigationMeasurement, 250);
updateNavigationMeasurement();
