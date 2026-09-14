"use client";

import { accentColorMap } from "@/lib/creed/creed-data";
import { cn } from "@/components/ui/utils";
import { FileItalic } from "./file-text-marks";
import { SectionHeading } from "./section-heading";
import { useRoadmap } from "@/components/marketing/use-roadmap";
import {
  ROADMAP_STATUS_STYLE,
  RoadmapLabelTag,
} from "@/components/marketing/roadmap-status";
import { RoadmapTaskDialog } from "@/components/marketing/roadmap-task-dialog";
import type { RoadmapColumn, RoadmapTask } from "@/lib/marketing/roadmap";

export function RoadmapSection() {
  const columns = useRoadmap();

  const cards = (columns ?? [])
    .flatMap((column) => column.tasks.map((task) => ({ column, task })))
    .sort(
      (a, b) =>
        b.task.createdAt - a.task.createdAt ||
        a.task.id.localeCompare(b.task.id),
    )
    .slice(0, 3);

  return (
    <section
      id="roadmap"
      className="scroll-mt-24 px-6 py-24 md:px-10 md:py-30 lg:px-12"
    >
      <SectionHeading
        headline={
          <>
            What&apos;s on the{" "}
            <span style={{ color: accentColorMap.stack }}>
              <FileItalic>way</FileItalic>
            </span>
          </>
        }
        className="max-w-[56rem]"
      />
      {columns !== null && cards.length === 0 ? (
        <p className="mx-auto mt-8 max-w-md text-center text-sm text-[var(--creed-text-tertiary)]">
          More updates soon.
        </p>
      ) : null}

      <div className="mx-auto mt-14 flex max-w-6xl flex-wrap justify-center gap-5">
        {cards.map(({ column, task }) => (
          <RoadmapCard key={task.id} column={column} task={task} />
        ))}
      </div>
    </section>
  );
}

function RoadmapCard({
  column,
  task,
}: {
  column: RoadmapColumn;
  task: RoadmapTask;
}) {
  const style = ROADMAP_STATUS_STYLE[column.id];
  return (
    <RoadmapTaskDialog
      task={task}
      trigger={
        <button
          type="button"
          className="group w-[340px] max-w-full cursor-pointer rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--creed-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--creed-background)]"
        >
          <div className="creed-press-surface flex h-full w-full flex-col overflow-hidden rounded-xl bg-[var(--creed-surface)]">
            <div className={cn("px-5 py-2.5", style.fill)}>
              <span className={cn("text-[14px] font-medium", style.text)}>
                {column.label}
              </span>
            </div>
            <div className="flex flex-1 flex-col p-5 transition-colors duration-200 group-hover:bg-[var(--creed-surface-raised)]">
              <h3 className="text-[16px] font-medium leading-snug tracking-[-0.01em] text-[var(--creed-text-primary)]">
                {task.title}
              </h3>
              {task.description ? (
                <p className="t-body mt-2 line-clamp-2 text-[var(--creed-text-secondary)]">
                  {task.description}
                </p>
              ) : null}
              {task.labels.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {task.labels.map((label) => (
                    <RoadmapLabelTag key={label} label={label} />
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </button>
      }
    />
  );
}
