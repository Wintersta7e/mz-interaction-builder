import { useStore } from "@xyflow/react";
import type { GuideLine } from "../lib/alignmentGuides";

interface AlignmentGuidesProps {
  guides: GuideLine[];
}

export function AlignmentGuides({ guides }: AlignmentGuidesProps) {
  const transform = useStore((s) => s.transform);

  if (guides.length === 0) return null;

  // transform = [x, y, zoom] — the viewport transform
  const [tx, ty, zoom] = transform;

  return (
    <svg className="pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible">
      {guides.map((guide, i) => {
        if (guide.orientation === "vertical") {
          const screenX = guide.position * zoom + tx;
          return (
            <line
              key={`v-${i}`}
              x1={screenX}
              y1={0}
              x2={screenX}
              y2="100%"
              stroke="hsl(210 100% 60%)"
              strokeWidth={1}
              strokeDasharray="4 4"
              opacity={0.7}
            />
          );
        } else {
          const screenY = guide.position * zoom + ty;
          return (
            <line
              key={`h-${i}`}
              x1={0}
              y1={screenY}
              x2="100%"
              y2={screenY}
              stroke="hsl(210 100% 60%)"
              strokeWidth={1}
              strokeDasharray="4 4"
              opacity={0.7}
            />
          );
        }
      })}
    </svg>
  );
}
