"use client";

import { LandingPage } from "@/components/marketing/landing/landing-page";

export function LandingHeroEntry({ configured }: { configured: boolean }) {
  return <LandingPage configured={configured} />;
}
