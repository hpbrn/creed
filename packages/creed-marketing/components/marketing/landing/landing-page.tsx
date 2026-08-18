import { LandingHero } from "../../auth/landing-hero";
import { WhyUseItSection } from "./why-use-it";
import { WhyNotOtherToolsSection } from "./comparison";
import { HowCreedWorksSection } from "./how-creed-works";
import { GovernedCollaborationSection } from "./governed";
import { AiFeaturesSection } from "./ai-features";
import { HowItWorksSection } from "./get-started";
import { IntegrationsSection } from "./integrations";
import { WhatsOnTheWaySection } from "./roadmap-teaser";
import { CommunitySponsorsSection } from "./sponsors-teaser";
import { LandingFaqSection } from "./faq";
import { ClosingCtaSection } from "./closing-cta";
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
