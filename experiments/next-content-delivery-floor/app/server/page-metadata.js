import { readSnapshot } from "../../lib/snapshots";

export function metadataFor(page) {
  const links = readSnapshot(page).linkMetadata;
  const alternateTypes = {};
  for (const alternate of links.alternates) {
    alternateTypes[alternate.type] ||= [];
    alternateTypes[alternate.type].push({
      url: alternate.href,
      title: alternate.title,
    });
  }
  return {
    alternates: {
      canonical: links.canonical,
      types: alternateTypes,
    },
    icons: {
      icon: links.icons,
      apple: links.appleTouchIcons,
    },
    manifest: links.manifest,
  };
}

