"use client";

import React, { useState, useEffect, useCallback } from "react";
import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-go";
// prism-javascript is bundled in Prism core

// The MDX pipeline already highlights static code blocks. Prevent Prism's
// browser auto-run from rewriting that server-rendered markup before hydration.
Prism.manual = true;

// ==============================================================
// CodePlayground — Interactive code runner for blog articles.
//
// Security model:
//   The browser POSTs code to /api/playground/execute (Next.js).
//   Next.js signs the request internally with HMAC-SHA256 and
//   proxies it to the Axum service on the private Docker network.
//   The secret never reaches the browser; /sign is not a public route.
//
// Usage:
//   import CodePlayground from "@/components/CodePlayground";
//   <CodePlayground lang="rust" />
//   <CodePlayground ids={["ex-1", "ex-2"]} initialId="ex-1" />
// ==============================================================

const API_BASE = "/api/playground";

interface Example {
  id: string;
  title: string;
  section: string;
  description: string;
  code: string;
  editable_regions: [number, number][];
  mode: string;
  expected_behavior: string;
}

interface ExecuteResult {
  success: boolean;
  stdout: string;
  stderr: string;
  cached: boolean;
}

const behaviorConfig: Record<string, { textClass: string; borderClass: string; label: string }> = {
  runtime_corruption: {
    textClass: "text-yellow-500 dark:text-yellow-400",
    borderClass: "border-yellow-500/30 dark:border-yellow-400/30",
    label: "⚠ Runtime Corruption",
  },
  compile_error: {
    textClass: "text-red-500 dark:text-red-400",
    borderClass: "border-red-500/30 dark:border-red-400/30",
    label: "✕ Compile Error",
  },
  success: {
    textClass: "text-green-600 dark:text-green-400",
    borderClass: "border-green-600/30 dark:border-green-400/30",
    label: "✓ Runs Successfully",
  },
  undefined_behavior: {
    textClass: "text-red-500 dark:text-red-400",
    borderClass: "border-red-500/30 dark:border-red-400/30",
    label: "☠ Undefined Behavior",
  },
};

// Language dot color derived from the example ID prefix.
const langDot: Record<string, string> = {
  rs_: "bg-orange-500",
  js_: "bg-yellow-400",
  go_: "bg-cyan-400",
};

function getLanguageDot(id: string): string {
  const match = Object.keys(langDot).find((prefix) => id.startsWith(prefix));
  return match ? langDot[match] : "bg-gray-400";
}

// Map example ID prefix → Prism grammar.
function getPrismGrammar(id: string): { grammar: Prism.Grammar; language: string } {
  if (id.startsWith("rs_")) return { grammar: Prism.languages.rust, language: "rust" };
  if (id.startsWith("go_")) return { grammar: Prism.languages.go, language: "go" };
  return { grammar: Prism.languages.javascript, language: "javascript" };
}

function highlight(code: string, id: string): string {
  const { grammar, language } = getPrismGrammar(id);
  return Prism.highlight(code, grammar, language);
}

interface CodePlaygroundProps {
  /** Filter examples by language. Use in MDX as: <CodePlayground lang="rust" /> */
  lang?: "rust" | "javascript" | "go";
  /** Show only specific example IDs. Use when you want a hand-picked subset. */
  ids?: string[];
  /** ID of the example to show first. Defaults to the first in the list. */
  initialId?: string;
}

