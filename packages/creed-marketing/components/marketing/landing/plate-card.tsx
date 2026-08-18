import type { ReactNode } from "react";
import { cn } from "@creed/ui/utils";
import { nestedPlateRadius } from "./nested-plate";

// A bento tile whose media slot is a flat colour plate with an interactive
// demo floating on it, and the explainer copy below. The two cards stretch to
// equal height via the grid; the plate flexes to fill.
export function PlateCard({
  plateColor,
  plateClassName,
  number,
  numberColor,
  title,
  titleIcon,
  body,
  square = false,
  children,
}: {
  plateColor: string;
  plateClassName?: string;
  number?: string;
  numberColor?: string;
  title: string;
  titleIcon?: ReactNode;
  body: string;
  square?: boolean;
  children: ReactNode;
}) {
  return (
    <article
      className={cn(
        "flex min-w-0 flex-col rounded-xl bg-[var(--creed-surface)] p-3 md:p-4",
        !square && "h-full",
      )}
    >
      <div
        className={cn(
          nestedPlateRadius,
          "relative flex min-w-0 items-center justify-center overflow-hidden p-4 sm:p-6",
          // Square plate at the 3-up desktop width; auto height (content) when
          // the grid collapses to one column so a full-width square isn't huge.
          square ? "lg:aspect-square" : "min-h-[380px] flex-1",
          plateClassName,
        )}
        style={{ backgroundColor: plateColor }}
      >
        <div className="relative min-w-0 w-full">{children}</div>
      </div>
      <div className="mt-4 px-1 md:mt-5">
        <h3 className="t-step flex items-center gap-2 text-[var(--creed-text-primary)]">
          {titleIcon ? (
            <span
              aria-hidden
              className="inline-flex shrink-0 items-center"
              style={{ color: plateColor }}
            >
              {titleIcon}
            </span>
          ) : null}
          {number ? (
            <span
              className="mr-2 font-semibold"
              style={{ color: numberColor ?? "var(--creed-text-tertiary)" }}
            >
              {number}
            </span>
          ) : null}
          {title}
        </h3>
        <p className="t-body mt-2.5 text-[var(--creed-text-secondary)]">
          {body}
        </p>
      </div>
    </article>
  );
}
