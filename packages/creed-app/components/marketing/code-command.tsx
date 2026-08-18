"use client";

// Shared CLI chip. Docs mounts these inside `.ProseMirror`, so `code` must
// stay unpainted or each line gets its own pill. The copy control is a bare
// icon: the shared Button ghost plate reads as a second chip in the corner.

import { useState } from "react";
import { AnimatedCheckmark } from "@creed/ui/animated-checkmark";
import { CopyIcon } from "@creed/ui/copy";
import { highlightCommand } from "@/lib/command-highlight";
import { cn } from "@creed/ui/utils";

export function CommandTokens({ source }: { source: string }) {
  return (
    <>
      {highlightCommand(source).map((token, index) =>
        token.type ? (
          <span key={`${index}-${token.type}`} className={token.type}>
            {token.text}
          </span>
        ) : (
          <span key={`${index}-text`}>{token.text}</span>
        ),
      )}
    </>
  );
}

export function CodeCommand({
  copyText,
  className,
}: {
  copyText: string;
  className?: string;
}) {
  // Extra lines grow down. The copy icon stays at the one-line inset
  // (12px from the right, optically centered on the first 13px/1.5 line).
  const multiline = copyText.includes("\n");

  return (
    <div
      className={cn(
        "creed-command relative flex h-fit w-fit max-w-full items-center gap-2.5 overflow-hidden rounded-[12px] bg-[var(--creed-surface-raised)] px-3 py-[0.45rem]",
        multiline && "pr-9",
        className,
      )}
    >
      <pre className="m-0 min-w-0 overflow-x-auto bg-transparent font-mono text-[13px] font-normal leading-[1.5] text-[var(--creed-text-primary)]">
        <code className="block bg-transparent p-0 font-[inherit] text-inherit">
          <CommandTokens source={copyText} />
        </code>
      </pre>
      <CodeCopyButton
        copyText={copyText}
        className={multiline ? "absolute right-3 top-[10px]" : undefined}
      />
    </div>
  );
}

export function CodeCopyButton({
  copyText,
  className,
}: {
  copyText: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      aria-label={copied ? "Copied" : "Copy"}
      className={cn(
        "creed-command-copy relative inline-flex size-3.5 shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent p-0 shadow-none hover:bg-transparent focus-visible:outline-none",
        copied
          ? "text-[var(--creed-text-primary)] hover:text-[var(--creed-text-primary)]"
          : "text-[var(--creed-text-tertiary)] hover:text-[var(--creed-text-primary)]",
        className,
      )}
      onClick={() => {
        void navigator.clipboard?.writeText(copyText).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1600);
        });
      }}
    >
      {copied ? (
        <AnimatedCheckmark className="size-3.5" size={14} />
      ) : (
        <CopyIcon size={14} className="size-3.5" />
      )}
    </button>
  );
}
