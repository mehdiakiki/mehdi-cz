import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { DeduplicationResult } from "./types.ts";

export function renderImportPreview(result: DeduplicationResult): string {
  return renderToStaticMarkup(
    h(
      "section",
      { "aria-label": "Contact import preview" },
      h("h2", null, "Contacts to import"),
      h(
        "table",
        null,
        h(
          "thead",
          null,
          h("tr", null, h("th", null, "Source row"), h("th", null, "Email"))
        ),
        h(
          "tbody",
          null,
          ...result.unique.map((row) =>
            h(
              "tr",
              { key: row.rowNumber, "data-source-row": row.rowNumber },
              h("td", null, row.rowNumber),
              h("td", null, row.email)
            )
          )
        )
      ),
      h("h2", null, "Duplicate rows"),
      h(
        "ul",
        null,
        ...result.duplicates.map(({ rowNumber, firstRowNumber }) =>
          h(
            "li",
            { key: rowNumber },
            `Row ${rowNumber} matches row ${firstRowNumber}`
          )
        )
      )
    )
  );
}
