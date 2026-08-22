"use client";

import { useState } from "react";
import { SectionHeading } from "@/components/marketing/landing/section-heading";
import {
  SponsorMessageDialog,
  SponsorWallCard,
  usePublicSponsors,
  type PublicSponsor,
} from "@/components/marketing/sponsor-wall";

// Public wall teaser. Hidden until at least one sponsor loads so Open and
// empty Cloud installs never show a vacant community section.
export function CommunitySponsorsSection() {
  const sponsors = usePublicSponsors(6);
  const [selectedSponsor, setSelectedSponsor] = useState<PublicSponsor | null>(null);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);

  if (!sponsors || sponsors.length === 0) return null;

  function openSponsor(sponsor: PublicSponsor) {
    setSelectedSponsor(sponsor);
    setMessageDialogOpen(true);
  }

  return (
    <section className="px-6 py-24 md:px-10 md:py-30 lg:px-12">
      <SectionHeading
        headline="Supported by our community"
        className="max-w-[56rem]"
      />

      <div className="mx-auto mt-14 flex max-w-6xl flex-wrap items-start justify-center gap-5">
        {sponsors.map((sponsor) => (
          <SponsorWallCard
            key={sponsor.id}
            sponsor={sponsor}
            className="w-full sm:w-[340px]"
            onOpen={openSponsor}
          />
        ))}
      </div>

      <SponsorMessageDialog
        open={messageDialogOpen}
        sponsor={selectedSponsor}
        onOpenChange={setMessageDialogOpen}
      />
    </section>
  );
}
