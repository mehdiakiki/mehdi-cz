import CodePlayground from "@/components/CodePlayground";

export const metadata = { title: "Playground Test" };

export default function PlaygroundTestPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 space-y-12">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
        Code Playground — UI Test
      </h1>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
          All examples (default)
        </h2>
        <CodePlayground />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
          JavaScript only
        </h2>
        <CodePlayground lang="javascript" />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
          Single example, hand-picked
        </h2>
        <CodePlayground ids={["rs_01_hello"]} />
      </section>
    </div>
  );
}
