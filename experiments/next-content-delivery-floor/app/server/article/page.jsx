import "../../../generated-css/base.css";
import "../../../generated-css/article.css";
import { RenderSnapshot } from "../../../lib/render-snapshot";
import { readSnapshot } from "../../../lib/snapshots";
import { metadataFor } from "../page-metadata";

export function generateMetadata() {
  return metadataFor("article");
}

export default function ServerArticle() {
  return <RenderSnapshot snapshot={readSnapshot("article")} />;
}

