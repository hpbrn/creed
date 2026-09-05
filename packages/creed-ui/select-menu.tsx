"use client";

import type { ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import {
  DROPDOWN_CHEVRON_CLASS,
  DROPDOWN_CONTENT_CLASS,
  DROPDOWN_ITEM_CLASS,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@creed/ui/dropdown-menu";
import { cn } from "@creed/ui/utils";

// A small, consistent single-select built on our DropdownMenu (never a native
// <select>, which renders the OS control and breaks the design language). Used
// for role / permission pickers across the Shared UI. The current value is the
// trailing tick only; hover/focus still highlight the row.
export type SelectMenuOption<T extends string> = {
  value: T;
  label: string;
  avatar?: ReactNode;
};

export function SelectMenu<T extends string>({
  value,
  options,
  onChange,
  className,
  disabled,
  align = "start",
  placeholder = "Select",
}: {
  value: T;
  options: SelectMenuOption<T>[];
  onChange: (value: T) => void;
  className?: string;
  disabled?: boolean;
  align?: "start" | "end";
  // Shown on the trigger (muted) when nothing is selected. It is NOT a menu
  // item, so it can never be picked and there's no way to deselect back to it.
  placeholder?: string;
}) {
  const active = options.find((option) => option.value === value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "inline-flex h-9 items-center justify-between gap-2 rounded-md border border-[var(--creed-border)] bg-[var(--creed-surface)] px-3 text-[13px] text-[var(--creed-text-primary)] transition-colors duration-150 hover:bg-[var(--creed-surface-raised)] aria-expanded:bg-[var(--creed-surface-raised)] disabled:pointer-events-none disabled:opacity-60",
            active?.avatar && "pl-1.5",
            className,
          )}
        >
          {/* Placeholder reads as normal text (not greyed) - the disabled
              state alone (e.g. no members) dims the whole control. */}
          <span className="flex min-w-0 items-center gap-2">
            {active?.avatar}
            <span className="truncate">{active?.label ?? placeholder}</span>
          </span>
          <ChevronDown
            className={DROPDOWN_CHEVRON_CLASS}
            strokeWidth={2}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        // Size to content (so short labels like "Member" never truncate), but
        // never narrower than the trigger and never wider than a sensible cap.
        className={cn(
          DROPDOWN_CONTENT_CLASS,
          "w-auto min-w-[max(var(--radix-dropdown-menu-trigger-width),9rem)] max-w-[min(24rem,90vw)]",
        )}
      >
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onSelect={(event) => {
              event.preventDefault();
              onChange(option.value);
            }}
            className={cn(DROPDOWN_ITEM_CLASS, "justify-between")}
          >
            <span className="flex min-w-0 items-center gap-2 text-[var(--creed-text-primary)]">
              {option.avatar}
              <span className="truncate">{option.label}</span>
            </span>
            {option.value === value ? (
              <Check
                className="h-3.5 w-3.5 shrink-0 text-[var(--creed-text-secondary)]"
                strokeWidth={1.8}
              />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
