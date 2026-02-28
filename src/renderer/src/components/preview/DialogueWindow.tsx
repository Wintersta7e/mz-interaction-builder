import { useState, useEffect, useCallback, useRef } from "react";
import { RotateCcw } from "lucide-react";
import { usePreviewStore } from "../../stores";
import type { TranscriptEntry, AvailableChoice } from "../../lib/preview/types";

/**
 * Typewriter hook: reveals `text` one character at a time.
 * Returns [displayedText, isComplete, skipToEnd].
 */
function useTypewriter(
  text: string,
  intervalMs: number = 16,
): [string, boolean, () => void] {
  const [charIndex, setCharIndex] = useState(0);
  const targetRef = useRef(text);

  // Reset when text changes
  useEffect(() => {
    if (text !== targetRef.current) {
      targetRef.current = text;
      setCharIndex(0);
    }
  }, [text]);

  // Advance characters
  useEffect(() => {
    if (charIndex >= text.length) return;

    const timer = setInterval(() => {
      setCharIndex((prev) => {
        if (prev >= text.length) return prev;
        return prev + 1;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [text, charIndex, intervalMs]);

  const skipToEnd = useCallback(() => {
    setCharIndex(text.length);
  }, [text]);

  return [text.slice(0, charIndex), charIndex >= text.length, skipToEnd];
}

/**
 * Extracts displayable dialogue text from a transcript entry.
 * Returns the text if the entry represents a "Show Text" action, otherwise null.
 *
 * The engine stores raw dialogue text in `detail` and prefixes content with
 * "Show Text:" so we check both for robustness.
 */
function extractShowText(entry: TranscriptEntry): string | null {
  if (
    entry.nodeType === "action" &&
    entry.detail &&
    entry.content.includes("Show Text")
  ) {
    return entry.detail;
  }
  return null;
}

/**
 * Gets the last transcript entry, if any.
 */
function getLastEntry(
  transcript: TranscriptEntry[],
): TranscriptEntry | undefined {
  return transcript.length > 0 ? transcript[transcript.length - 1] : undefined;
}

// ─── Sub-components ─────────────────────────────────────────────

function GuidanceMessage(): React.JSX.Element {
  return (
    <div className="bg-slate-900/95 border border-slate-600 rounded-lg p-4 text-center">
      <p className="text-sm text-muted-foreground">
        Press <strong className="text-foreground">Step</strong> or{" "}
        <strong className="text-foreground">Play</strong> to begin the preview.
      </p>
    </div>
  );
}

function DialogueText({ text }: { text: string }): React.JSX.Element {
  const [displayed, isComplete, skipToEnd] = useTypewriter(text, 16);

  return (
    <div
      className="bg-slate-900/95 border border-slate-600 rounded-lg p-4 cursor-pointer min-h-[60px]"
      onClick={skipToEnd}
      title={isComplete ? undefined : "Click to skip"}
    >
      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
        {displayed}
        {!isComplete && (
          <span className="inline-block w-1 h-4 bg-primary ml-0.5 animate-pulse align-text-bottom" />
        )}
      </p>
    </div>
  );
}

function RunningDisplay({
  entry,
}: {
  entry: TranscriptEntry;
}): React.JSX.Element {
  const showText = extractShowText(entry);

  if (showText) {
    return <DialogueText text={showText} />;
  }

  // Generic running display for non-text entries
  return (
    <div className="bg-slate-900/95 border border-slate-600 rounded-lg p-4">
      <p className="text-sm text-muted-foreground italic">
        {entry.content}
        {entry.detail && (
          <span className="block text-xs mt-1 text-muted-foreground/70">
            {entry.detail}
          </span>
        )}
      </p>
    </div>
  );
}

function ChoiceButton({
  choice,
  onSelect,
}: {
  choice: AvailableChoice;
  onSelect: (index: number) => void;
}): React.JSX.Element {
  if (choice.disabled) {
    return (
      <button
        disabled
        className="w-full text-left px-3 py-2 rounded border border-slate-700 bg-slate-800/50 text-muted-foreground opacity-50 cursor-not-allowed text-sm flex items-center gap-2"
      >
        <span className="text-xs font-mono text-muted-foreground/60 w-5 text-center">
          {choice.index + 1}
        </span>
        <span>{choice.text}</span>
      </button>
    );
  }

  return (
    <button
      onClick={() => onSelect(choice.index)}
      className="w-full text-left px-3 py-2 rounded border border-slate-600 bg-slate-800/80 text-foreground text-sm flex items-center gap-2 hover:bg-slate-700 hover:border-primary/50 transition-colors"
    >
      <span className="text-xs font-mono text-primary w-5 text-center">
        {choice.index + 1}
      </span>
      <span>{choice.text}</span>
    </button>
  );
}

function ChoiceDisplay({
  choices,
  transcript,
}: {
  choices: AvailableChoice[];
  transcript: TranscriptEntry[];
}): React.JSX.Element {
  const visibleChoices = choices.filter((c) => !c.hidden);
  const lastEntry = getLastEntry(transcript);
  const showText = lastEntry ? extractShowText(lastEntry) : null;

  const handleSelect = useCallback((index: number) => {
    usePreviewStore.getState().step(index);
  }, []);

  return (
    <div className="bg-slate-900/95 border border-slate-600 rounded-lg p-4 space-y-3">
      {/* Show Text content above choices if present */}
      {showText && (
        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed pb-2 border-b border-slate-700">
          {showText}
        </p>
      )}

      {/* Choice buttons */}
      <div className="space-y-1.5">
        {visibleChoices.map((choice) => (
          <ChoiceButton
            key={choice.index}
            choice={choice}
            onSelect={handleSelect}
          />
        ))}
      </div>
    </div>
  );
}

function EndedDisplay(): React.JSX.Element {
  return (
    <div className="bg-slate-900/95 border border-slate-600 rounded-lg p-4 text-center space-y-3">
      <p className="text-sm text-muted-foreground">End of Interaction</p>
      <button
        onClick={() => usePreviewStore.getState().restart()}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-slate-600 bg-slate-800 text-foreground hover:bg-slate-700 transition-colors"
      >
        <RotateCcw className="h-3 w-3" />
        Restart
      </button>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────

export function DialogueWindow(): React.JSX.Element {
  const previewState = usePreviewStore((s) => s.previewState);

  // No state yet — show guidance
  if (!previewState) {
    return <GuidanceMessage />;
  }

  const { status, transcript, availableChoices } = previewState;
  const lastEntry = getLastEntry(transcript);

  // Ended
  if (status === "ended") {
    return <EndedDisplay />;
  }

  // Waiting for choice
  if (status === "waiting_choice") {
    return <ChoiceDisplay choices={availableChoices} transcript={transcript} />;
  }

  // Running — show last transcript entry
  if (lastEntry) {
    return <RunningDisplay entry={lastEntry} />;
  }

  // Running but no transcript yet (just started)
  return <GuidanceMessage />;
}
