import { X } from "lucide-react";

export function FloatingClose({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] text-[var(--creed-text-secondary)] transition-colors duration-150 hover:bg-[var(--creed-surface-raised)] hover:text-[var(--creed-text-primary)]">
      <X className="h-3.5 w-3.5" strokeWidth={1.8} />
    </button>
  );
}
