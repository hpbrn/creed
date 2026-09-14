import { SwapLabel } from "@/components/creed/swap-label";

const LOCK_LABELS = ["Locked", "Unlocked"] as const;

export function LockLabel({
  locked,
  className,
}: {
  locked: boolean;
  className?: string;
}) {
  return (
    <SwapLabel
      value={locked ? "Locked" : "Unlocked"}
      options={LOCK_LABELS}
      className={className}
    />
  );
}
