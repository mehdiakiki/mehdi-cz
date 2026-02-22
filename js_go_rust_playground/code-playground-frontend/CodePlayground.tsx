"use client";

import React, { useState, useEffect, useCallback } from "react";
import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-go";
// prism-javascript is bundled in Prism core

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
      .then((res) => res.json())
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

      if (res.status === 429) { setError("Rate limited — wait a moment and try again."); return; }
      if (res.status === 403 || res.status === 401) { setError("Request validation failed. Please refresh the page."); return; }
      if (!res.ok) { const text = await res.text(); setError(text || `HTTP ${res.status}`); return; }

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
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400 font-sans shadow-sm">
        Loading playground…
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 overflow-hidden font-sans text-gray-900 dark:text-gray-100 max-w-full not-prose shadow-sm">
      {/* Prism Night Owl-inspired token colours, scoped to this component */}
      <style>{`
        .prism-editor .token.comment,.prism-editor .token.prolog,.prism-editor .token.doctype,.prism-editor .token.cdata{color:#637777;font-style:italic}
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
      <div className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-700 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {examples.map((ex, i) => {
          const isActive = activeExample?.id === ex.id;
          const dot = getLanguageDot(ex.id);
          return (
            <button
              key={ex.id}
              onClick={() => selectExample(ex)}
              className={[
                "group flex items-center gap-2 px-4 py-3 text-[13px] border-b-2 whitespace-nowrap transition-all duration-150 focus:outline-none",
                isActive
                  ? "border-primary-500 text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-900 font-medium"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50/50 dark:hover:bg-gray-900/50",
              ].join(" ")}
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot} ${isActive ? "opacity-100" : "opacity-40 group-hover:opacity-70"} transition-opacity`} />
              <span className="opacity-30 font-mono text-[11px] mr-0.5">{String(i + 1).padStart(2, "0")}</span>
              {ex.title}
            </button>
          );
        })}
      </div>

      {/* ========== Description Bar ========== */}
      {activeExample && (
        <div className="px-4 py-2.5 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3 flex-wrap bg-gray-50/50 dark:bg-gray-900/30">
          <p className="m-0 text-[13px] text-gray-500 dark:text-gray-400 flex-1 leading-relaxed min-w-0">
            {activeExample.description}
          </p>
          <div className="flex gap-2 items-center shrink-0">
            {isModified && (
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide text-primary-500 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
                MODIFIED
              </span>
            )}
            {behavior && (
              <span
                className={[
                  "px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap border",
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
      <div className="grid grid-cols-1 md:grid-cols-2 min-h-[400px]">

        {/* --- Code Editor --- */}
        <div className="border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700 flex flex-col">
          <div className="px-4 py-2 flex justify-between items-center border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/50">
            <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest font-semibold">
              Editor
            </span>
            <div className="flex gap-1.5">
              {isModified && (
                <button
                  onClick={resetCode}
                  className="px-2.5 py-1 text-[11px] rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:border-gray-300 dark:hover:border-gray-600 transition-all focus:outline-none"
                >
                  ↺ Reset
                </button>
              )}
              <button
                onClick={execute}
                disabled={loading}
                className={[
                  "flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold rounded-md transition-all focus:outline-none",
                  loading
                    ? "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-wait"
                    : "bg-primary-500 hover:bg-primary-600 active:scale-95 text-white shadow-sm shadow-primary-500/30",
                ].join(" ")}
              >
                {loading ? (
                  <>
                    <span className="inline-flex gap-0.5">
                      {[0, 150, 300].map((delay) => (
                        <span
                          key={delay}
                          className="w-1 h-1 rounded-full bg-gray-400 animate-bounce"
                          style={{ animationDelay: `${delay}ms` }}
                        />
                      ))}
                    </span>
                    Running
                  </>
                ) : (
                  <>
                    <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 10 10">
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
              highlight={(c) => activeExample ? highlight(c, activeExample.id) : c}
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

          <div className="px-4 py-1.5 border-t border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/50 flex items-center justify-between">
            <span className="text-[10px] text-gray-400 dark:text-gray-500">
              <kbd className="px-1 py-0.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 font-mono text-[9px] text-gray-500 dark:text-gray-400">Ctrl</kbd>
              {" + "}
              <kbd className="px-1 py-0.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 font-mono text-[9px] text-gray-500 dark:text-gray-400">↵</kbd>
              {" to run"}
            </span>
            {activeExample && (
              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">
                {activeExample.mode} · 2021
              </span>
            )}
          </div>
        </div>

        {/* --- Output Panel --- */}
        <div className="flex flex-col">
          <div className="px-4 py-2 flex justify-between items-center border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/50">
            <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest font-semibold">
              Output
            </span>
            <div className="flex items-center gap-2">
              {/* Invisible spacer — matches Run button height so both headers stay aligned */}
              <span aria-hidden className="invisible flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold rounded-md">
                <svg className="w-2.5 h-2.5" viewBox="0 0 10 10"><polygon points="0,0 10,5 0,10" /></svg>
                Run
              </span>
              {result?.cached && (
                <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-medium">
                  ● cached
                </span>
              )}
              {result && !loading && (
                <span className={[
                  "text-[10px] font-semibold px-1.5 py-0.5 rounded-full border",
                  result.success
                    ? "text-green-600 dark:text-green-400 border-green-500/30 bg-green-50 dark:bg-green-900/20"
                    : "text-red-500 dark:text-red-400 border-red-500/30 bg-red-50 dark:bg-red-900/20",
                ].join(" ")}>
                  {result.success ? "✓ ok" : "✗ failed"}
                </span>
              )}
            </div>
          </div>

          <div className="flex-1 p-4 bg-[#011627] font-mono text-[13px] leading-[1.7] overflow-y-auto whitespace-pre-wrap break-words">
            {loading && (
              <div className="flex flex-col gap-2 text-gray-400">
                <div className="flex items-center gap-2">
                  <span className="inline-flex gap-1">
                    {[0, 150, 300].map((delay) => (
                      <span
                        key={delay}
                        className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-bounce"
                        style={{ animationDelay: `${delay}ms` }}
                      />
                    ))}
                  </span>
                  <span>Compiling…</span>
                </div>
                <span className="text-[11px] text-gray-600 font-sans">
                  First run may take 10–15 seconds.
                </span>
              </div>
            )}

            {error && (
              <span className="text-red-400">{error}</span>
            )}

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
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center select-none">
                <svg className="w-8 h-8 text-gray-700" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
                <p className="text-[12px] text-gray-600 font-sans leading-relaxed">
                  Press{" "}
                  <kbd className="px-1 py-0.5 rounded border border-gray-700 bg-gray-800 font-mono text-[10px] text-gray-400">Ctrl+↵</kbd>
                  {" "}or click <strong className="text-gray-400 font-semibold">Run</strong> to execute.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
