"use client";

import dynamic from "next/dynamic";

const FullEditor = dynamic(() => import("@/components/FullEditor"), { ssr: false });

export default function ClientOnlyFullEditor() {
  return <FullEditor />;
}
