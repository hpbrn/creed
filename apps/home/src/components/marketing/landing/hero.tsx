import { DownloadButton } from "@/components/marketing/download-button";
import { Button } from "@/components/ui/button";
import { GITHUB_URL } from "@/lib/site";
import { GitHubMark } from "@/components/marketing/site-chrome";
import { ScrollArtwork } from "@/components/marketing/scroll-artwork";

export function LandingHero() {
  return (
    <section className="px-6 md:px-10">
      <div className="mx-auto grid max-w-[1120px] items-center gap-10 py-12 md:grid-cols-[1.5fr_1fr] md:gap-12 md:py-16">
        <div>
          <h1 className="max-w-[640px] text-[clamp(2.25rem,4.6vw,3.75rem)] font-medium leading-[1.1] tracking-[-0.045em]">
            Personal context
            <br className="hidden sm:block" /> for your agents.
          </h1>
          <p className="mt-6 max-w-[460px] text-[17px] leading-relaxed text-[var(--creed-text-secondary)]">
            A <span className="text-[var(--creed-text-primary)]">Mac app</span>{" "}
            for your{" "}
            <span className="text-[var(--creed-text-primary)]">Markdown</span>{" "}
            context. Write who you are, keep it yours, and share{" "}
            <span className="text-[var(--creed-text-primary)]">
              one file across your agents
            </span>
            .
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <DownloadButton />
            <Button
              asChild
              variant="outline"
              className="rounded-sm border-[var(--creed-border)]"
            >
              <a href={GITHUB_URL} target="_blank" rel="noreferrer">
                <GitHubMark className="size-4" />
                View repo
              </a>
            </Button>
          </div>
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none relative mx-auto hidden aspect-square w-full max-w-[400px] items-center justify-center md:flex"
        >
          <ScrollArtwork className="w-full" />
        </div>
      </div>
    </section>
  );
}
