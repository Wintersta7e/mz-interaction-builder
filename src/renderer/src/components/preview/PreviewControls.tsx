import { Play, Pause, SkipForward, RotateCcw } from "lucide-react";
import { usePreviewStore } from "../../stores";

export function PreviewControls(): React.JSX.Element {
  const autoPlay = usePreviewStore((s) => s.autoPlay);
  const autoPlaySpeed = usePreviewStore((s) => s.autoPlaySpeed);
  const previewState = usePreviewStore((s) => s.previewState);
  const engine = usePreviewStore((s) => s.engine);

  const isEnded = previewState?.status === "ended";
  const hasEngine = engine !== null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
      {/* Step */}
      <button
        className="p-1.5 rounded hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
        title="Step (advance one node)"
        disabled={isEnded || !hasEngine}
        onClick={() => usePreviewStore.getState().step()}
      >
        <SkipForward className="h-4 w-4" />
      </button>

      {/* Auto-play toggle */}
      <button
        className="p-1.5 rounded hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
        title={autoPlay ? "Pause auto-play" : "Start auto-play"}
        disabled={isEnded || !hasEngine}
        onClick={() => usePreviewStore.getState().toggleAutoPlay()}
      >
        {autoPlay ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>

      {/* Restart */}
      <button
        className="p-1.5 rounded hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
        title="Restart preview"
        disabled={!hasEngine}
        onClick={() => usePreviewStore.getState().restart()}
      >
        <RotateCcw className="h-4 w-4" />
      </button>

      {/* Speed slider */}
      <div className="flex items-center gap-1.5 ml-2">
        <span className="text-xs text-muted-foreground whitespace-nowrap">Speed</span>
        <input
          type="range"
          min={500}
          max={2000}
          step={100}
          value={autoPlaySpeed}
          onChange={(e) => usePreviewStore.getState().setAutoPlaySpeed(Number(e.target.value))}
          className="w-20 h-1 accent-primary"
          title={`${autoPlaySpeed}ms per step`}
        />
        <span className="text-xs text-muted-foreground w-10 text-right">{autoPlaySpeed}ms</span>
      </div>
    </div>
  );
}
