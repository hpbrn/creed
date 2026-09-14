import Image from "@/lib/native/image";
import { useState, type CSSProperties } from "react";
import { cn } from "@/components/ui/utils";
import { customAgent } from "@/lib/custom-agents";
import { ProfileAvatar } from "@/components/creed/profile-avatar";

const allAgentsIcon = "/assets/agents/allagents.svg";
const mcpIcon = "/assets/agents/mcp.svg";
const cliIcon = "/assets/agents/cli.svg";
const creedWordmark = "/assets/brand/creed.svg";
const claudeCodeIcon = "/assets/agents/claudecode.svg";
const codexIcon = "/assets/agents/codex.svg";
const cursorIcon = "/assets/agents/cursor.svg";
const customAgentIcon = "/assets/agents/unknown.svg";
const gooseIcon = "/assets/agents/goose.svg";
const hermesIcon = "/assets/agents/hermes.svg";
const factoryIcon = "/assets/agents/factory.svg";
const devinIcon = "/assets/agents/devin.svg";
const grokBotIcon = "/assets/agents/grokbot.svg";
const icon = "/assets/brand/icon.svg";
// The mark on a solid surface. Distinct from --creed-accent (#2563eb), which
// is the product UI accent, not the brand-mark blue.
const CREED_BRAND_BLUE = "#0066FF";
const openClawIcon = "/assets/agents/openclaw.svg";
const openCodeIcon = "/assets/agents/opencode.svg";

const creedWordmarkMask = {
  WebkitMaskImage: `url(${creedWordmark})`,
  maskImage: `url(${creedWordmark})`,
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
  WebkitMaskPosition: "center",
  maskPosition: "center",
  WebkitMaskSize: "contain",
  maskSize: "contain",
} satisfies CSSProperties;

export function CreedWordmark({
  className,
  onTransparent = false,
}: {
  className?: string;
  onTransparent?: boolean;
}) {
  return (
    <span
      role="img"
      aria-label="Creed"
      className={cn(
        "relative ml-1 block h-[18px] aspect-[1031/244] shrink-0",
        className,
      )}
    >
      <span
        className="absolute inset-0"
        style={{
          ...creedWordmarkMask,
          backgroundColor: onTransparent
            ? "#ffffff"
            : "var(--creed-text-primary)",
        }}
      />
      {!onTransparent ? (
        <span
          className="absolute inset-0 [clip-path:inset(0_84.77%_0_0)]"
          style={{ ...creedWordmarkMask, backgroundColor: CREED_BRAND_BLUE }}
        />
      ) : null}
    </span>
  );
}

export function CreedMark({
  className,
  onTransparent = false,
}: {
  className?: string;
  onTransparent?: boolean;
}) {
  return (
    <div
      role="img"
      aria-label="Creed"
      className={cn("h-[18px] w-[18px] shrink-0", className)}
      style={{
        backgroundColor: onTransparent ? "#ffffff" : CREED_BRAND_BLUE,
        WebkitMaskImage: `url(${icon})`,
        maskImage: `url(${icon})`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
      }}
    />
  );
}

// The Creed brandmark rendered in brand blue, for the in-app "Creed" agent's
// identity on proposal cards and activity rows. The icon SVG is used as a mask
// over a solid fill, so the shape reads as exactly the brand-mark blue in
// both themes (a plain <img> can't be recoloured to an exact hue).
export function CreedAgentGlyph({ className }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="Creed"
      className={cn("block shrink-0", className)}
      style={{
        backgroundColor: CREED_BRAND_BLUE,
        WebkitMaskImage: `url(${icon})`,
        maskImage: `url(${icon})`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
      }}
    />
  );
}

// Type of every glyph the brand component knows how to render. Kept as
// a literal union (rather than a runtime object whose keys are read at
// type-time) so the value isn't constructed just to satisfy `keyof`.
type GlyphKind =
  | `custom:${string}`
  | "claude"
  | "claudecode"
  | "codex"
  | "chatgpt"
  | "cursor"
  | "replit"
  | "devin"
  | "whirl"
  | "grok"
  | "grokbot"
  | "goose"
  | "v0"
  | "opencode"
  | "openclaw"
  | "hermes"
  | "factory"
  | "manus"
  | "mcp"
  | "cli"
  | "all"
  | "custom";

