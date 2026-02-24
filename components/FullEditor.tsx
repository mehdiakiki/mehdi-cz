"use client";

import { useCallback, useRef, useState } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import { useTheme } from "next-themes";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Language = "javascript" | "rust" | "go";

interface LangConfig {
  label: string;
  monaco: string;
  defaultCode: string;
}

// ---------------------------------------------------------------------------
// Language definitions
// ---------------------------------------------------------------------------

const LANGS: Record<Language, LangConfig> = {
  javascript: {
    label: "JavaScript",
    monaco: "javascript",
    defaultCode: `// JavaScript
console.log("Hello from JS!");

const fib = (n) => n <= 1 ? n : fib(n - 1) + fib(n - 2);
console.log("fib(10) =", fib(10));
`,
  },
  rust: {
    label: "Rust",
    monaco: "rust",
    defaultCode: `// Rust
fn main() {
    println!("Hello from Rust!");

    let numbers = vec![1, 2, 3, 4, 5];
    let sum: i32 = numbers.iter().sum();
    println!("Sum = {}", sum);
}
`,
  },
  go: {
    label: "Go",
    monaco: "go",
    defaultCode: `// Go
package main

import "fmt"

func main() {
	fmt.Println("Hello from Go!")

	sum := 0
	for i := 1; i <= 5; i++ {
		sum += i
	}
	fmt.Println("Sum =", sum)
}
`,
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FullEditor() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [lang, setLang] = useState<Language>("javascript");
  const [code, setCode] = useState(LANGS.javascript.defaultCode);
  const [output, setOutput] = useState<{ text: string; ok: boolean } | null>(null);
  const [running, setRunning] = useState(false);

  // Split pane — outputHeight is the bottom panel height in px.
  const [outputHeight, setOutputHeight] = useState(220);
  const dragRef = useRef<{ startY: number; startH: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleLangChange = (next: Language) => {
    setLang(next);
    setCode(LANGS[next].defaultCode);
    setOutput(null);
  };

  const run = useCallback(async () => {
    setRunning(true);
    setOutput(null);

    try {
      const res = await fetch("/api/playground/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lang, code }),
      });
      const data = await res.json();
      const text = [data.stdout, data.stderr].filter(Boolean).join("\n").trim();
      setOutput({ text: text || "(no output)", ok: data.success });
    } catch (err) {
      setOutput({ text: String(err), ok: false });
    } finally {
      setRunning(false);
    }
  }, [lang, code]);

  // Drag-to-resize the output panel.
  const onDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startY: e.clientY, startH: outputHeight };

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const delta = dragRef.current.startY - ev.clientY;
      const containerH = containerRef.current?.clientHeight ?? window.innerHeight;
      const next = Math.min(Math.max(dragRef.current.startH + delta, 80), containerH - 120);
      setOutputHeight(next);
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // Colours derived from theme.
  const bg = isDark ? "#1e1e1e" : "#f3f3f3";
  const surface = isDark ? "#252526" : "#ffffff";
  const border = isDark ? "#3a3a3a" : "#d0d0d0";
  const muted = isDark ? "#858585" : "#888888";
  const text = isDark ? "#d4d4d4" : "#1a1a1a";

  return (
    <div
      ref={containerRef}
      className="flex flex-col"
      style={{ position: "fixed", inset: 0, zIndex: 50, background: bg }}
    >
      {/* ── Toolbar ───────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-4 shrink-0"
        style={{ height: 46, borderBottom: `1px solid ${border}`, background: surface }}
      >
        {/* Language tabs */}
        <div className="flex gap-1">
          {(Object.keys(LANGS) as Language[]).map((l) => (
            <button
              key={l}
              onClick={() => handleLangChange(l)}
              className="px-3 py-1 rounded text-sm font-medium transition-colors"
              style={{
                background: lang === l ? (isDark ? "#0e639c" : "#0078d4") : "transparent",
                color: lang === l ? "#fff" : muted,
              }}
            >
              {LANGS[l].label}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Run */}
        <button
          onClick={run}
          disabled={running}
          className="flex items-center gap-2 px-4 py-1.5 rounded text-sm font-semibold"
          style={{
            background: running ? (isDark ? "#3a3a3a" : "#ccc") : "#22c55e",
            color: running ? muted : "#fff",
            cursor: running ? "not-allowed" : "pointer",
          }}
        >
          {running ? (
            <>
              <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Running…
            </>
          ) : (
            "▶  Run"
          )}
        </button>
      </div>

      {/* ── Editor ────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0">
        <Editor
          language={LANGS[lang].monaco}
          value={code}
          theme={isDark ? "vs-dark" : "light"}
          onChange={(v) => setCode(v ?? "")}
          onMount={(editor: Parameters<OnMount>[0]) => editor.focus()}
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: "on",
            tabSize: 2,
            lineNumbers: "on",
            renderLineHighlight: "line",
            padding: { top: 12, bottom: 12 },
          }}
        />
      </div>

      {/* ── Drag handle ───────────────────────────────────────── */}
      <div
        onMouseDown={onDragStart}
        className="shrink-0 flex items-center justify-center"
        style={{
          height: 6,
          background: border,
          cursor: "row-resize",
          userSelect: "none",
        }}
      >
        <div
          style={{
            width: 32,
            height: 2,
            borderRadius: 2,
            background: muted,
            opacity: 0.5,
          }}
        />
      </div>

      {/* ── Output panel ──────────────────────────────────────── */}
      <div
        className="shrink-0 flex flex-col"
        style={{ height: outputHeight, background: surface }}
      >
        {/* Panel header */}
        <div
          className="flex items-center gap-2 px-4 shrink-0"
          style={{
            height: 32,
            borderBottom: `1px solid ${border}`,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.05em",
            color: muted,
          }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{
              background:
                output == null ? (running ? "#f59e0b" : "#555")
                : output.ok ? "#22c55e"
                : "#ef4444",
            }}
          />
          OUTPUT
          {output && (
            <span style={{ fontWeight: 400, opacity: 0.6 }}>
              — {output.ok ? "success" : "error"}
            </span>
          )}
        </div>

        {/* Output text */}
        <pre
          className="flex-1 overflow-auto px-5 py-3 text-sm font-mono"
          style={{
            margin: 0,
            color: output?.ok === false ? "#f87171" : text,
          }}
        >
          {running && output == null ? (
            <span style={{ color: muted }}>Running…</span>
          ) : output == null ? (
            <span style={{ color: muted }}>Press ▶ Run to execute</span>
          ) : (
            output.text
          )}
        </pre>
      </div>
    </div>
  );
}
