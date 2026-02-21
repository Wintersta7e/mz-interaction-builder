export const MUTED_NODE_CLASSES = "border-dashed opacity-30";
export const MUTED_LABEL_CLASS = "line-through";

export function MutedBadge() {
  return (
    <span className="rounded bg-muted-foreground/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
      Muted
    </span>
  );
}
