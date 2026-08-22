import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { SectionHeading } from "@/components/marketing/landing/section-heading";
import { homeFaqItems as faqItems } from "@/lib/marketing/faq";

export function LandingFaqSection() {
  return (
    <section className="px-6 py-24 md:px-10 md:py-30 lg:px-12">
      <SectionHeading headline="Common questions" />

      <div className="mx-auto mt-14 max-w-[46rem]">
        <FaqAccordion items={faqItems} />
      </div>
    </section>
  );
}
