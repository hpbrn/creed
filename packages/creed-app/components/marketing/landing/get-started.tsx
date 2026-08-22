import {
  ConnectDemo,
  CreateDemo,
  UsageDemo,
} from "@/components/marketing/how-it-works-demos";
import { PlateCard } from "@/components/marketing/landing/plate-card";
import { SectionHeading } from "@/components/marketing/landing/section-heading";

export function HowItWorksSection() {
  return (
    <section className="px-6 py-24 md:px-10 md:py-30 lg:px-12">
      <SectionHeading
        headline="Get started in minutes"
        className="max-w-[52rem]"
      />

      <div className="mx-auto mt-14 grid max-w-6xl items-start gap-5 lg:grid-cols-3">
        <PlateCard
          plateColor="var(--plate-yellow, #FBBF24)"
          number="1"
          numberColor="var(--plate-yellow, #FBBF24)"
          title="Describe yourself"
          body="Answer a few quick questions and Creed drafts your starter profile."
          square
        >
          <CreateDemo />
        </PlateCard>
        <PlateCard
          plateColor="var(--plate-direct)"
          // Tall enough for the paste phase on one column so the plate
          // does not grow when ConnectDemo swaps cards.
          plateClassName="min-h-[360px] lg:min-h-[280px]"
          number="2"
          numberColor="var(--plate-direct)"
          title="Extract your context"
          body="Pull the context you've already built across your tools into one profile."
          square
        >
          <ConnectDemo />
        </PlateCard>
        <PlateCard
          plateColor="var(--plate-red, #EF4444)"
          number="3"
          numberColor="var(--plate-red, #EF4444)"
          title="Connect your agents"
          body="Give each agent the same approved context through Creed's MCP connection."
          square
        >
          <UsageDemo />
        </PlateCard>
      </div>
    </section>
  );
}
