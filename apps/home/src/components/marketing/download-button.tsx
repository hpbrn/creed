import { DOWNLOAD_URL } from "@/lib/site";

export function DownloadButton() {
  return (
    <a
      href={DOWNLOAD_URL}
      download="Creed.dmg"
      className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-sm border border-transparent bg-[var(--creed-accent)] px-2.5 text-[14px] font-medium text-white! transition-colors hover:bg-[var(--creed-accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--creed-accent)]"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-4 w-4 shrink-0"
        fill="currentColor"
      >
        <path d="M17.05 12.54c.03 3.24 2.84 4.32 2.87 4.33-.02.08-.45 1.54-1.48 3.05-.9 1.3-1.83 2.59-3.3 2.62-1.44.03-1.9-.85-3.55-.85-1.64 0-2.15.82-3.52.88-1.41.05-2.49-1.41-3.39-2.71-1.84-2.66-3.24-7.52-1.35-10.81.94-1.63 2.62-2.67 4.44-2.7 1.39-.03 2.7.94 3.55.94.85 0 2.45-1.16 4.13-.99.7.03 2.66.28 3.92 2.12-.1.06-2.35 1.37-2.32 4.12ZM14.34 4.55c.75-.91 1.26-2.17 1.12-3.43-1.08.04-2.39.72-3.17 1.63-.7.8-1.31 2.09-1.15 3.32 1.2.09 2.43-.61 3.2-1.52Z" />
      </svg>
      <span className="leading-none">Download</span>
    </a>
  );
}
