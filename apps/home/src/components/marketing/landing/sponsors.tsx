import { FileHighlight, FileUnderline } from "./file-text-marks";
import { SectionHeading } from "./section-heading";

type Sponsor = {
  name: string;
  handle: string;
  initials: string;
  amount: string;
};

export function CommunitySponsorsSection({
  sponsors = [],
}: {
  sponsors?: Sponsor[];
}) {
  if (sponsors.length === 0) return null;

  return (
    <section className="px-6 py-24 md:px-10 md:py-30 lg:px-12">
      <SectionHeading
        headline={
          <>
            Supported by our{" "}
            <FileHighlight accent="operating-principles">
              <FileUnderline accent="operating-principles">
                community
              </FileUnderline>
            </FileHighlight>
          </>
        }
        className="max-w-[56rem]"
      />
      <div className="mx-auto mt-10 grid max-w-4xl gap-4 md:grid-cols-3">
        {sponsors.slice(0, 6).map((sponsor) => (
          <a
            key={sponsor.handle}
            href={`https://github.com/${encodeURIComponent(sponsor.handle)}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Visit @${sponsor.handle} on GitHub`}
            className="creed-press-surface flex items-center gap-4 rounded-2xl bg-[var(--creed-surface)] p-4 transition-colors hover:bg-[var(--creed-surface-raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--creed-accent)]"
          >
            <span
              aria-hidden="true"
              className="flex size-20 shrink-0 items-center justify-center rounded-xl bg-[var(--creed-surface-raised)] text-2xl font-medium text-[var(--creed-text-secondary)]"
            >
              {sponsor.initials}
            </span>
            <div>
              <p className="text-sm font-medium">{sponsor.name}</p>
              <p className="mt-1 text-xs text-[var(--creed-text-tertiary)]">
                @{sponsor.handle}
              </p>
              <span className="mt-2 inline-flex shrink-0 items-center whitespace-nowrap rounded-[6px] bg-[#ECFDF5] px-1.5 py-0.5 text-[12px] font-medium text-[#047857] dark:bg-[#052e1a]/50 dark:text-[#4ade80]">
                {sponsor.amount}
              </span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
