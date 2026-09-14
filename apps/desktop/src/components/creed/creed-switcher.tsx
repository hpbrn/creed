import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppNavigate, useAppPath } from "@/components/creed/app-navigation";
import { Check, ChevronDown, FileSearch, Plus, X } from "lucide-react";
import { action, pick, useWorkspace, workspace } from "@/lib/native/workspace";
import { toast } from "sonner";
import {
  DROPDOWN_AVATAR_ITEM_CLASS,
  DROPDOWN_CONTENT_CLASS,
  DROPDOWN_CHEVRON_CLASS,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useCreedActions,
  useCreedStateSelector,
} from "@/components/creed/creed-provider";
import type { CreedState } from "@/lib/creed/creed-data";
import { ShortcutKey } from "@/components/creed/shortcut-key";
import { ProfileAvatar } from "@/components/creed/profile-avatar";
import { NewCreedDialog } from "@/components/creed/new-creed-dialog";
import { cn } from "@/components/ui/utils";

const LAST_ACTIVE_CREED_KEY = "creed:last-active-creed";
const SWITCHER_PRESS_CLASS =
  "creed-press-surface";

// The Creed switcher, rendered as the file-screen header title. Shows the active
// Creed's picture beside its Markdown filename, with a dropdown arrow and
// keyboard affordance. The menu remains available with one Creed because
// creation is part of the switcher.
const TITLE_CLASS =
  "font-heading text-[19px] font-medium leading-none tracking-[-0.03em] text-[var(--creed-text-primary)]";

function sameSwitcherState(left: CreedState, right: CreedState) {
  return (
    left.creedId === right.creedId &&
    left.creedType === right.creedType &&
    left.shared === right.shared &&
    left.creeds === right.creeds &&
    left.user === right.user
  );
}

