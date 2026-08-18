import { LandingHero } from "../../auth/landing-hero";
import { ScrollHighlightStatement } from "./scroll-highlight-statement";
import { HowCreedWorksSection } from "./how-creed-works";
import { GovernedCollaborationSection } from "./governed";
import { AiFeaturesSection } from "./ai-features";
import { IntegrationsSection } from "./integrations";
import { WhatsOnTheWaySection } from "./roadmap-teaser";
import { CommunitySponsorsSection } from "./sponsors-teaser";
import { LandingFaqSection } from "./faq";
import { MarketingFooter } from "@/components/marketing/site-chrome";

export function LandingPage({ configured }: { configured: boolean }) {
  return (
    <div className="dark:[--creed-background:#0e0e0e]">
      <LandingHero configured={configured} />
      <main className="relative isolate bg-[var(--creed-background)] [&>section]:bg-transparent">
        <ScrollHighlightStatement />
        <HowCreedWorksSection />
        <GovernedCollaborationSection />
        <AiFeaturesSection />
        <IntegrationsSection />
        <WhatsOnTheWaySection />
        <CommunitySponsorsSection />
        <LandingFaqSection />
        <div
          aria-hidden="true"
          className="h-16 bg-[var(--creed-background)] md:h-20"
        />
        <MarketingFooter />
      </main>
    </div>
  );
}
