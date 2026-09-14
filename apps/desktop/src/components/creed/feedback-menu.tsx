import { ChevronLeft } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { DelayedSpinner } from "@/components/ui/delayed-spinner";

import { nativeRequest as fetch } from "@/lib/native/request";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  DROPDOWN_SUB_CHEVRON_CLASS,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import {
  MessageSquareIcon,
  type MessageSquareIconHandle,
} from "@/components/ui/message-square";
import {
  ACCOUNT_MENU_ITEM_CLASS,
  applyAccountSubmenuOpenChange,
} from "@/lib/account-menu";
import { useAccountAlignedPanel } from "@/lib/use-account-aligned-panel";
import { useIsMobile } from "@/lib/use-is-mobile";
import { cn } from "@/components/ui/utils";

const MAX_LENGTH = 10_000;
const DRAFT_STORAGE_KEY = "creed:feedback-draft";
const QUEUED_STORAGE_KEY = "creed:queued-feedback";

function readQueuedFeedback() {
  if (typeof window === "undefined") return [];
  try {
    const value: unknown = JSON.parse(
      window.localStorage.getItem(QUEUED_STORAGE_KEY) ?? "[]",
    );
    if (!Array.isArray(value)) return [];
    return value.filter(
      (item): item is string =>
        typeof item === "string" && item.trim().length > 0 && item.length <= MAX_LENGTH,
    );
  } catch {
    return [];
  }
}

function writeQueuedFeedback(queue: string[]) {
  try {
    if (queue.length) {
      window.localStorage.setItem(QUEUED_STORAGE_KEY, JSON.stringify(queue));
    } else {
      window.localStorage.removeItem(QUEUED_STORAGE_KEY);
    }
    return true;
  } catch {
    return false;
  }
}

