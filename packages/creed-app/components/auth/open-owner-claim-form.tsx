"use client";

import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@creed/ui/utils";

const OWNER_CODE_LENGTH = 8;
const OWNER_CODE_GROUPS = [4, 4] as const;
const DIGIT_EASE = [0.22, 1, 0.36, 1] as const;
const OWNER_CODE_CLAIM_FAILED = "Could not open this installation.";
export const OPEN_OWNER_OK_STORAGE_KEY = "creed:open-owner-ok";

function onlyDigits(value: string) {
  return value.replace(/\D/g, "").slice(0, OWNER_CODE_LENGTH);
}

function rememberOpenOwnerOk() {
  try {
    window.localStorage.setItem(OPEN_OWNER_OK_STORAGE_KEY, "1");
  } catch {
    // Private mode or blocked storage must not block a successful claim.
  }
}

function DigitCell({
  digit,
  delay,
  invalid,
  disabled,
  inputRef,
  index,
  onChange,
  onKeyDown,
  onPaste,
}: {
  digit: string;
  delay: number;
  invalid: boolean;
  disabled: boolean;
  inputRef: (element: HTMLInputElement | null) => void;
  index: number;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onPaste: (event: ClipboardEvent<HTMLInputElement>) => void;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative h-10 w-10 shrink-0">
      {/* Opacity 0 so native selection cannot paint the real digit over the mask.
          Global `.dark ::selection` would otherwise show both glyphs at once.
          iOS still draws a caret through opacity 0, so hide it on mobile. */}
      <input
        ref={inputRef}
        id={index === 0 ? "owner-code" : undefined}
        type="text"
        inputMode="numeric"
        autoComplete={index === 0 ? "one-time-code" : "off"}
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        pattern="[0-9]*"
        size={1}
        maxLength={index === 0 ? OWNER_CODE_LENGTH : 1}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-label={`Digit ${index + 1} of ${OWNER_CODE_LENGTH}`}
        value={digit}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        onFocus={(event) => event.currentTarget.select()}
        onMouseUp={(event) => event.currentTarget.select()}
        className="peer absolute inset-0 z-10 h-10 w-10 cursor-text text-[17px] opacity-0 outline-none selection:bg-transparent! selection:text-transparent! max-md:caret-transparent"
      />
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none flex h-10 items-center justify-center overflow-hidden rounded-[14px] border bg-[var(--creed-surface)] text-[17px] font-medium tabular-nums text-[var(--creed-text-primary)] select-none transition-colors peer-focus-visible:ring-2",
          invalid
            ? "border-[#ef4444] peer-focus-visible:border-[#ef4444] peer-focus-visible:ring-[#ef4444]/15"
            : "border-[var(--creed-border)] peer-focus-visible:border-[var(--creed-accent)] peer-focus-visible:ring-[var(--creed-accent)]/15",
        )}
      >
        <AnimatePresence>
          {digit ? (
            <motion.span
              key={digit}
              className="inline-block text-[22px] leading-none"
              initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.72 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.84 }}
              transition={{ duration: 0.18, delay, ease: DIGIT_EASE }}
            >
              •
            </motion.span>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function OpenOwnerClaimForm({ nextPath = "/file" }: { nextPath?: string }) {
  const router = useRouter();
  const [digits, setDigits] = useState(() => Array.from({ length: OWNER_CODE_LENGTH }, () => ""));
  const [delays, setDelays] = useState(() => Array.from({ length: OWNER_CODE_LENGTH }, () => 0));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const inFlight = useRef(false);
  const secret = digits.join("");
  const invalid = Boolean(error);

  useEffect(() => {
    inputRefs.current[0]?.focus();
    router.prefetch(nextPath);
  }, [nextPath, router]);

  function focusIndex(index: number) {
    inputRefs.current[Math.max(0, Math.min(OWNER_CODE_LENGTH - 1, index))]?.focus();
  }

  function applyDigits(next: string[], nextFocus: number, stagger = false) {
    if (stagger) {
      let step = 0;
      setDelays(
        next.map((digit, index) => {
          if (digit && digit !== digits[index]) return step++ * 0.035;
          return 0;
        }),
      );
    } else {
      setDelays(Array.from({ length: OWNER_CODE_LENGTH }, () => 0));
    }
    setDigits(next);
    setError(null);
    queueMicrotask(() => focusIndex(nextFocus));
    // Claim from this update, not an effect. Effects run after the keypress
    // gesture ends, so the eighth digit used to sit idle until Enter.
    const nextSecret = next.join("");
    if (nextSecret.length === OWNER_CODE_LENGTH) {
      void submitClaim(nextSecret);
    }
  }

  function handleDigitChange(index: number, value: string) {
    const incoming = onlyDigits(value);
    if (!incoming) {
      const next = [...digits];
      next[index] = "";
      applyDigits(next, index);
      return;
    }
    const next = [...digits];
    if (incoming.length === 1) {
      next[index] = incoming;
      applyDigits(next, index + 1);
      return;
    }
    incoming.split("").forEach((digit, offset) => {
      if (index + offset < OWNER_CODE_LENGTH) next[index + offset] = digit;
    });
    applyDigits(next, index + incoming.length, true);
  }

  async function submitClaim(code: string) {
    if (code.length !== OWNER_CODE_LENGTH || inFlight.current) return;

    inFlight.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/open/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: code }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error || OWNER_CODE_CLAIM_FAILED);
      }
      rememberOpenOwnerOk();
      window.location.assign(nextPath);
    } catch (claimError) {
      setError(
        claimError instanceof Error
          ? claimError.message
          : OWNER_CODE_CLAIM_FAILED,
      );
      setSubmitting(false);
      inFlight.current = false;
    }
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      if (secret.length === OWNER_CODE_LENGTH && !submitting) {
        void submitClaim(secret);
      }
      return;
    }
    if (/^[0-9]$/.test(event.key) && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      handleDigitChange(index, event.key);
      return;
    }
    if (event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault();
      const next = [...digits];
      if (digits[index]) {
        next[index] = "";
        applyDigits(next, index);
        return;
      }
      if (index > 0) {
        next[index - 1] = "";
        applyDigits(next, index - 1);
      }
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusIndex(index - 1);
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusIndex(index + 1);
    }
  }

  function handlePaste(index: number, event: ClipboardEvent<HTMLInputElement>) {
    const pasted = onlyDigits(event.clipboardData.getData("text"));
    if (!pasted) return;
    event.preventDefault();
    const next = [...digits];
    pasted.split("").forEach((digit, offset) => {
      if (index + offset < OWNER_CODE_LENGTH) next[index + offset] = digit;
    });
    applyDigits(next, index + pasted.length, true);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (secret.length === OWNER_CODE_LENGTH) {
      void submitClaim(secret);
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-busy={submitting || undefined} className="w-auto">
      <h1 className="text-center text-[1.5rem] font-medium tracking-[-0.03em] text-[var(--creed-text-primary)]">
        Enter code
      </h1>
      <p
        aria-live="polite"
        role={error && !submitting ? "alert" : undefined}
        className={cn(
          "mt-2 min-h-[1.25rem] text-center text-[13px]",
          error && !submitting
            ? "text-[#ef4444]"
            : "text-[var(--creed-text-secondary)]",
        )}
      >
        {submitting ? "Opening your Creed." : error ? error : "\u00a0"}
      </p>
      {/* Fieldsets default to min-inline-size: min-content and would overflow the page. */}
      <fieldset className="mt-6 min-w-0 min-is-0">
        <legend className="sr-only">Owner code</legend>
        <div className={cn("flex w-auto items-center justify-center gap-1.5", submitting && "opacity-55")}>
          {OWNER_CODE_GROUPS.map((groupSize, groupIndex) => {
            const start = OWNER_CODE_GROUPS.slice(0, groupIndex).reduce(
              (total, size) => total + size,
              0,
            );
            return (
              <div key={groupIndex} className="contents">
                {groupIndex > 0 ? (
                  <span
                    aria-hidden="true"
                    className="shrink-0 text-[15px] text-[var(--creed-text-tertiary)]"
                  >
                    -
                  </span>
                ) : null}
                <div className="flex items-center gap-1">
                  {Array.from({ length: groupSize }, (_, offset) => {
                    const index = start + offset;
                    return (
                      <DigitCell
                        key={index}
                        digit={digits[index]}
                        delay={delays[index]}
                        invalid={invalid}
                        disabled={submitting}
                        inputRef={(element) => {
                          inputRefs.current[index] = element;
                        }}
                        index={index}
                        onChange={(value) => handleDigitChange(index, value)}
                        onKeyDown={(event) => handleKeyDown(index, event)}
                        onPaste={(event) => handlePaste(index, event)}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </fieldset>
    </form>
  );
}
