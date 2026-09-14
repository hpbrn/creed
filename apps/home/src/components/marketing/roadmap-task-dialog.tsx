"use client";

import { useMemo, type ReactNode } from "react";
import {
  markdownToRichHtml,
  sanitizeRichTextHtml,
} from "@/lib/creed/rich-text";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RoadmapLabelTag } from "@/components/marketing/roadmap-status";
import type { RoadmapTask } from "@/lib/marketing/roadmap";

export function RoadmapTaskDialog({
  task,
  open,
  onOpenChange,
  trigger,
}: {
  task: RoadmapTask;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger: ReactNode;
}) {
  const descriptionHtml = useMemo(
    () =>
      sanitizeRichTextHtml(
        markdownToRichHtml(task.description || "No additional details yet."),
      ),
    [task.description],
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[min(80vh,42rem)] overflow-y-auto rounded-[var(--radius-xl)] border-[var(--creed-border)] bg-[var(--creed-surface)] sm:max-w-lg">
        <DialogHeader className="gap-3 pr-8">
          <DialogTitle className="text-[20px] leading-snug tracking-[-0.01em]">
            {task.title}
          </DialogTitle>
          <DialogDescription
            asChild
            className="roadmap-description t-body text-[var(--creed-text-secondary)]"
          >
            <div dangerouslySetInnerHTML={{ __html: descriptionHtml }} />
          </DialogDescription>
        </DialogHeader>

        {task.labels.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {task.labels.map((label) => (
              <RoadmapLabelTag key={label} label={label} />
            ))}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