export function FeedbackMenuItem({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isMobile = useIsMobile();
  // Hydrate the draft from localStorage so closing the menu (or even
  // navigating between routes) keeps whatever the user already typed.
  // Only a hard refresh / explicit submit / manual delete clears it.
  const [content, setContent] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      return window.localStorage.getItem(DRAFT_STORAGE_KEY) ?? "";
    } catch {
      return "";
    }
  });
  // Hang off the Feedback row down to the bottom of the account button,
  // matching the Status panel on every viewport.
  const { triggerRef, height: panelHeight } = useAccountAlignedPanel(open);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "sent" | "queued" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [queuedCount, setQueuedCount] = useState(() => readQueuedFeedback().length);
  const iconRef = useRef<MessageSquareIconHandle | null>(null);
  const flushingRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (content) {
        window.localStorage.setItem(DRAFT_STORAGE_KEY, content);
      } else {
        window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      }
    } catch {
      // Storage may be disabled (private mode, quota); fail silently.
    }
  }, [content]);

  const trimmed = content.trim();
  const canSubmit = trimmed.length > 0 && !submitting;

  const deliver = useCallback(async (message: string) => {
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: message,
        sourceUrl:
          typeof window !== "undefined" ? window.location.href : undefined,
      }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error || "Couldn't send feedback.");
    }
  }, []);

  const flushQueuedFeedback = useCallback(async () => {
    if (
      typeof navigator === "undefined" ||
      !navigator.onLine ||
      flushingRef.current
    )
      return;
    const queue = readQueuedFeedback();
    if (!queue.length) return;
    flushingRef.current = true;
    setSubmitting(true);
    setStatus("idle");
    setErrorMessage(null);
    try {
      while (queue.length && navigator.onLine) {
        await deliver(queue[0]);
        queue.shift();
        if (!writeQueuedFeedback(queue)) {
          throw new Error("Couldn't update queued feedback.");
        }
      }
      setQueuedCount(queue.length);
      setStatus(queue.length ? "queued" : "sent");
    } catch (error) {
      setQueuedCount(readQueuedFeedback().length);
      setStatus(navigator.onLine ? "error" : "queued");
      setErrorMessage(
        error instanceof Error ? error.message : "Couldn't send feedback.",
      );
    } finally {
      flushingRef.current = false;
      setSubmitting(false);
    }
  }, [deliver]);

  useEffect(() => {
    const retry = () => void flushQueuedFeedback();
    window.addEventListener("online", retry);
    retry();
    return () => window.removeEventListener("online", retry);
  }, [flushQueuedFeedback]);

  async function submit() {
    if (!canSubmit) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      const queue = [...readQueuedFeedback(), trimmed];
      if (!writeQueuedFeedback(queue)) {
        setStatus("error");
        setErrorMessage("Couldn't save feedback for later.");
        return;
      }
      setQueuedCount(queue.length);
      setStatus("queued");
      setErrorMessage(null);
      setContent("");
      return;
    }
    setSubmitting(true);
    setStatus("idle");
    setErrorMessage(null);
    try {
      await deliver(trimmed);
      setStatus("sent");
      setContent("");
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Couldn't send feedback.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      void submit();
    }
  }

  useEffect(() => {
    if (status !== "sent") return;
    const timer = setTimeout(() => setStatus("idle"), 2400);
    return () => clearTimeout(timer);
  }, [status]);

  return (
    // The account menu owns the active panel so Status and Feedback cannot
    // remain selected at the same time.
    <DropdownMenuSub
      open={open}
      onOpenChange={(next) =>
        applyAccountSubmenuOpenChange(isMobile, next, onOpenChange)
      }
    >
      <DropdownMenuSubTrigger
        ref={triggerRef}
        onMouseEnter={() => iconRef.current?.startAnimation()}
        onMouseLeave={() => iconRef.current?.stopAnimation()}
        onPointerDown={(event) => {
          // Touch: toggle so a second tap closes it. Mouse keeps Radix's
          // hover-driven open/close. Radix still emits a close after this
          // preventDefault; applyAccountSubmenuOpenChange drops that close.
          if (event.pointerType !== "mouse") {
            event.preventDefault();
            onOpenChange(!open);
          }
        }}
        className={cn(
          "group/feedback",
          ACCOUNT_MENU_ITEM_CLASS,
          "[&>svg:last-of-type]:hidden",
        )}
      >
        <MessageSquareIcon
          ref={iconRef}
          size={14}
          className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center leading-none"
        />
        <span className="flex-1 text-left">Feedback</span>
        <ChevronLeft
          className={cn(
            DROPDOWN_SUB_CHEVRON_CLASS,
            "group-hover/feedback:rotate-180 group-hover/feedback:text-[var(--creed-text-primary)]",
            open && "rotate-180 text-[var(--creed-text-primary)]",
          )}
        />
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent
          // Mirror the perceived vertical gap between the profile dropdown
          // and its trigger button. alignOffset 0 lines the panel's top edge
          // up with the top of the Feedback row.
          sideOffset={14}
          alignOffset={0}
          style={
            panelHeight
              ? {
                  height: panelHeight,
                  minHeight: panelHeight,
                  maxHeight: panelHeight,
                }
              : undefined
          }
          className={cn(
            "relative flex w-[min(240px,calc(100vw-2.5rem))] flex-col overflow-hidden border-[var(--creed-border)] bg-[var(--creed-surface)] p-0 md:w-[340px]",
            // Bridging pseudo spans the sideOffset gap so the cursor can
            // travel from the row into the panel without dismissing it.
            "before:pointer-events-auto before:absolute before:-left-4 before:top-0 before:bottom-0 before:w-4 before:content-['']",
          )}
          onKeyDown={(event) => event.stopPropagation()}
        >
          {/* The panel height is the Feedback row through the account button.
              The field fills leftover space so the footer keeps its gap and
              the box cannot grow past that edge. */}
          <div className="flex h-full min-h-0 flex-col p-2.5">
            <Textarea
              value={content}
              onChange={(event) =>
                setContent(event.target.value.slice(0, MAX_LENGTH))
              }
              onKeyDown={handleKeyDown}
              placeholder={
                isMobile
                  ? "Have an idea or found a bug?"
                  : "Have an idea or found a bug? Tell us…"
              }
              rows={3}
              disabled={submitting || status === "sent"}
              style={{ fieldSizing: "fixed" }}
              className="min-h-0 flex-1 resize-none rounded-[9px] border-[var(--creed-border)] bg-transparent px-3 py-2.5 text-sm leading-5 placeholder:text-[var(--creed-text-tertiary)]"
            />
            <div className="mt-2.5 flex shrink-0 items-center justify-between gap-2">
              <AnimatePresence mode="wait" initial={false}>
                {status === "sent" ? (
                  <motion.span
                    key="sent"
                    initial={{ opacity: 0, y: 2 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -2 }}
                    transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                    className="text-[12px] font-medium text-[var(--creed-success,#16A34A)]"
                  >
                    Thanks, feedback sent.
                  </motion.span>
                ) : status === "queued" ? (
                  <motion.span
                    key="queued"
                    initial={{ opacity: 0, y: 2 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -2 }}
                    transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                    className="text-[12px] font-medium text-[var(--creed-accent)]"
                  >
                    Saved. We&apos;ll send it later.
                  </motion.span>
                ) : status === "error" ? (
                  <motion.span
                    key="error"
                    initial={{ opacity: 0, y: 2 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -2 }}
                    transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                    className="truncate text-[12px] font-medium text-[var(--creed-danger,#DC2626)]"
                  >
                    {errorMessage ?? "Couldn't send."}
                  </motion.span>
                ) : (
                  <motion.span
                    key="hint"
                    initial={{ opacity: 0, y: 2 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -2 }}
                    transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                    className="text-[12px] text-[var(--creed-text-tertiary)]"
                  >
                    Send feedback to{" "}
                    <a
                      href="https://hpbrn.com"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void invoke("open_external_link", {
                          url: "https://hpbrn.com",
                        }).catch(() => undefined);
                      }}
                      className="font-medium text-[var(--creed-accent)] transition-colors hover:text-[var(--creed-accent-hover)]"
                    >
                      hpbrn
                    </a>
                    {" "}here.
                  </motion.span>
                )}
              </AnimatePresence>
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void submit();
                }}
                disabled={!canSubmit}
                className={cn(
                  "inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-2.5 text-sm font-medium transition-colors",
                  canSubmit
                    ? "bg-[var(--creed-accent)] text-white hover:bg-[var(--creed-accent-hover)]"
                    : "bg-[var(--creed-surface-raised)] text-[var(--creed-text-tertiary)]",
                )}
              >
                {submitting
                  ? "Sending…"
                  : status === "sent"
                    ? "Sent"
                    : status === "queued"
                      ? `Queued${queuedCount > 1 ? ` (${queuedCount})` : ""}`
                      : "Send"}
                <DelayedSpinner pending={submitting} className="h-4 w-4 animate-spin" />
              </button>
            </div>
          </div>
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  );
}
