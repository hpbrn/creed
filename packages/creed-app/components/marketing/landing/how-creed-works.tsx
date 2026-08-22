import {
  ActivityDemo,
  ReadDemo,
  UpdateDemo,
} from "@/components/marketing/how-creed-works-demos";
import { LoopRow } from "@/components/marketing/landing/loop-row";
import { SectionHeading } from "@/components/marketing/landing/section-heading";

// The headline storyteller: the Creed loop (read -> update -> refine) told as
// three alternating rows, each a live auto-playing demo built from the real app
// UI floating on a flat colour plate. Sits first, above the supporting sections.
export function HowCreedWorksSection() {
  return (
    <section className="px-6 py-24 md:px-10 md:py-30 lg:px-12">
      <SectionHeading
        headline="How it works"
        className="max-w-[60rem]"
      />

      <div className="mx-auto mt-12 max-w-5xl space-y-5 md:mt-16 md:space-y-6">
        <LoopRow
          title="Every agent reads it first"
          body="Before it answers, any agent pulls your Creed over MCP, so you never re-explain who you are, what you're building, or how you like to work."
          plate="var(--plate-connect)"
        >
          <ReadDemo />
        </LoopRow>
        <LoopRow
          title="It updates as it learns"
          body="When an agent notices something durable, it proposes a precise edit. It lands in your Creed as a diff. Approve it and the section updates in place."
          plate="var(--plate-proposal)"
          flip
        >
          <UpdateDemo />
        </LoopRow>
        <LoopRow
          title="And every change is visible"
          body="Open Activity to see what changed, who changed it, and whether it was accepted, rejected, or edited directly."
          plate="var(--plate-create)"
        >
          <ActivityDemo />
        </LoopRow>
      </div>
    </section>
  );
}