export function CreedSwitcher() {
  const native = useWorkspace();
  const [menuOpen, setMenuOpen] = useState(false);
  const openedMissingRef = useRef<string | null>(null);
  const { switchCreed } = useCreedActions();
  const state = useCreedStateSelector(
    (snapshot) => snapshot,
    sameSwitcherState,
  );
  const navigate = useAppNavigate();
  const pathname = useAppPath();
  const [switching, setSwitching] = useState(false);
  const [optimisticId, setOptimisticId] = useState<string | null>(null);
  const [newCreedOpen, setNewCreedOpen] = useState(false);
  const previousActiveIdRef = useRef<string | null>(null);

  const creeds = useMemo(() => state.creeds ?? [], [state.creeds]);
  const activeId =
    state.creedId ??
    creeds.find((c) => c.type === "personal")?.id ??
    creeds[0]?.id ??
    null;
  const shownActiveId = optimisticId ?? activeId;
  const activeMissing = native.documents.some(
    (item) => item.id === activeId && item.missing,
  );
  useEffect(() => {
    if (!activeMissing) {
      openedMissingRef.current = null;
      return;
    }
    if (openedMissingRef.current !== activeId) {
      openedMissingRef.current = activeId;
      setMenuOpen(true);
    }
  }, [activeId, activeMissing]);
  const optimisticCreed = useMemo(
    () => creeds.find((creed) => creed.id === shownActiveId) ?? null,
    [creeds, shownActiveId],
  );
  const displayName = optimisticCreed
    ? optimisticCreed.name
    : state.creedType === "shared"
      ? (state.shared?.creedName ?? "Shared")
      : state.user.name;
  const hasMarkdownSuffix = /\.md$/i.test(displayName);
  const headerKind =
    (optimisticCreed?.type ?? state.creedType) === "shared"
      ? "shared"
      : "person";
  const headerAvatarUrl =
    optimisticCreed?.avatarUrl ??
    (headerKind === "shared" ? state.shared?.avatarUrl : state.user.avatarUrl);
  const headerInitials =
    optimisticCreed?.avatarInitials ??
    (headerKind === "shared" ? undefined : state.user.avatarInitials);

  useEffect(() => {
    if (optimisticId && activeId === optimisticId) {
      setOptimisticId(null);
    }
  }, [activeId, optimisticId]);

  const switchTo = useCallback(
    async (creed: { id: string }) => {
      if (workspace().documents.find((item) => item.id === creed.id)?.missing) {
        setMenuOpen(true);
        toast.error("Locate this file to open it.", {
          id: `missing-${creed.id}`,
        });
        return;
      }
      if (creed.id === activeId) return;
      setSwitching(true);
      setOptimisticId(creed.id);
      try {
        // Instant, client-side swap: replaces provider state wholesale, no full
        // route refresh.
        const result = await switchCreed(creed.id);
        if (!result.ok) {
          toast.error(result.error ?? "Could not switch Creed.");
          setOptimisticId(null);
          if (
            workspace().documents.find((item) => item.id === creed.id)?.missing
          )
            setMenuOpen(true);
        }
        setSwitching(false);
      } catch {
        toast.error("Could not switch Creed.");
        setOptimisticId(null);
        setSwitching(false);
      }
    },
    [activeId, switchCreed],
  );

  useEffect(() => {
    if (!activeId) return;
    const previous = previousActiveIdRef.current;
    if (previous && previous !== activeId) {
      try {
        window.localStorage.setItem(LAST_ACTIVE_CREED_KEY, previous);
      } catch {}
    }
    previousActiveIdRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    function isEditable(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target.isContentEditable
      );
    }

    function onKeyDown(event: KeyboardEvent) {
      const isNewCreedShortcut = event.key === "n" || event.key === "N";
      if (!isNewCreedShortcut && event.key !== "c" && event.key !== "C") return;
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey)
        return;
      if (event.isComposing || event.repeat || event.defaultPrevented) return;
      if (
        isEditable(event.target) ||
        switching ||
        (!isNewCreedShortcut && !activeId)
      )
        return;

      event.preventDefault();

      if (isNewCreedShortcut) {
        setMenuOpen(false);
        setNewCreedOpen(true);
        return;
      }

      let targetId: string | null = null;
      try {
        const stored = window.localStorage.getItem(LAST_ACTIVE_CREED_KEY);
        if (
          stored &&
          stored !== activeId &&
          creeds.some((creed) => creed.id === stored)
        ) {
          targetId = stored;
        }
      } catch {}

      if (!targetId) {
        const currentIndex = creeds.findIndex((creed) => creed.id === activeId);
        const nextIndex =
          currentIndex >= 0 ? (currentIndex + 1) % creeds.length : 0;
        targetId = creeds[nextIndex]?.id ?? null;
      }

      const target = targetId
        ? creeds.find((creed) => creed.id === targetId)
        : undefined;
      if (target) {
        void switchTo(target);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeId, creeds, switchTo, switching]);

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <div
          data-toolbar-title
          className="inline-flex h-8 w-max shrink-0 items-center gap-2.5"
        >
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Switch Creed"
              disabled={switching}
              className="group/switcher inline-flex h-8 min-w-0 max-w-full rounded-sm text-left text-[var(--creed-text-secondary)] outline-none hover:text-[var(--creed-text-primary)] focus-visible:text-[var(--creed-text-primary)] disabled:opacity-70"
            >
              <span
                className={cn(
                  "inline-flex h-full min-w-0 max-w-full items-center gap-2.5 rounded-sm px-1 group-hover/switcher:bg-[var(--creed-surface-raised)] group-data-[state=open]/switcher:bg-[var(--creed-surface-raised)] group-focus-visible/switcher:outline-2 group-focus-visible/switcher:outline-ring",
                  SWITCHER_PRESS_CLASS,
                )}
              >
                <ProfileAvatar
                  kind={headerKind}
                  name={displayName}
                  initials={headerInitials}
                  avatarUrl={headerAvatarUrl}
                  size="sm"
                />
                <span
                  className={cn(TITLE_CLASS, "inline-flex min-w-0 max-w-full")}
                >
                  <span className="min-w-0 truncate">{displayName}</span>
                  {hasMarkdownSuffix ? null : (
                    <span className="shrink-0">.md</span>
                  )}
                </span>
                <ChevronDown
                  className={cn(
                    DROPDOWN_CHEVRON_CLASS,
                    "-translate-x-0.5 text-[var(--creed-text-primary)]!",
                  )}
                  strokeWidth={2}
                />
              </span>
            </button>
          </DropdownMenuTrigger>
          <ShortcutKey>C</ShortcutKey>
        </div>
        <DropdownMenuContent
          align="start"
          className={cn(DROPDOWN_CONTENT_CLASS, "min-w-[250px]")}
        >
          {creeds.map((creed) => {
            const label = creed.name;
            const isActive = creed.id === shownActiveId;
            const missing = native.documents.some(
              (item) => item.id === creed.id && item.missing,
            );
            return (
              <DropdownMenuItem
                key={creed.id}
                disabled={switching}
                onSelect={(event) => {
                  if (missing) event.preventDefault();
                  void switchTo(creed);
                }}
                className={cn(
                  DROPDOWN_AVATAR_ITEM_CLASS,
                  "group/creed-row justify-between",
                )}
              >
                <span className="flex min-w-0 items-center gap-2 text-[var(--creed-text-primary)]">
                  <ProfileAvatar
                    kind={creed.type === "shared" ? "shared" : "person"}
                    name={label}
                    initials={creed.avatarInitials}
                    avatarUrl={creed.avatarUrl}
                    size="sm"
                  />
                  <span className="min-w-0 truncate">{label}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  {missing ? (
                    <button
                      type="button"
                      aria-label={`Locate ${label}`}
                      disabled={switching}
                      className="creed-switcher-locate flex h-6 w-6 items-center justify-center rounded-[7px] opacity-0 transition-[opacity,background-color] duration-[160ms] group-hover/creed-row:opacity-100 focus-visible:opacity-100"
                      onPointerDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                      }}
                      onPointerUp={(event) => event.stopPropagation()}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ")
                          event.stopPropagation();
                      }}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setSwitching(true);
                        void pick(false, creed.id)
                          .then((located) => {
                            setMenuOpen(!located);
                            if (located && pathname !== "/file")
                              navigate("/file");
                          })
                          .catch((error: unknown) => {
                            toast.error(String(error));
                            setMenuOpen(true);
                          })
                          .finally(() => setSwitching(false));
                      }}
                    >
                      <FileSearch className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                  {isActive ? (
                    <span className="-mr-2 flex h-7 w-7 shrink-0 items-center justify-center">
                      <Check
                        className="h-3.5 w-3.5 text-[var(--creed-text-primary)]!"
                        strokeWidth={1.8}
                      />
                    </span>
                  ) : (
                    <span className="-mr-2 flex h-7 w-7 shrink-0 items-center justify-center">
                      <button
                        type="button"
                        aria-label={`Remove ${label} from switcher`}
                        className="creed-switcher-remove flex h-6 w-6 items-center justify-center rounded-[7px] opacity-0 transition-[opacity,background-color] duration-[160ms] group-hover/creed-row:opacity-100 focus-visible:opacity-100"
                        onPointerDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                        }}
                        onPointerUp={(event) => event.stopPropagation()}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ")
                            event.stopPropagation();
                        }}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          void action(creed.id, { kind: "remove" }).catch(
                            (error: unknown) => toast.error(String(error)),
                          );
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  )}
                </span>
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator className="mx-0 bg-[var(--creed-border)]" />
          <DropdownMenuItem
            disabled={switching}
            onSelect={() => setNewCreedOpen(true)}
            className={cn(DROPDOWN_AVATAR_ITEM_CLASS, "justify-between")}
          >
            <span className="flex min-w-0 items-center gap-2 text-[var(--creed-text-primary)]">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[8px] border border-dashed border-[var(--creed-border-strong)] bg-[var(--creed-surface-raised)]">
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <span className="min-w-0 truncate">New Creed</span>
            </span>
            <ShortcutKey className="translate-x-0.5">N</ShortcutKey>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <NewCreedDialog
        open={newCreedOpen}
        onOpenChange={setNewCreedOpen}
        accountName={state.user.name}
        initials={state.user.avatarInitials}
        onCreated={async (creed) => {
          setSwitching(true);
          setOptimisticId(creed.id);
          const result = await switchCreed(creed.id);
          if (!result.ok) {
            setSwitching(false);
            setOptimisticId(null);
            throw new Error(result.error ?? "Could not open this Creed.");
          }
          setSwitching(false);
          if (pathname !== "/file") {
            navigate("/file");
          }
        }}
      />
    </>
  );
}
