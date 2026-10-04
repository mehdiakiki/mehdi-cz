"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

import type CodePlaygroundComponent from "@/components/CodePlayground";

type CodePlaygroundProps = ComponentProps<typeof CodePlaygroundComponent>;

const CodePlayground = dynamic(() => import("@/components/CodePlayground"), { ssr: false });

export default function ClientOnlyCodePlayground(props: CodePlaygroundProps) {
  return <CodePlayground {...props} />;
}
