import { LandingHero } from "./hero";
import { AppPreview } from "./app-preview";
import { AiFeaturesSection } from "./ai-features";
import { IntegrationsSection } from "./integrations";
import { RoadmapSection } from "./roadmap";
import { CommunitySponsorsSection } from "./sponsors";
import { LandingFaqSection } from "./faq";
import {
  MarketingHeader,
  MarketingFooter,
} from "@/components/marketing/site-chrome";

export function LandingPage() {
  return (
    <>
      <MarketingHeader />
      <main>
        <LandingHero />
        <AppPreview />
        <AiFeaturesSection />
        <IntegrationsSection />
        <RoadmapSection />
        <CommunitySponsorsSection />
        <LandingFaqSection />
      </main>
      <MarketingFooter />
    </>
  );
}
