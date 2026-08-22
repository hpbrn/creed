"use client";

import { cn } from "@creed/ui/utils";
import { SectionHeading } from "@/components/marketing/landing/section-heading";
import { useRoadmap } from "@/components/marketing/use-roadmap";
import { ROADMAP_STATUS_STYLE } from "@/components/marketing/roadmap-status";
import { RoadmapTaskDialog } from "@/components/marketing/roadmap-task-dialog";
import type { RoadmapColumn, RoadmapTask } from "@/lib/marketing/roadmap";

// A teaser of the live roadmap: the top item in each status (Next, In Progress,
// Shipped), pulled from the same median board as the /roadmap page. Renders
// nothing until data arrives, and hides itself if the board is empty or
// unavailable, so it never shows an empty shell on the landing page.
export function WhatsOnTheWaySection() {
  const columns = useRoadmap();

  const cards = (columns ?? [])
    .map((column) => ({ column, task: column.tasks[0] }))
    .filter((entry): entry is { column: RoadmapColumn; task: RoadmapTask } =>
      Boolean(entry.task),
    );

  if (cards.length === 0) return null;

  return (
    <section className="px-6 py-24 md:px-10 md:py-30 lg:px-12">
      <SectionHeading
        headline="What's on the way"
        className="max-w-[56rem]"
      />

      <div className="mx-auto mt-14 flex max-w-6xl flex-wrap justify-center gap-5">
        {cards.map(({ column, task }) => (
          <RoadmapTeaserCard key={column.id} column={column} task={task} />
        ))}
      </div>
    </section>
  );
}

// One teaser card: a colour-coded status header bar built into the card (the
// look from the reference roadmap), then the feature title and a short summary.
function RoadmapTeaserCard({
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
          className="group flex w-full cursor-pointer flex-col overflow-hidden rounded-xl bg-[var(--creed-surface)] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--creed-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--creed-background)] sm:w-[340px]"
        >
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
          </div>
        </button>
      }
    />
  );
}
