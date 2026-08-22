import { cn } from "@creed/ui/utils";
import { SectionTitle } from "@/components/marketing/landing/section-title";

export function SectionHeading({
  headline,
  subline,
  align = "center",
  className,
}: {
  headline: string;
  subline?: string;
  align?: "center" | "left";
  className?: string;
}) {
  const centered = align === "center";

  return (
    <div
      className={cn(
        centered
          ? "mx-auto max-w-3xl px-2 text-center sm:px-0 md:max-w-[72rem]"
          : "mx-auto max-w-3xl px-2 text-center sm:px-0 md:mx-0 md:max-w-2xl md:text-left",
        className,
      )}
    >
      <SectionTitle
        className={cn(
          "t-section text-[var(--creed-text-primary)]",
          centered ? "justify-center" : "justify-center md:justify-start",
        )}
      >
        {headline}
      </SectionTitle>
      {subline ? (
        <p
          className={cn(
            "t-lede mt-5 max-w-2xl text-[var(--creed-text-tertiary)]",
            centered ? "mx-auto" : "mx-auto md:mx-0",
          )}
        >
          {subline}
        </p>
      ) : null}
    </div>
  );
}
