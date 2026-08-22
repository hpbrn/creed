import { LandingHero } from "@/components/auth/landing-hero";
import { WhyUseItSection } from "@/components/marketing/landing/why-use-it";
import { WhyNotOtherToolsSection } from "@/components/marketing/landing/comparison";
import { HowCreedWorksSection } from "@/components/marketing/landing/how-creed-works";
import { GovernedCollaborationSection } from "@/components/marketing/landing/governed";
import { AiFeaturesSection } from "@/components/marketing/landing/ai-features";
import { HowItWorksSection } from "@/components/marketing/landing/get-started";
import { IntegrationsSection } from "@/components/marketing/landing/integrations";
import { WhatsOnTheWaySection } from "@/components/marketing/landing/roadmap-teaser";
import { CommunitySponsorsSection } from "@/components/marketing/landing/sponsors-teaser";
import { LandingFaqSection } from "@/components/marketing/landing/faq";
import { ClosingCtaSection } from "@/components/marketing/landing/closing-cta";
import { MarketingFooter } from "@/components/marketing/site-chrome";

export function LandingPage({ configured }: { configured: boolean }) {
  return (
    <>
      <LandingHero configured={configured} />
      <main className="bg-[var(--creed-background)]">
        <WhyUseItSection />
        <WhyNotOtherToolsSection />
        <HowCreedWorksSection />
        <GovernedCollaborationSection />
        <AiFeaturesSection />
        <HowItWorksSection />
        <IntegrationsSection />
        <WhatsOnTheWaySection />
        <CommunitySponsorsSection />
        <LandingFaqSection />
        <ClosingCtaSection configured={configured} />
        <div
          aria-hidden="true"
          className="h-16 bg-[var(--creed-background)] md:h-20"
        />
        <MarketingFooter />
      </main>
    </>
  );
}
