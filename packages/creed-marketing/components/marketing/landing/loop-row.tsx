import type { ReactNode } from "react";
import { cn } from "@creed/ui/utils";
import { nestedPlateRadius } from "./nested-plate";

// One alternating row: explainer copy on one side, the demo on a flat colour
// plate on the other. `flip` swaps the sides on desktop; both stack text-first
// on mobile for reading flow.
export function LoopRow({
  title,
  body,
  plate,
  flip = false,
  children,
}: {
  title: string;
  body: string;
  plate: string;
  flip?: boolean;
  children: ReactNode;
}) {
  return (
    // Each row is its own surface card (matching the other sections), holding the
    // explainer copy and the demo side by side.
    <article className="rounded-xl bg-[var(--creed-surface)] p-3 md:p-4">
      <div className="grid items-stretch gap-3 lg:grid-cols-2 lg:gap-4">
        <div
          className={cn(
            "flex flex-col justify-center px-4 py-6 md:px-8",
            flip ? "lg:order-2" : "lg:order-1",
          )}
        >
          <h3 className="text-[1.55rem] font-medium leading-[1.12] tracking-[-0.025em] text-[var(--creed-text-primary)] md:text-[1.85rem]">
            {title}
          </h3>
          <p className="t-body-lg mt-3.5 max-w-md text-[var(--creed-text-secondary)]">
            {body}
          </p>
        </div>
        <div className={cn("flex min-w-0", flip ? "lg:order-1" : "lg:order-2")}>
          {/* Flat colour plate filling its half of the card, with a uniform
              min-height across rows so the cards line up. The demo inside hugs
              its content and is centred, so the Update pill can expand/collapse
              smoothly without changing the plate's height. `inert` keeps the
              decorative demos' buttons out of the tab order + a11y tree. */}
          <div
            className={cn(
              nestedPlateRadius,
              "flex min-h-[420px] w-full items-center justify-center p-5",
            )}
            style={{ backgroundColor: plate }}
          >
            <div className="w-full max-w-[440px]" inert>
              {children}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
