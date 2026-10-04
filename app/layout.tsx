import "css/tailwind.css";
import "remark-github-blockquote-alert/alert.css";

import RootDocument, { rootMetadata } from "./root-document";
import { ThemeProviders } from "./theme-providers";
import type { Metadata } from "next";

export const metadata: Metadata = rootMetadata;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <RootDocument>
      <ThemeProviders>{children}</ThemeProviders>
    </RootDocument>
  );
}
