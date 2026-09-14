"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/components/ui/utils";
import { FileTag } from "./file-text-marks";
import { SectionHeading } from "./section-heading";

const claudeCodeIcon = "/assets/agents/claudecode.svg";
const gooseIcon = "/assets/agents/goose.svg";
const factoryIcon = "/assets/agents/factory.svg";
const codexIcon = "/assets/agents/codex.svg";
const hermesIcon = "/assets/agents/hermes.svg";
const openClawIcon = "/assets/agents/openclaw.svg";
const openCodeIcon = "/assets/agents/opencode.svg";
const cursorIcon = "/assets/agents/cursor.svg";
const grokBotIcon = "/assets/agents/grokbot.svg";

type BrandLogoKey =
  | "claudecode"
  | "codex"
  | "cursor"
  | "hermes"
  | "openclaw"
  | "opencode"
  | "goose"
  | "factory"
  | "devin"
  | "grokbot";

const brandLogoMap: Record<
  BrandLogoKey,
  { src: string; imageClassName?: string }
> = {
  goose: { src: gooseIcon },
  devin: { src: "/assets/agents/devin.svg" },
  factory: { src: factoryIcon },
  codex: {
    src: codexIcon,
    imageClassName: "scale-[0.92]",
  },
  cursor: {
    src: cursorIcon,
    imageClassName: "scale-[0.88]",
  },
  claudecode: {
    src: claudeCodeIcon,
    imageClassName: "scale-[0.92]",
  },
  hermes: {
    src: hermesIcon,
    imageClassName: "scale-[1.02]",
  },
  openclaw: {
    src: openClawIcon,
    imageClassName: "scale-[1.02]",
  },
  opencode: {
    src: openCodeIcon,
    imageClassName: "scale-[0.9]",
  },
  grokbot: { src: grokBotIcon, imageClassName: "scale-[0.9]" },
};

// Roadmap-style colour pairs for compact stack tiles: soft tinted cap,
// saturated label. Monochrome brands share a neutral pair.
const STACK_TILE_STYLE: Record<BrandLogoKey, { fill: string; text: string }> = {
  devin: {
    fill: "bg-[#F3F4F6] dark:bg-[#1f1f1d]",
    text: "text-[#1F1F1A] dark:text-[#e7e7e2]",
  },
  goose: {
    fill: "bg-[#F3F4F6] dark:bg-[#1f1f1d]",
    text: "text-[#1F1F1A] dark:text-[#e7e7e2]",
  },
  factory: {
    fill: "bg-[#F3F4F6] dark:bg-[#1f1f1d]",
    text: "text-[#1F1F1A] dark:text-[#e7e7e2]",
  },
  claudecode: {
    fill: "bg-[#FFF1E7] dark:bg-[#3a1f12]/55",
    text: "text-[#C2410C] dark:text-[#FB923C]",
  },
  codex: {
    fill: "bg-[#EFF6FF] dark:bg-[#102341]/60",
    text: "text-[var(--creed-accent-hover)] dark:text-[#60A5FA]",
  },
  cursor: {
    fill: "bg-[#F3F4F6] dark:bg-[#1f1f1d]",
    text: "text-[#1F1F1A] dark:text-[#e7e7e2]",
  },
  hermes: {
    fill: "bg-[#FFFBEB] dark:bg-[#3a2a12]/50",
    text: "text-[#B45309] dark:text-[#FBBF24]",
  },
  openclaw: {
    fill: "bg-[#FEF2F2] dark:bg-[#3F1212]/50",
    text: "text-[#DC2626] dark:text-[#F87171]",
  },
  opencode: {
    fill: "bg-[#F3F4F6] dark:bg-[#1f1f1d]",
    text: "text-[#1F1F1A] dark:text-[#e7e7e2]",
  },
  grokbot: {
    fill: "bg-[#F3F4F6] dark:bg-[#1f1f1d]",
    text: "text-[#1F1F1A] dark:text-[#e7e7e2]",
  },
};

function StackTile({ brand, label }: { brand: BrandLogoKey; label: string }) {
  const style = STACK_TILE_STYLE[brand];

  return (
    <div className="flex w-24 max-w-full shrink-0 flex-col overflow-hidden rounded-xl bg-[var(--creed-surface)]">
      <div
        className={cn(
          "flex min-h-10 items-center justify-center px-2 py-2.5",
          style.fill,
        )}
      >
        <div
          className={cn(
            "text-center text-[12px] font-medium leading-tight tracking-[-0.01em]",
            style.text,
          )}
        >
          {label}
        </div>
      </div>
      <div className="flex min-h-16 items-center justify-center px-2 py-4">
        <BrandImage brand={brand} label={label} className="h-10 w-10" />
      </div>
    </div>
  );
}

// Black-on-white brand logos that need flipping to white in dark mode.
// Coloured brand assets (Claude, Codex, OpenClaw, Hermes, etc.) skip this.
const MONOCHROME_BRANDS = new Set<BrandLogoKey>([
  "devin",
  "goose",
  "factory",
  "opencode",
  "cursor",
  "grokbot",
]);

function BrandImage({
  brand,
  label,
  className,
}: {
  brand: BrandLogoKey;
  label: string;
  className?: string;
}) {
  const asset = brandLogoMap[brand];
  const [errored, setErrored] = useState(false);

  if (errored) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-md bg-[var(--creed-surface-raised)] text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--creed-text-tertiary)]",
          className,
        )}
      >
        {label.slice(0, 2)}
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <Image
        src={asset.src}
        alt={label}
        fill
        sizes="160px"
        className={cn(
          "pointer-events-none select-none object-contain",
          MONOCHROME_BRANDS.has(brand) && "creed-invert-on-dark",
          asset.imageClassName,
        )}
        draggable={false}
        onError={() => setErrored(true)}
      />
    </div>
  );
}

export function IntegrationsSection() {
  const agents: Array<{ label: string; brand: BrandLogoKey }> = [
    { label: "Codex", brand: "codex" },
    { label: "Claude Code", brand: "claudecode" },
    { label: "OpenClaw", brand: "openclaw" },
    { label: "Hermes", brand: "hermes" },
    { label: "OpenCode", brand: "opencode" },
    { label: "Cursor", brand: "cursor" },
    { label: "Grok Bot", brand: "grokbot" },
    { label: "Factory", brand: "factory" },
    { label: "Goose", brand: "goose" },
    { label: "Devin", brand: "devin" },
  ];
  return (
    <section className="px-6 py-24 md:px-10 md:py-30 lg:px-12">
      <SectionHeading
        headline={
          <>
            Works with your <FileTag accent="questions">stack</FileTag>
          </>
        }
        className="max-w-[64rem]"
      />

      <div className="mx-auto mt-14 flex max-w-[34rem] flex-wrap justify-center gap-3">
        {agents.map((item) => (
          <StackTile key={item.label} brand={item.brand} label={item.label} />
        ))}
      </div>
    </section>
  );
}
