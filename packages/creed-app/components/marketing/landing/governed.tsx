import {
  DirectEditDemo,
  ProposalDemo,
} from "@/components/marketing/governed-demos";
import { PlateCard } from "@/components/marketing/landing/plate-card";
import { SectionHeading } from "@/components/marketing/landing/section-heading";

export function GovernedCollaborationSection() {
  return (
    <section className="px-6 py-20 md:px-10 md:py-24 lg:px-12">
      <div className="mx-auto max-w-5xl">
        <SectionHeading
          headline="Review everything or nothing"
        />

        <div className="mt-12 grid items-stretch gap-5 md:grid-cols-2">
          {/* Keep Chrome from anchoring the viewport to the centred autoplay
              card as its internal diff expands and collapses. */}
          <PlateCard
            plateColor="var(--plate-proposal)"
            plateClassName="[overflow-anchor:none]"
            title="You control what gets remembered."
            body="Agents propose updates in real time, but nothing changes until you approve it."
          >
            <ProposalDemo />
          </PlateCard>
          <PlateCard
            plateColor="var(--plate-direct)"
            title="Let trusted agents write directly."
            body="Agents can update your Creed without review, keeping your context current as you work."
          >
            <DirectEditDemo />
          </PlateCard>
        </div>
      </div>
    </section>
  );
}
