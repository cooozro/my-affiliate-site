type AdSlotProps = {
  position: "top" | "middle" | "bottom";
  className?: string;
};

const labels: Record<AdSlotProps["position"], string> = {
  top: "본문 상단 광고",
  middle: "본문 중간 광고",
  bottom: "본문 하단 광고",
};

export function AdSlot({ position, className = "" }: AdSlotProps) {
  return (
    <aside
      className={`ad-slot flex min-h-[90px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 px-4 py-6 text-center ${className}`}
      aria-label={labels[position]}
      data-ad-position={position}
    >
      <p className="font-sans text-xs text-muted-foreground">
        {labels[position]} 영역
        <span className="mt-1 block text-[10px] opacity-70">
          애드센스 승인 후 광고 코드 연결
        </span>
      </p>
    </aside>
  );
}
