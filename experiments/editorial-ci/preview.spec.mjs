import assert from "node:assert/strict";
import { expect, test } from "@playwright/test";

const expectedRows = ["Row 19 duplicates row 7", "Row 23 duplicates row 7"];

async function loadPreview(page, { delayMs, broken }) {
  await page.setContent(`<button>Preview import</button><p data-testid="import-status">Waiting</p><ul></ul>`);
  await page.evaluate(({ delayMs, broken }) => {
    document.querySelector("button").addEventListener("click", () => {
      document.querySelector('[data-testid="import-status"]').textContent = "Working";
      setTimeout(() => {
        const messages = ["Row 19 duplicates row 7", `Row 23 duplicates row ${broken ? 19 : 7}`];
        for (const message of messages) {
          const row = document.createElement("li");
          row.dataset.testid = "duplicate-row";
          row.textContent = message;
          document.querySelector("ul").append(row);
        }
        document.querySelector('[data-testid="import-status"]').textContent = "Preview ready";
      }, delayMs);
    }, { once: true });
  }, { delayMs, broken });
}

test("a delayed preview preserves both row references without a test sleep", async ({ page }) => {
  await loadPreview(page, { delayMs: 700, broken: false });
  await page.getByRole("button", { name: "Preview import" }).click();
  await expect(page.getByTestId("import-status")).toHaveText("Preview ready");
  await expect(page.getByTestId("duplicate-row")).toHaveText(expectedRows);
});

test("a preview with two warnings but the wrong reference is rejected", async ({ page }) => {
  await loadPreview(page, { delayMs: 0, broken: true });
  await page.getByRole("button", { name: "Preview import" }).click();
  await expect(page.getByTestId("import-status")).toHaveText("Preview ready");
  await expect(page.getByTestId("duplicate-row")).toHaveCount(2);
  await expect(page.getByTestId("duplicate-row")).toHaveText([expectedRows[0], "Row 23 duplicates row 19"]);
  await assert.rejects(() => expect(page.getByTestId("duplicate-row")).toHaveText(expectedRows, { timeout: 250 }));
});
