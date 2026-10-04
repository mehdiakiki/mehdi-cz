import "../../../generated-css/base.css";
import { RenderSnapshot } from "../../../lib/render-snapshot";
import { readSnapshot } from "../../../lib/snapshots";
import { metadataFor } from "../page-metadata";

export function generateMetadata() {
  return metadataFor("home");
}

export default function ServerHome() {
  return <RenderSnapshot snapshot={readSnapshot("home")} />;
}

