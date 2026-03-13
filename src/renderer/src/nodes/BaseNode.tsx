import { ReactNode, useCallback } from "react";
import { Handle, Position } from "@xyflow/react";
import { Star, CheckCircle2, CircleDot } from "lucide-react";
import { cn } from "../lib/utils";
import { usePreviewStore } from "../stores";
import {
  MutedBadge,
  MUTED_NODE_CLASSES,
  MUTED_LABEL_CLASS,
} from "./MutedBadge";

interface BaseNodeProps {
  nodeId?: string; // For coverage badge lookup
  children: ReactNode;
  accentColor: string; // hex color e.g. '#34d399'
  icon: ReactNode;
  label: string;
  selected?: boolean;
  bookmarked?: boolean;
  muted?: boolean;
  hasInput?: boolean;
  hasOutput?: boolean;
  outputCount?: number;
}

export function BaseNode({
  nodeId,
  children,
  accentColor,
  icon,
  label,
  selected,
  bookmarked,
  muted = false,
  hasInput = true,
  hasOutput = true,
  outputCount = 1,
}: BaseNodeProps) {
  const coverageStatus = usePreviewStore(
    useCallback(
      (s) => {
        if (!nodeId || !s.isOpen) return null;
        return s.coverageData.visitedNodes.has(nodeId)
          ? "visited"
          : "unvisited";
      },
      [nodeId],
    ),
  );

  return (
    <div
      className={cn(
        "interaction-node min-w-[180px] rounded-xl border shadow-lg",
        muted && MUTED_NODE_CLASSES,
      )}
      style={{
        borderColor: selected
          ? accentColor
          : `color-mix(in srgb, ${accentColor} 30%, transparent)`,
        boxShadow: selected
          ? `0 0 0 2px ${accentColor}, 0 0 15px color-mix(in srgb, ${accentColor} 40%, transparent)`
          : "0 4px 12px hsl(0 0% 0% / 0.3)",
      }}
    >
      {/* Accent strip */}
      <div
        className="h-1 rounded-t-xl"
        style={{
          background: `linear-gradient(to right, ${accentColor}, color-mix(in srgb, ${accentColor} 85%, white))`,
        }}
      />

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <span style={{ color: accentColor }}>{icon}</span>
        <span
          className={cn(
            "text-sm font-medium text-foreground",
            muted && MUTED_LABEL_CLASS,
          )}
        >
          {label}
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          {bookmarked && (
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
          )}
          {muted && <MutedBadge />}
          {coverageStatus === "visited" && (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          )}
          {coverageStatus === "unvisited" && (
            <CircleDot className="h-3.5 w-3.5 text-amber-400" />
          )}
        </span>
      </div>

      {/* Content */}
      <div className="px-3 pb-3">{children}</div>

      {/* Input Handle */}
      {hasInput && (
        <Handle
          type="target"
          position={Position.Left}
          className="!h-3 !w-3 !rounded-full !border-2 !border-background"
          style={{ backgroundColor: "hsl(230 10% 50%)" }}
        />
      )}

      {/* Output Handle(s) */}
      {hasOutput && (
        <>
          {outputCount === 1 ? (
            <Handle
              type="source"
              position={Position.Right}
              className="!h-3 !w-3 !rounded-full !border-2 !border-background"
              style={{ backgroundColor: accentColor }}
            />
          ) : (
            Array.from({ length: outputCount }).map((_, i) => (
              <Handle
                key={i}
                type="source"
                position={Position.Right}
                id={`output-${i}`}
                className="!h-3 !w-3 !rounded-full !border-2 !border-background"
                style={{
                  top: `${((i + 1) / (outputCount + 1)) * 100}%`,
                  backgroundColor: accentColor,
                }}
              />
            ))
          )}
        </>
      )}
    </div>
  );
}
