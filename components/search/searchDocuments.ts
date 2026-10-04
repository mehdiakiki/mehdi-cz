import siteMetadata from "@/data/siteMetadata";
import { createSearchDocumentsLoader } from "../../lib/search-documents-loader.mjs";

const searchConfig = siteMetadata.search;

if (
  !searchConfig ||
  searchConfig.provider !== "kbar" ||
  !searchConfig.kbarConfig.searchDocumentsPath
) {
  throw new Error("KBar search requires a search documents path");
}

export const loadSearchDocuments = createSearchDocumentsLoader(
  searchConfig.kbarConfig.searchDocumentsPath
);
