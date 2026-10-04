import type { Metadata } from "next";

import ClientOnlyFullEditor from "@/components/ClientOnlyFullEditor";

export const metadata: Metadata = {
  title: "Editor",
  robots: {
    index: false,
    follow: false,
  },
};

export default function EditorPage() {
  return <ClientOnlyFullEditor />;
}
