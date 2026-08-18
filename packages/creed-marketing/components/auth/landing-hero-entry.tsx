"use client";

import { LandingPage } from "../marketing/landing/landing-page";

export function LandingHeroEntry({ configured }: { configured: boolean }) {
  return <LandingPage configured={configured} />;
}
