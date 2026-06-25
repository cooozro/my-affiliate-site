import type { Dictionary } from "@/messages/en";

type AdSlotProps = {
  position: "top" | "middle" | "bottom";
  className?: string;
  labels: Dictionary["ads"];
};

export function AdSlot({ position, className = "", labels }: AdSlotProps) {
  const positionLabel = labels[position];

  return (
    <aside
      className={`ad-slot flex min-h-[90px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 px-4 py-6 text-center ${className}`}
      aria-label={positionLabel}
      data-ad-position={position}
    >
      <p className="font-sans text-xs text-muted-foreground">
        {positionLabel}
        <span className="mt-1 block text-[10px] opacity-70">
          {labels.placeholder}
        </span>
      </p>
    </aside>
  );
}
