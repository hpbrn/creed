"use client";

import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { Star } from "lucide-react";
import Link from "next/link";
import { ScrollArtwork } from "@/components/marketing/scroll-artwork";
import {
  ContrastIcon,
  type ContrastIconHandle,
} from "@/components/ui/contrast";
import { BrandedCredit } from "@/components/ui/branded-credit";
import { CreedWordmark } from "@/components/creed/brand";
import { DownloadButton } from "@/components/marketing/download-button";
import { useGitHubStars } from "@/components/marketing/use-github-stars";
import { CREED_TAGLINE } from "@/lib/marketing/brand";
import { useTheme } from "@/components/creed/theme-provider";
import {
  DISCORD_URL,
  GITHUB_URL,
  INSTAGRAM_URL,
  TWITTER_URL,
} from "@/lib/branding";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/utils";

function scrollHome(event: MouseEvent<HTMLAnchorElement>) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  window.scrollTo({
    top: 0,
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "instant"
      : "smooth",
  });
}

export function MarketingHeader() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 32);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return (
    <header className="sticky top-3 z-40 mx-3 mt-3 sm:mx-6 md:mx-10">
      <div
        className={cn(
          "mx-auto flex h-12 items-center justify-between gap-2 rounded-xl px-2 transition-[max-width,background-color,box-shadow] duration-300 ease-in-out motion-reduce:transition-none sm:gap-4",
          scrolled
            ? "max-w-[440px] bg-[var(--creed-surface)] shadow-[0_8px_24px_-12px_rgba(28,28,26,0.18)] ring-1 ring-black/[0.06] dark:ring-white/[0.08]"
            : "max-w-[1120px] bg-transparent",
        )}
      >
        <div className="relative left-[2px] shrink-0">
          {scrolled ? (
            <Link
              href="/"
              aria-label="Creed home"
              onClick={scrollHome}
              className="hover:[--creed-wordmark-hover-color:#0066FF]"
            >
              <CreedWordmark />
            </Link>
          ) : (
            <CreedWordmark />
          )}
        </div>
        <div className="flex items-center gap-2">
          <GitHubStarButton />
          <DownloadButton />
        </div>
      </div>
    </header>
  );
}

function GitHubStarButton() {
  const stars = useGitHubStars();
  return (
    <Button
      asChild
      variant="outline"
      className="github-star-button rounded-sm border-[var(--creed-border)]"
    >
      <a
        href={GITHUB_URL}
        target="_blank"
        rel="noreferrer"
        aria-label="Star Creed on GitHub"
      >
        <GitHubMark className="size-4" />
        <Star className="github-star-icon size-3.5" />
        {stars !== null ? (
          <span className="tabular-nums">{formatStarCount(stars)}</span>
        ) : null}
      </a>
    </Button>
  );
}

export function GitHubMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

function InstagramMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M7.4 2.4h9.2a5 5 0 0 1 5 5v9.2a5 5 0 0 1-5 5H7.4a5 5 0 0 1-5-5V7.4a5 5 0 0 1 5-5Zm0 1.8a3.2 3.2 0 0 0-3.2 3.2v9.2a3.2 3.2 0 0 0 3.2 3.2h9.2a3.2 3.2 0 0 0 3.2-3.2V7.4a3.2 3.2 0 0 0-3.2-3.2H7.4Zm4.6 3.3a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Zm0 1.8a2.7 2.7 0 1 0 0 5.4 2.7 2.7 0 0 0 0-5.4Zm5.6-1.95a1.05 1.05 0 1 1-2.1 0 1.05 1.05 0 0 1 2.1 0Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function XMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M18.24 2.25h3.31l-7.23 8.26 8.51 11.24h-6.66l-5.21-6.82-5.97 6.82H1.68l7.73-8.84L1.25 2.25h6.83l4.71 6.23 5.45-6.23Zm-1.16 17.52h1.83L7.08 4.13H5.12l11.96 15.64Z" />
    </svg>
  );
}

function DiscordMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M20.317 4.369a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.891.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

function formatStarCount(stars: number | null): string {
  if (stars === null) return "";
  if (stars >= 1000) {
    return `${(stars / 1000).toFixed(stars >= 10000 ? 0 : 1).replace(/\.0$/, "")}k`;
  }
  return String(stars);
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-[var(--creed-border)] px-6 pt-10 md:px-10">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-8">
        <div>
          <Link
            href="/"
            aria-label="Creed home"
            onClick={scrollHome}
            className="inline-block hover:[--creed-wordmark-hover-color:#0066FF]"
          >
            <CreedWordmark />
          </Link>
          <p className="t-body mt-4 font-medium text-[var(--creed-text-tertiary)]">
            {CREED_TAGLINE}.
          </p>
          <div className="mt-5">
            <DownloadButton />
          </div>
        </div>
        <div className="hidden sm:block">
          <ScrollArtwork className="w-40 rotate-12" />
        </div>
      </div>
      <div className="mx-auto mt-8 flex max-w-6xl flex-wrap items-center justify-between gap-6 border-t border-[var(--creed-border)] py-6">
        <BrandedCredit
          accent="var(--creed-accent)"
          className="t-meta justify-start text-[var(--creed-text-tertiary)]"
        />
        <div className="flex items-center gap-4 text-[var(--creed-text-tertiary)]">
          <FooterThemeToggle />
          <InlineSocialIconLink href={DISCORD_URL} label="Discord">
            <DiscordMark className="size-5" />
          </InlineSocialIconLink>
          <InlineSocialIconLink href={GITHUB_URL} label="GitHub">
            <GitHubMark className="size-5" />
          </InlineSocialIconLink>
          <InlineSocialIconLink href={INSTAGRAM_URL} label="Instagram">
            <InstagramMark className="size-5" />
          </InlineSocialIconLink>
          <InlineSocialIconLink href={TWITTER_URL} label="X">
            <XMark className="size-5" />
          </InlineSocialIconLink>
        </div>
      </div>
    </footer>
  );
}

function FooterThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const iconRef = useRef<ContrastIconHandle | null>(null);
  const label = theme === "dark" ? "Light mode" : "Dark mode";

  return (
    <button
      type="button"
      aria-label={label}
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        toggleTheme({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        });
      }}
      onMouseEnter={() => iconRef.current?.startAnimation()}
      onMouseLeave={() => iconRef.current?.stopAnimation()}
      onFocus={() => iconRef.current?.startAnimation()}
      onBlur={() => iconRef.current?.stopAnimation()}
      className="inline-flex h-5 w-5 items-center justify-center transition-colors hover:text-[var(--creed-accent)]"
    >
      <ContrastIcon ref={iconRef} size={20} className="h-5 w-5" />
    </button>
  );
}

function InlineSocialIconLink({
  href,
  label,
  children,
}: {
  href: string | null;
  label: string;
  children: ReactNode;
}) {
  if (!href) {
    return null;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className="inline-flex h-5 w-5 items-center justify-center transition-colors hover:text-[var(--creed-accent)]"
    >
      {children}
    </a>
  );
}
