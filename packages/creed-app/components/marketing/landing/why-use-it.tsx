import { cn } from "@creed/ui/utils";
import { nestedPlateRadius } from "@/components/marketing/landing/nested-plate";
import { SectionHeading } from "@/components/marketing/landing/section-heading";

const WHY_USE_IT_STATS = [
  {
    whole: "1",
    fraction: "2",
    suffix: "B+",
    cadence: "/mo",
    label: "people use standalone AI tools",
    body: "Each tool starts cold unless your context travels with you.",
    accent: "var(--plate-proposal)",
  },
  {
    whole: "420",
    fraction: undefined,
    suffix: "M",
    cadence: "/mo",
    label: "estimated multi-tool AI users",
    body: "A simple 35 percent estimate across monthly AI users.",
    accent: "var(--plate-direct)",
  },
  {
    whole: "2",
    fraction: "1",
    suffix: "T",
    cadence: "/mo",
    label: "context tokens left behind",
    body: "Multi-tool users leaving 5,000 useful context tokens behind.",
    accent: "var(--plate-create)",
  },
] as const;

function StatNumber({
  whole,
  fraction,
  suffix,
  cadence,
}: {
  whole: string;
  fraction?: string;
  suffix: string;
  cadence: string;
}) {
  return (
    <span className="whitespace-nowrap tabular-nums">
      {whole}
      {fraction ? (
        <>
          <span className="mx-[0.04em] inline-block translate-x-[3px] translate-y-[-0.012em] tracking-normal">
            .
          </span>
          {fraction}
        </>
      ) : null}
      {suffix}
      <span className="text-[0.8em] opacity-50">{cadence}</span>
    </span>
  );
}

export function WhyUseItSection() {
  return (
    <section className="px-6 py-24 md:px-10 md:py-30 lg:px-12">
      <SectionHeading
        headline="Why use it?"
        className="max-w-[64rem]"
      />

      <div className="mx-auto mt-14 grid max-w-[70rem] items-stretch gap-5 lg:grid-cols-3">
        {WHY_USE_IT_STATS.map((stat) => (
          <article
            key={stat.label}
            className="flex h-auto min-h-0 flex-col rounded-xl bg-[var(--creed-surface)] p-3 md:h-full"
          >
            <div
              className={cn(
                nestedPlateRadius,
                "flex min-h-[120px] items-center px-5 text-[2.75rem] font-semibold leading-none tracking-[-0.045em] text-[var(--creed-background)] md:min-h-[130px] md:px-6 md:text-[3.25rem]",
              )}
              style={{ backgroundColor: stat.accent }}
            >
              <StatNumber
                whole={stat.whole}
                fraction={stat.fraction}
                suffix={stat.suffix}
                cadence={stat.cadence}
              />
            </div>
            <div className="px-3 pb-3 pt-5 md:px-4 md:pb-4">
              <h3 className="text-[1.35rem] font-medium leading-tight tracking-[-0.025em] text-[var(--creed-text-primary)]">
                {stat.label}
              </h3>
              <p className="t-body mt-3 text-[var(--creed-text-secondary)]">{stat.body}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
