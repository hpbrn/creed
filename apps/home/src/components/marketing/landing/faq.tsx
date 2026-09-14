import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { FileStrike, FileUnderline } from "./file-text-marks";
import { SectionHeading } from "./section-heading";
import { homeFaqItems as faqItems } from "@/lib/marketing/faq";

export function LandingFaqSection() {
  return (
    <section className="px-6 py-24 md:px-10 md:py-30 lg:px-12">
      <SectionHeading
        headline={
          <>
            <FileUnderline accent="boundaries">
              <FileStrike>Dumb</FileStrike>
            </FileUnderline>{" "}
            questions
          </>
        }
      />

      <div className="mx-auto mt-14 max-w-[46rem]">
        <FaqAccordion items={faqItems} />
      </div>
    </section>
  );
}
