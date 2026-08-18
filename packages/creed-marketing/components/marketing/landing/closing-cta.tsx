"use client";

import Link from "next/link";
import { useAnimatedIconControls } from "@/components/creed/animated-icon-controls";
import { useCreedEdition } from "@/components/creed/edition-provider";
import { useLandingAuthState } from "@/components/marketing/use-landing-auth-state";
import { useEditionContinueHref } from "@creed/edition/ui";
import { ArrowRightIcon } from "@creed/ui/arrow-right";
import { GITHUB_URL } from "@/lib/branding";
import { SceneryImage } from "@/components/marketing/scenery-image";
import { SectionTitle } from "./section-title";

const finaleImage = "/assets/landing/scenery/garden.png";

export function ClosingCtaSection({ configured }: { configured: boolean }) {
  const { hostedAccounts: hasHostedAccounts, publicSignup } =
    useCreedEdition().capabilities;
  const cloudAuthEnabled = configured && hasHostedAccounts;
  const authState = useLandingAuthState(cloudAuthEnabled);
  const { href, isPaid, canResume } =
    useEditionContinueHref();
  const closingArrow = useAnimatedIconControls(80, undefined, 420);
  const label =
    !hasHostedAccounts
      ? "View on GitHub"
      : !publicSignup && authState !== "signed-in"
        ? "View roadmap"
      : authState !== "signed-in"
      ? "Get Started"
      : isPaid
        ? "Go to app"
        : canResume
          ? "Resume"
          : "Get Started";
  const resolvedHref =
    !hasHostedAccounts
      ? GITHUB_URL
      : !publicSignup && authState !== "signed-in"
        ? "/roadmap"
      : authState === "signed-in"
        ? href
        : "/signup?next=/onboarding";

  return (
    <section className="bg-[var(--creed-background)] px-3 py-3 md:px-5 md:py-5">
      <div className="relative flex min-h-[72svh] items-center overflow-hidden rounded-[28px] md:min-h-[76svh]">
        <SceneryImage
          src={finaleImage}
          fileName="garden.png"
          label="Garden"
          hint="wide landscape, ~2400x1400"
        />

        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(92%_54%_at_50%_50%,rgba(0,0,0,0.16)_0%,rgba(0,0,0,0.05)_46%,rgba(0,0,0,0)_70%)]" />

        <div className="relative z-10 mx-auto w-full max-w-4xl px-6 py-24 text-center md:px-10 md:py-30 lg:px-12">
          <SectionTitle className="t-section justify-center text-white">
            Stop starting from scratch
          </SectionTitle>

          <p className="mx-auto mt-5 max-w-xl text-[15px] font-semibold text-white/90 md:whitespace-nowrap md:text-[18px]">
            Every agent you use, already up to speed.
          </p>

          <div className="mt-9 flex justify-center">
            <Link
              href={resolvedHref}
              target={!hasHostedAccounts ? "_blank" : undefined}
              rel={!hasHostedAccounts ? "noreferrer" : undefined}
              onMouseEnter={closingArrow.start}
              onMouseLeave={closingArrow.settle}
              onPointerDown={(event) => {
                if (event.pointerType !== "mouse") closingArrow.start();
              }}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-white pl-4 pr-3 text-[14px] font-medium text-[#19345f] transition-colors hover:bg-[#f6f7fb]"
            >
              <span className="leading-none">{label}</span>
              <ArrowRightIcon
                ref={closingArrow.iconRef}
                size={16}
                className="inline-flex shrink-0 items-center justify-center leading-none"
              />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