const MONOCHROME_AGENTS = new Set<GlyphKind>([
  "chatgpt",
  "cursor",
  "devin",
  "grok",
  "grokbot",
  "goose",
  "v0",
  "opencode",
  "factory",
  "manus",
  "custom",
  "mcp",
  "cli",
  "all",
]);

const glyphBrandAssets = {
  claude: { src: customAgentIcon, imageClassName: "scale-[0.92]" },
  claudecode: { src: claudeCodeIcon, imageClassName: "scale-[0.92]" },
  codex: { src: codexIcon, imageClassName: "scale-[0.92]" },
  chatgpt: { src: customAgentIcon, imageClassName: "scale-[0.9]" },
  cursor: { src: cursorIcon, imageClassName: "scale-[0.9]" },
  replit: { src: customAgentIcon, imageClassName: "scale-[0.9]" },
  devin: { src: devinIcon, imageClassName: "scale-[0.9]" },
  whirl: { src: customAgentIcon, imageClassName: "scale-[0.9]" },
  grok: { src: customAgentIcon, imageClassName: "scale-[0.9]" },
  grokbot: { src: grokBotIcon, imageClassName: "scale-[0.9]" },
  goose: { src: gooseIcon, imageClassName: "scale-[0.9]" },
  v0: { src: customAgentIcon, imageClassName: "scale-[0.9]" },
  opencode: { src: openCodeIcon, imageClassName: "scale-[0.9]" },
  openclaw: { src: openClawIcon, imageClassName: "scale-[0.9]" },
  hermes: { src: hermesIcon, imageClassName: "scale-[0.9]" },
  factory: { src: factoryIcon, imageClassName: "scale-[0.9]" },
  manus: { src: customAgentIcon, imageClassName: "scale-[0.9]" },
  mcp: { src: mcpIcon, imageClassName: "scale-[0.9]" },
  cli: { src: cliIcon, imageClassName: "scale-[0.9]" },
  all: { src: allAgentsIcon, imageClassName: "scale-[0.9]" },
  custom: { src: customAgentIcon, imageClassName: "scale-[0.9]" },
} as const;

export function IntegrationGlyph({
  kind,
  className,
  iconClassName,
  assetClassName,
  framed = true,
}: {
  kind: GlyphKind;
  className?: string;
  iconClassName?: string;
  assetClassName?: string;
  framed?: boolean;
}) {
  const [failedIcon, setFailedIcon] = useState<string | null>(null);
  const agent = customAgent(kind);
  const candidate = agent?.icon;
  const uploaded = candidate !== failedIcon ? candidate : null;
  if (agent && !uploaded) {
    return (
      <div className={cn("h-10 w-10", className)}>
        <ProfileAvatar
          kind="person"
          name={agent.name}
          size="input"
          className="size-full! rounded-[36.36%]! after:rounded-[36.36%]"
        />
      </div>
    );
  }
  const asset = uploaded
    ? { src: uploaded, imageClassName: "rounded-[3px]" }
    : (glyphBrandAssets[
        (kind.startsWith("custom:")
          ? "custom"
          : kind) as keyof typeof glyphBrandAssets
      ] ?? null);

  return (
    <div
      className={cn(
        framed
          ? "flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--creed-border)] bg-[var(--creed-surface)] text-[var(--creed-text-primary)]"
          : "flex items-center justify-center text-[var(--creed-text-primary)]",
        className,
      )}
    >
      {asset ? (
        <div
          className={cn(
            "relative h-5 w-5",
            !framed && "h-9 w-9",
            assetClassName,
          )}
        >
          <Image
            src={asset.src}
            alt=""
            fill
            sizes={framed ? "20px" : "36px"}
            unoptimized
            onError={() => {
              if (uploaded) setFailedIcon(uploaded);
            }}
            className={cn(
              "pointer-events-none select-none object-contain",
              // Monochrome agent assets read as black-on-light. Flip them to
              // white in dark mode so they don't disappear against the dark
              // canvas. Coloured brand assets (claude, claudecode, codex,
              // openclaw, hermes) are skipped.
              !uploaded &&
                (MONOCHROME_AGENTS.has(kind) || kind.startsWith("custom:")) &&
                "creed-invert-on-dark",
              asset.imageClassName,
              iconClassName,
            )}
            draggable={false}
          />
        </div>
      ) : null}
    </div>
  );
}
