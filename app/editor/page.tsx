import dynamic from "next/dynamic";

const FullEditor = dynamic(() => import("@/components/FullEditor"), { ssr: false });

export default function EditorPage() {
  return <FullEditor />;
}
