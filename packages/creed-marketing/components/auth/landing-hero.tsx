"use client";

import Link from "next/link";
import { SceneryFade, SceneryImage } from "@/components/marketing/scenery-image";
import { MarketingHeader } from "@/components/marketing/site-chrome";
import { useLandingAuthState } from "@/components/marketing/use-landing-auth-state";
import { useEditionContinueHref } from "@creed/edition/ui";
import { useAnimatedIconControls } from "@/components/creed/animated-icon-controls";
import { ArrowRightIcon } from "@creed/ui/arrow-right";
import { ArrowUpRightIcon } from "@creed/ui/arrow-up-right";
import { useCreedEdition } from "@/components/creed/edition-provider";
import { GITHUB_URL } from "@/lib/branding";

const heroImage = "/assets/landing/garden.png";

export function LandingHero({ configured }: { configured: boolean }) {
  const { hostedAccounts: hasHostedAccounts, publicSignup } =
    useCreedEdition().capabilities;
  const cloudAuthEnabled = configured && hasHostedAccounts;
  const authState = useLandingAuthState(cloudAuthEnabled);
  const { href: ctaHref, isPaid } =
    useEditionContinueHref();
  const heroArrow = useAnimatedIconControls(80, undefined, 420);

  const ctaLabel =
    !hasHostedAccounts
      ? "View on GitHub"
      : !publicSignup && authState !== "signed-in"
        ? "View roadmap"
      : authState !== "signed-in"
      ? "Get Started"
      : isPaid
        ? "Go to app"
        : "Get Started";
  // Signed out: account creation, then /file. Unpaid signed-in users are
  // sent to /pricing by the app gate.
  const resolvedHref =
    !hasHostedAccounts
      ? GITHUB_URL
      : !publicSignup && authState !== "signed-in"
        ? "/roadmap"
      : authState === "signed-in"
        ? ctaHref
        : "/signup?next=/file";

  return (
    <>
      <MarketingHeader configured={configured} scrolled={false} />
      <section className="relative bg-[var(--creed-background)]">
        <div className="relative flex min-h-[94svh] flex-col overflow-hidden">
          {/* SceneryImage self-heals to a labelled placeholder if the source is
              ever missing. */}
          <SceneryImage
            src={heroImage}
            fileName="garden.png"
            label="Garden"
            priority
            hint="landscape, ~16:9"
          />

          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,31,60,0.18)_0%,rgba(15,31,60,0.08)_30%,rgba(15,31,60,0)_60%)] dark:bg-[linear-gradient(180deg,rgba(0,0,0,0.34)_0%,rgba(0,0,0,0.16)_30%,rgba(0,0,0,0)_60%)]" />

          <SceneryFade direction="down" className="inset-x-0 bottom-0 top-auto h-1/2" />

          <div className="relative z-10 flex flex-1 flex-col px-6 py-5 md:px-10 md:py-7">
            <div className="flex flex-1 items-center justify-center pb-[10vh] text-center">
              <div className="w-full max-w-3xl">
                <h1 className="t-hero justify-center text-white">
                  {["Your personal context", "all in one place"].map((line) => (
                    <span key={line} className="block whitespace-nowrap">
                      {line}
                    </span>
                  ))}
                </h1>

                <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                  <HeroGitHubButton />
                  <Link
                    href={resolvedHref}
                    target={!hasHostedAccounts ? "_blank" : undefined}
                    rel={!hasHostedAccounts ? "noreferrer" : undefined}
                    onMouseEnter={heroArrow.start}
                    onMouseLeave={heroArrow.settle}
                    onPointerDown={(event) => {
                      if (event.pointerType !== "mouse") heroArrow.start();
                    }}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-white pl-4 pr-3 text-[14px] font-medium text-[#19345f] transition-colors hover:bg-[#f6f7fb]"
                  >
                    <span className="leading-none">{ctaLabel}</span>
                    <ArrowRightIcon
                      ref={heroArrow.iconRef}
                      size={16}
                      className="inline-flex shrink-0 items-center justify-center leading-none"
                    />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function GitHubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

function HeroGitHubButton() {
  const repoArrow = useAnimatedIconControls(80, undefined, 420);
  return (
    <a
      href={GITHUB_URL}
      target="_blank"
      rel="noreferrer"
      onMouseEnter={repoArrow.start}
      onMouseLeave={repoArrow.settle}
      onPointerDown={(event) => {
        if (event.pointerType !== "mouse") repoArrow.start();
      }}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-white pl-3.5 pr-3 text-[14px] font-medium text-black transition-colors hover:bg-[#f6f7fb]"
    >
      <GitHubMark className="h-[18px] w-[18px] text-black" />
      <span className="leading-none">View repo</span>
      <ArrowUpRightIcon
        ref={repoArrow.iconRef}
        size={16}
        className="inline-flex shrink-0 items-center justify-center leading-none text-black"
      />
    </a>
  );
}