export default function CodePlayground({ lang, ids, initialId }: CodePlaygroundProps) {
  const [examples, setExamples] = useState<Example[]>([]);
  const [activeExample, setActiveExample] = useState<Example | null>(null);
  const [code, setCode] = useState("");
  const [result, setResult] = useState<ExecuteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingExamples, setLoadingExamples] = useState(true);

  useEffect(() => {
    const url = lang ? `${API_BASE}/examples?lang=${lang}` : `${API_BASE}/examples`;

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("Playground backend unavailable");
        return res.json();
      })
      .then((data: Example[]) => {
        const filtered =
          ids && ids.length > 0
            ? (ids.map((id) => data.find((e) => e.id === id)).filter(Boolean) as Example[])
            : data;

        setExamples(filtered);

        const first = initialId
          ? (filtered.find((e) => e.id === initialId) ?? filtered[0])
          : filtered[0];

        if (first) {
          setActiveExample(first);
          setCode(first.code);
        }
        setLoadingExamples(false);
      })
      .catch((err) => {
        setError(`Failed to load examples: ${err.message}`);
        setLoadingExamples(false);
      });
  }, [lang, ids, initialId]);

  const selectExample = useCallback((example: Example) => {
    setActiveExample(example);
    setCode(example.code);
    setResult(null);
    setError(null);
  }, []);

  const resetCode = useCallback(() => {
    if (activeExample) {
      setCode(activeExample.code);
      setResult(null);
      setError(null);
    }
  }, [activeExample]);

  const execute = useCallback(async () => {
    if (!activeExample) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`${API_BASE}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ example_id: activeExample.id, code }),
      });

      if (res.status === 429) {
        setError("Rate limited — wait a moment and try again.");
        return;
      }
      if (res.status === 403 || res.status === 401) {
        setError("Request validation failed. Please refresh the page.");
        return;
      }
      if (!res.ok) {
        const text = await res.text();
        setError(text || `HTTP ${res.status}`);
        return;
      }

      setResult(await res.json());
    } catch (err: unknown) {
      setError(`Network error: ${err instanceof Error ? err.message : err}`);
    } finally {
      setLoading(false);
    }
  }, [activeExample, code]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        execute();
      }
    },
    [execute]
  );

  const behavior = activeExample ? (behaviorConfig[activeExample.expected_behavior] ?? null) : null;
  const isModified = activeExample && code !== activeExample.code;

  if (loadingExamples) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white px-6 py-10 text-center font-sans text-sm text-gray-500 shadow-sm dark:border-gray-700 dark:bg-gray-950 dark:text-gray-400">
        Loading playground…
      </div>
    );
  }

  if (!activeExample) {
    return (
      <div
        role="status"
        className="rounded-xl border border-gray-200 bg-white px-6 py-10 text-center font-sans text-sm text-gray-600 shadow-sm dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300"
      >
        {error ?? "No playground examples are available right now."}
      </div>
    );
  }

  return (
    <div className="not-prose max-w-full overflow-hidden rounded-xl border border-gray-200 bg-white font-sans text-gray-900 shadow-sm dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100">
      {/* Prism Night Owl-inspired token colours, scoped to this component */}
      <style>{`
        .prism-editor .token.comment,.prism-editor .token.prolog,.prism-editor .token.doctype,.prism-editor .token.cdata{color:#94a3a3;font-style:italic}
        .prism-editor .token.punctuation{color:#c792ea}
        .prism-editor .token.property,.prism-editor .token.tag,.prism-editor .token.boolean,.prism-editor .token.number,.prism-editor .token.constant,.prism-editor .token.symbol{color:#f78c6c}
        .prism-editor .token.selector,.prism-editor .token.attr-name,.prism-editor .token.string,.prism-editor .token.char,.prism-editor .token.builtin{color:#ecc48d}
        .prism-editor .token.operator,.prism-editor .token.entity,.prism-editor .token.url,.prism-editor .token.variable{color:#addb67}
        .prism-editor .token.atrule,.prism-editor .token.attr-value,.prism-editor .token.keyword{color:#c792ea}
        .prism-editor .token.function,.prism-editor .token.class-name{color:#82aaff}
        .prism-editor .token.regex,.prism-editor .token.important{color:#f07178}
        .prism-editor textarea{color:#d6deeb}
        .prism-editor pre{color:#d6deeb}
      `}</style>

      {/* ========== Example Tabs ========== */}
      <div className="flex [scrollbar-width:none] overflow-x-auto border-b border-gray-200 [-ms-overflow-style:none] dark:border-gray-700 [&::-webkit-scrollbar]:hidden">
        {examples.map((ex, i) => {
          const isActive = activeExample?.id === ex.id;
          const dot = getLanguageDot(ex.id);
          return (
            <button
              key={ex.id}
              onClick={() => selectExample(ex)}
              className={[
                "group flex items-center gap-2 border-b-2 px-4 py-3 text-[13px] whitespace-nowrap transition-all duration-150 focus:outline-none",
                isActive
                  ? "border-primary-500 bg-gray-50 font-medium text-gray-900 dark:bg-gray-900 dark:text-gray-100"
                  : "border-transparent text-gray-500 hover:bg-gray-50/50 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-900/50 dark:hover:text-gray-200",
              ].join(" ")}
            >
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot} ${isActive ? "opacity-100" : "opacity-40 group-hover:opacity-70"} transition-opacity`}
              />
              <span className="mr-0.5 font-mono text-[11px] opacity-30">
                {String(i + 1).padStart(2, "0")}
              </span>
              {ex.title}
            </button>
          );
        })}
      </div>

      {/* ========== Description Bar ========== */}
      {activeExample && (
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 bg-gray-50/50 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-900/30">
          <p className="m-0 min-w-0 flex-1 text-[13px] leading-relaxed text-gray-500 dark:text-gray-400">
            {activeExample.description}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            {isModified && (
              <span className="border-primary-200 bg-primary-50 text-primary-700 dark:border-primary-800 dark:bg-primary-900/20 dark:text-primary-300 rounded border px-2 py-0.5 text-[10px] font-semibold tracking-wide">
                MODIFIED
              </span>
            )}
            {behavior && (
              <span
                className={[
                  "rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap",
                  behavior.textClass,
                  behavior.borderClass,
                ].join(" ")}
              >
                {behavior.label}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ========== Editor + Output ========== */}
      <div className="grid min-h-[400px] grid-cols-1 md:grid-cols-2">
        {/* --- Code Editor --- */}
        <div className="flex flex-col border-b border-gray-200 md:border-r md:border-b-0 dark:border-gray-700">
          <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50/80 px-4 py-2 dark:border-gray-700 dark:bg-gray-900/50">
            <span className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase dark:text-gray-500">
              Editor
            </span>
            <div className="flex gap-1.5">
              {isModified && (
                <button
                  onClick={resetCode}
                  className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[11px] text-gray-500 transition-all hover:border-gray-300 hover:text-gray-900 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-100"
                >
                  ↺ Reset
                </button>
              )}
              <button
                onClick={execute}
                disabled={loading}
                className={[
                  "flex items-center gap-1.5 rounded-md px-3 py-1 text-[11px] font-semibold transition-all focus:outline-none",
                  loading
                    ? "cursor-wait bg-gray-100 text-gray-400 dark:bg-gray-800"
                    : "bg-primary-700 shadow-primary-500/30 hover:bg-primary-800 text-white shadow-sm active:scale-95",
                ].join(" ")}
              >
                {loading ? (
                  <>
                    <span className="inline-flex gap-0.5">
                      {[0, 150, 300].map((delay) => (
                        <span
                          key={delay}
                          className="h-1 w-1 animate-bounce rounded-full bg-gray-400"
                          style={{ animationDelay: `${delay}ms` }}
                        />
                      ))}
                    </span>
                    Running
                  </>
                ) : (
                  <>
                    <svg className="h-2.5 w-2.5 fill-current" viewBox="0 0 10 10">
                      <polygon points="0,0 10,5 0,10" />
                    </svg>
                    Run
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto bg-[#011627]">
            <Editor
              value={code}
              onValueChange={setCode}
              highlight={(c) => (activeExample ? highlight(c, activeExample.id) : c)}
              onKeyDown={handleKeyDown}
              padding={16}
              style={{
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                fontSize: 13,
                lineHeight: 1.7,
                minHeight: "100%",
                tabSize: 4,
              }}
              textareaClassName="outline-none focus:outline-none"
              className="prism-editor"
            />
          </div>

          <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50/80 px-4 py-1.5 dark:border-gray-700 dark:bg-gray-900/50">
            <span className="text-[10px] text-gray-400 dark:text-gray-500">
              <kbd className="rounded border border-gray-200 bg-white px-1 py-0.5 font-mono text-[9px] text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                Ctrl
              </kbd>
              {" + "}
              <kbd className="rounded border border-gray-200 bg-white px-1 py-0.5 font-mono text-[9px] text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                ↵
              </kbd>
              {" to run"}
            </span>
            {activeExample && (
              <span className="font-mono text-[10px] text-gray-400 dark:text-gray-500">
                {activeExample.mode} · 2021
              </span>
            )}
          </div>
        </div>

        {/* --- Output Panel --- */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50/80 px-4 py-2 dark:border-gray-700 dark:bg-gray-900/50">
            <span className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase dark:text-gray-500">
              Output
            </span>
            <div className="flex items-center gap-2">
              {/* Invisible spacer — matches Run button height so both headers stay aligned */}
              <span
                aria-hidden
                className="invisible flex items-center gap-1.5 rounded-md px-3 py-1 text-[11px] font-semibold"
              >
                <svg className="h-2.5 w-2.5" viewBox="0 0 10 10">
                  <polygon points="0,0 10,5 0,10" />
                </svg>
                Run
              </span>
              {result?.cached && (
                <span className="text-[10px] font-medium text-indigo-500 dark:text-indigo-400">
                  ● cached
                </span>
              )}
              {result && !loading && (
                <span
                  className={[
                    "rounded-full border px-1.5 py-0.5 text-[10px] font-semibold",
                    result.success
                      ? "border-green-500/30 bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                      : "border-red-500/30 bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400",
                  ].join(" ")}
                >
                  {result.success ? "✓ ok" : "✗ failed"}
                </span>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-[#011627] p-4 font-mono text-[13px] leading-[1.7] break-words whitespace-pre-wrap">
            {loading && (
              <div className="flex flex-col gap-2 text-gray-400">
                <div className="flex items-center gap-2">
                  <span className="inline-flex gap-1">
                    {[0, 150, 300].map((delay) => (
                      <span
                        key={delay}
                        className="bg-primary-400 h-1.5 w-1.5 animate-bounce rounded-full"
                        style={{ animationDelay: `${delay}ms` }}
                      />
                    ))}
                  </span>
                  <span>Compiling…</span>
                </div>
                <span className="font-sans text-[11px] text-gray-600">
                  First run may take 10–15 seconds.
                </span>
              </div>
            )}

            {error && <span className="text-red-400">{error}</span>}

            {result && !loading && (
              <>
                {result.stdout && (
                  <span className={result.success ? "text-green-400" : "text-gray-300"}>
                    {result.stdout}
                  </span>
                )}
                {result.stderr && (
                  <>
                    {result.stdout && "\n\n"}
                    <span className={result.success ? "text-yellow-400" : "text-red-400"}>
                      {result.stderr}
                    </span>
                  </>
                )}
                {!result.stdout && !result.stderr && (
                  <span className="text-gray-600">(no output)</span>
                )}
              </>
            )}

            {!loading && !error && !result && (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center select-none">
                <svg className="h-8 w-8 text-gray-700" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
                <p className="font-sans text-[12px] leading-relaxed text-gray-600">
                  Press{" "}
                  <kbd className="rounded border border-gray-700 bg-gray-800 px-1 py-0.5 font-mono text-[10px] text-gray-400">
                    Ctrl+↵
                  </kbd>{" "}
                  or click <strong className="font-semibold text-gray-400">Run</strong> to execute.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
