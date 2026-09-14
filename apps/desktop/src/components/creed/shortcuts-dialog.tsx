import { useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShortcutKey } from "@/components/creed/shortcut-key";
import { useAiEnabled } from "@/lib/native/ai-availability";

const groups = [
  { title: "Navigation", rows: [
    ["Shortcuts", "X"], ["Search", "K"],
    ["New Creed", "N"], ["Switch Creed", "C"], ["Toggle sidebar", "S"],
    ["Toggle theme", "M"],
  ] },
  { title: "File", rows: [
    ["Find", "F"], ["Find and replace", "R"], ["Toggle activity", "A"],
  ] },
  { title: "Search", rows: [
    ["Move through results", "↑ ↓"], ["Open result", "Enter"], ["Back or close", "Esc"],
  ] },
];

export function ShortcutsDialog({ open, onOpenChange }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const aiEnabled = useAiEnabled();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "x" || event.metaKey || event.ctrlKey ||
          event.altKey || event.shiftKey || event.repeat || event.isComposing ||
          event.defaultPrevented) return;
      const target = event.target;
      if (!(target instanceof HTMLElement) || target.isContentEditable ||
          /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (!open && document.querySelector('[role="dialog"]')) return;
      event.preventDefault();
      onOpenChange(!open);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const visibleGroups = aiEnabled ? [...groups, {
    title: "Models", rows: [
      ["Complete text in the editor", "Tab"],
      ["Switch to Ask Mode in the panel", "Tab"],
      ["Switch to Agent Mode in the panel", "⌘"],
      ["Send in the panel", "Enter"],
    ],
  }] : groups;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(560px,75dvh)] flex-col overflow-hidden sm:max-w-[420px] gap-5">
        <DialogHeader className="shrink-0">
          <DialogTitle>Shortcuts</DialogTitle>
          <DialogDescription>Single-letter shortcuts work when you’re not typing.</DialogDescription>
        </DialogHeader>
        <div className="creed-scrollbar min-h-0 space-y-5 overflow-y-auto pr-1">
          {visibleGroups.map((group) => (
            <section key={group.title}>
              <h3 className="mb-2 border-b border-[var(--creed-border)] pb-2 text-[13px] font-medium text-[var(--creed-text-tertiary)]">{group.title}</h3>
              <dl className="space-y-1">
                {group.rows.map(([label, key]) => (
                  <div key={label} className="flex min-h-7 items-center justify-between gap-4">
                    <dt className="text-[13px] text-[var(--creed-text-primary)]">{label}</dt>
                    <dd><ShortcutKey className="w-auto min-w-5 px-1.5">{key}</ShortcutKey></dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
