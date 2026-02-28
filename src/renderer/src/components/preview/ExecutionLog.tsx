import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronDown, ChevronRight, Copy, Check } from "lucide-react";
import { usePreviewStore } from "../../stores";
import { NODE_ACCENT_COLORS } from "../../lib/nodeColors";
import type { TranscriptEntry } from "../../lib/preview/types";

function ResultBadge({
  result,
}: {
  result: "true" | "false" | "error";
}): React.JSX.Element {
  const styles: Record<string, string> = {
    true: "bg-emerald-900/60 text-emerald-400 border-emerald-700/50",
    false: "bg-red-900/60 text-red-400 border-red-700/50",
    error: "bg-amber-900/60 text-amber-400 border-amber-700/50",
  };
  const labels: Record<string, string> = {
    true: "TRUE",
    false: "FALSE",
    error: "ERR",
  };

  return (
    <span
      className={`ml-1.5 px-1.5 py-0.5 text-[10px] font-medium rounded border ${styles[result]}`}
    >
      {labels[result]}
    </span>
  );
}

function LogEntry({ entry }: { entry: TranscriptEntry }): React.JSX.Element {
  const borderColor = NODE_ACCENT_COLORS[entry.nodeType] ?? "#6b7280";

  return (
    <button
      type="button"
      className="w-full text-left px-2 py-1.5 hover:bg-muted/50 cursor-pointer transition-colors"
      style={{ borderLeft: `3px solid ${borderColor}` }}
      onClick={() => usePreviewStore.getState().setFocusNodeId(entry.nodeId)}
    >
      <div className="flex items-center text-xs text-foreground">
        <span className="text-muted-foreground mr-1.5 font-mono">
          [{entry.stepIndex}]
        </span>
        <span className="truncate">{entry.content}</span>
        {entry.result && <ResultBadge result={entry.result} />}
      </div>
      {entry.detail && (
        <div className="text-[11px] text-muted-foreground mt-0.5 ml-5 truncate">
          {entry.detail}
        </div>
      )}
    </button>
  );
}

export function ExecutionLog(): React.JSX.Element {
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const transcript = usePreviewStore((s) => s.previewState?.transcript ?? []);

  // Clean up copied timer on unmount
  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  // Auto-scroll to bottom when transcript grows
  useEffect(() => {
    if (expanded && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript.length, expanded]);

  const handleCopy = useCallback(async () => {
    if (transcript.length === 0) return;

    const text = transcript
      .map((e) => `[${e.stepIndex}] ${e.content}`)
      .join("\n");

    try {
      await navigator.clipboard.writeText(text);
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      setCopied(true);
      copiedTimerRef.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      console.error("Failed to copy execution log");
    }
  }, [transcript]);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <button
        className="flex items-center gap-1.5 w-full px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded((prev) => !prev)}
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        Log
        {transcript.length > 0 && (
          <span className="text-xs text-muted-foreground font-normal ml-1">
            ({transcript.length})
          </span>
        )}
      </button>

      {expanded && (
        <div className="pb-2">
          {transcript.length === 0 ? (
            <div className="px-3 py-3 text-xs text-muted-foreground">
              No steps yet
            </div>
          ) : (
            <>
              {/* Scrollable log entries */}
              <div ref={scrollRef} className="max-h-[300px] overflow-y-auto">
                {transcript.map((entry, i) => (
                  <LogEntry key={i} entry={entry} />
                ))}
              </div>

              {/* Copy button */}
              <div className="px-3 pt-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      Copy Log
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
