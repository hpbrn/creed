import { downloadFile } from "@/lib/native/export";
import { nativeRequest as fetch } from "@/lib/native/request";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Link2,
  Unlink2,
} from "lucide-react";
import { DownloadIcon } from "@/components/ui/download";
import { useRouter } from "@/components/creed/app-navigation";
import { useAppNavigate } from "@/components/creed/app-navigation";
import {
  DROPDOWN_CHEVRON_CLASS,
  DROPDOWN_CONTENT_CLASS,
  DROPDOWN_ITEM_CLASS,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  consumeSettingsPanelIntent,
  SETTINGS_PANEL_INTENT_EVENT,
} from "@/lib/panel/settings-intent";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { StackedRoundedBar } from "@/components/creed/rounded-bar";
import { SkeletonBar, SkeletonText } from "@/components/creed/loading-skeleton";
import { AnimatedIconButton } from "@/components/creed/animated-icon-action";
import { SwapLabel } from "@/components/creed/swap-label";
import { toast } from "sonner";
import { DelayedSpinner } from "@/components/ui/delayed-spinner";

import { useCreed } from "@/components/creed/creed-provider";
import { useCreedEdition } from "@/components/creed/edition-provider";

import {
  clearSettingsOpenRouterBalanceCache,
  clearSettingsUsageCache,
  loadSettingsAiSettings,
  loadSettingsOpenRouterBalance,
  loadSettingsUsage,
  setCachedSettingsAiSettings,
  type AiMode,
  type AiUsageRange,
  type AiUsageSummary,
  type OpenRouterBalance,
  type PublicAiSettings,
} from "@/components/creed/settings-preload";
import { AI_FEATURES, featureMeta } from "@/lib/ai/features";
import { creedMarkdownFilename } from "@/lib/creed-filename";
import {
  accentColorMap,
  type AgentPermission,
  type IntegrationConnectionStatus,
} from "@/lib/creed/creed-data";
import { cn } from "@/components/ui/utils";
import {
  EditableProfileAvatar,
  SettingsProfileLayout,
} from "@/components/creed/profile-avatar";
import { ArchivedSectionHeading } from "@/components/creed/archived-section-heading";
import {
  FileSectionReadOnly,
  fileSectionTagTargets,
} from "@/components/creed/file-presentation";
import { SectionAccentMark } from "@/components/creed/section-accent-mark";
import {
  GLOBAL_PERMISSION_OPTIONS,
  SectionPermissionControl,
} from "@/components/creed/section-permission-control";

const GITHUB_AUTHORIZED_APPS_URL =
  "https://github.com/settings/connections/applications";

function looksLikeApiKey(value: string) {
  const trimmed = value.trim();
  return trimmed.length >= 20 && /^[A-Za-z0-9._-]+$/.test(trimmed);
}

export function SettingsScreen({
  active: _active = true,
}: {
  active?: boolean;
}) {
  return <PersonalSettingsScreen />;
}

function PersonalSettingsScreen() {
  const router = useRouter();
  const navigate = useAppNavigate();
  const hasManagedCredits = useCreedEdition().capabilities.managedCredits;
  const {
    state,
    setSectionPermission,
    setAllSectionPermissions,
    exportMarkdown,
    exportActivityJson,
    exportAllDataJson,
    refreshState,
    setProfileAvatar,
    restoreSection,
    deleteSection,
  } = useCreed();
  const activeCreed = state.creeds?.find((creed) => creed.id === state.creedId);
  const activeCreedName = (activeCreed?.name ?? state.user.name).replace(
    /\.(md|markdown)$/i,
    "",
  );
  const [nameDraft, setNameDraft] = useState(activeCreedName);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [archivedDeleteTarget, setArchivedDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [expandedArchived, setExpandedArchived] = useState<string | null>(null);
  const archivedSections = state.sections.filter((section) => section.archived);
  const liveSections = state.sections.filter((section) => !section.archived);
  const sectionTagTargets = useMemo(
    () => fileSectionTagTargets(state.sections),
    [state.sections],
  );
  const [permsOpen, setPermsOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [aiSettings, setAiSettings] = useState<PublicAiSettings>({
    provider: "openrouter",
    keyStatus: "missing",
    aiMode: "byok",
  });
  const [aiKeyDraft, setAiKeyDraft] = useState("");
  const [aiSaving, setAiSaving] = useState(false);
  const [usageRange, setUsageRange] = useState<AiUsageRange>("all");
  const [usage, setUsage] = useState<AiUsageSummary | null>(null);
  const [openRouterBalance, setOpenRouterBalance] =
    useState<OpenRouterBalance | null>(null);
  const canSaveAiKey = looksLikeApiKey(aiKeyDraft) && !aiSaving;

  // The global control reflects the shared level of all live, non-hidden
  // sections, or nothing when they differ (mixed). Hidden and archived
  // sections are ignored here.
  const uniformPermission: AgentPermission | null = (() => {
    const perms = liveSections
      .filter((section) => section.agentPermission !== "hidden")
      .map((section) => section.agentPermission);
    return perms.length > 0 && perms.every((perm) => perm === perms[0])
      ? perms[0]
      : null;
  })();

  // Stats for the Data card: gives the export buttons a sense of weight
  // ("this is everything you've built") without being a dashboard. Rendered
  // as small mono chips.
  const dataStats = useMemo(() => {
    const sectionCount = state.sections.length;
    const wordCount = exportMarkdown()
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
    return { sectionCount, wordCount };
  }, [state.sections, exportMarkdown]);

  useEffect(() => {
    setNameDraft(activeCreedName);
  }, [activeCreedName]);

  async function saveCreedName() {
    const next = nameDraft.trim().replace(/\.(md|markdown)$/i, "");
    if (!next || !state.creedId || next === activeCreedName) {
      setNameDraft(activeCreedName);
      return;
    }
    const res = await fetch("/api/app/creeds/general", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creedId: state.creedId, name: next }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(data.error ?? "Could not update Creed name.");
      setNameDraft(activeCreedName);
      return;
    }
    setNameDraft(next);
    toast.success("Creed name updated.");
    void refreshState();
  }

  async function uploadCreedAvatar(file: File) {
    if (!state.creedId) return;
    setAvatarUploading(true);
    try {
      const form = new FormData();
      form.set("scope", "creed");
      form.set("creedId", state.creedId);
      form.set("file", file);
      const response = await fetch("/api/app/profile/avatar", {
        method: "POST",
        body: form,
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        avatarUrl?: string;
      };
      if (!response.ok) {
        toast.error(data.error ?? "Could not save Creed picture.");
        return;
      }
      if (data.avatarUrl) {
        setProfileAvatar(data.avatarUrl, "creed");
      }
      void refreshState();
      toast.success("Creed picture saved.");
    } finally {
      setAvatarUploading(false);
    }
  }

  // After the standalone GitHub OAuth round-trip, the callback redirects back to
  // /settings?github=<status>. Toast it, bump the refresh tick so repos /
  // branches / sync-status refetch, then strip the param so a reload doesn't
  // re-toast.

  useEffect(() => {
    let cancelled = false;

    async function loadAiSettings() {
      try {
        const settings = await loadSettingsAiSettings();
        if (!cancelled && settings) {
          setAiSettings({ ...settings, aiMode: "byok" });
        }
      } catch {
        return;
      }
    }

    void loadAiSettings();

    return () => {
      cancelled = true;
    };
  }, [hasManagedCredits]);

  useEffect(() => {
    let cancelled = false;

    async function loadUsage() {
      try {
        const loadedUsage = await loadSettingsUsage(
          usageRange,
          aiSettings.aiMode,
          state.creedId,
        );
        if (!cancelled) {
          setUsage(loadedUsage);
        }
      } catch {
        return;
      }
    }

    void loadUsage();

    return () => {
      cancelled = true;
    };
  }, [usageRange, aiSettings.aiMode, aiSettings.keyStatus, state.creedId]);

  // The Panel intent consumer below runs in a mount-once effect, so it reads
  // the mode-change handler through a ref that tracks the latest render (the
  // handler closes over aiSettings and would otherwise be stale).
  const panelModeChangeRef = useRef<(mode: "credits" | "byok") => void>(
    () => {},
  );
  useEffect(() => {
    panelModeChangeRef.current = (mode: "credits" | "byok") =>
      void handleModeChange(mode);
  });

  // Panel → Settings intents: scroll to a section, set the usage range or
  // payment mode, open a dialog. Consumed once on mount (arriving via
  // navigation) and again on the intent event (already on /settings, so no
  // remount happens). Mirrors the file screen's nav-intent retry loop: the
  // section list renders in one pass, but the rAF retry keeps this robust if
  // that ever changes.
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let cancelled = false;
    let frameId = 0;

    const consume = () => {
      const intent = consumeSettingsPanelIntent();
      if (!intent || cancelled) {
        return;
      }
      if (intent.aiMode) {
        panelModeChangeRef.current("byok");
      }
      if (intent.usageRange) {
        setUsageRange(intent.usageRange);
      }
      const key = intent.scrollTo;
      if (!key) {
        return;
      }

      let attempts = 0;
      const tryScroll = () => {
        if (cancelled) {
          return;
        }
        const element = document.getElementById(`settings-${key}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
          // A soft pulse so the eye lands on the right section after the jump.
          element.animate(
            [
              {
                backgroundColor: "var(--creed-surface-raised)",
                borderRadius: "12px",
                offset: 0.15,
              },
              { backgroundColor: "transparent", borderRadius: "12px" },
            ],
            { duration: 1100, easing: "ease-out" },
          );
          return;
        }
        attempts += 1;
        if (attempts < 24) {
          frameId = window.requestAnimationFrame(tryScroll);
        }
      };
      frameId = window.requestAnimationFrame(tryScroll);
    };

    const timeoutId = window.setTimeout(consume, 120);
    window.addEventListener(SETTINGS_PANEL_INTENT_EVENT, consume);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      window.cancelAnimationFrame(frameId);
      window.removeEventListener(SETTINGS_PANEL_INTENT_EVENT, consume);
    };
  }, [hasManagedCredits]);

  // The BYOK card shows the user's live OpenRouter balance, but only when a
  // valid key is saved. Clears in credits mode or when the key is gone.
  useEffect(() => {
    if (aiSettings.aiMode !== "byok" || aiSettings.keyStatus !== "valid") {
      setOpenRouterBalance(null);
      return;
    }
    let cancelled = false;
    void loadSettingsOpenRouterBalance()
      .then((balance) => {
        if (!cancelled) setOpenRouterBalance(balance);
      })
      .catch(() => {
        if (!cancelled) setOpenRouterBalance(null);
      });
    return () => {
      cancelled = true;
    };
  }, [aiSettings.aiMode, aiSettings.keyStatus]);

  async function handleDeleteCreed() {
    if (!state.creedId || deleteConfirm !== activeCreedName || deleting) return;
    setDeleting(true);
    try {
      let preferredNextCreedId: string | null = null;
      try {
        preferredNextCreedId = window.localStorage.getItem(
          "creed:last-active-creed",
        );
      } catch {
        preferredNextCreedId = null;
      }
      const res = await fetch("/api/app/creeds", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creedId: state.creedId,
          preferredNextCreedId,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        nextCreedId?: string;
        createdBlankPersonal?: boolean;
      };
      if (!res.ok) {
        toast.error(data.error ?? "Could not delete this Creed.");
        return;
      }
      toast.success("Creed moved to Trash.");
      setDeleteOpen(false);
      navigate("/file");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  // GitHub is connected through the standalone "Creed" OAuth App (not Supabase
  // identity linking): a full-page redirect to /api/app/github/authorize, which
  // bounces through GitHub and back to /settings?github=<status> (handled above).

  async function handleSaveAiSettings() {
    if (!looksLikeApiKey(aiKeyDraft)) {
      return;
    }

    try {
      setAiSaving(true);
      const response = await fetch("/api/app/ai/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiKey: aiKeyDraft.trim() || undefined,
        }),
      });
      const payload = (await response.json()) as {
        settings?: PublicAiSettings;
        error?: string;
        warning?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Could not save AI settings.");
      }

      if (payload.settings) {
        setAiSettings(payload.settings);
        setCachedSettingsAiSettings(payload.settings);
        clearSettingsUsageCache();
      }
      setAiKeyDraft("");
      // A freshly saved key has a new OpenRouter balance to show.
      clearSettingsOpenRouterBalanceCache();
      void loadSettingsOpenRouterBalance()
        .then(setOpenRouterBalance)
        .catch(() => setOpenRouterBalance(null));
      if (payload.warning) toast.warning(payload.warning);
      else toast.success("API key saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save API key.");
    } finally {
      setAiSaving(false);
    }
  }

  async function handleClearAiKey() {
    try {
      setAiSaving(true);
      const response = await fetch("/api/app/ai/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clearApiKey: true,
        }),
      });
      const payload = (await response.json()) as {
        settings?: PublicAiSettings;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error || "Could not clear API key.");
      }
      if (payload.settings) {
        setAiSettings(payload.settings);
        setCachedSettingsAiSettings(payload.settings);
        clearSettingsUsageCache();
      }
      setAiKeyDraft("");
      clearSettingsOpenRouterBalanceCache();
      setOpenRouterBalance(null);
      toast.success("API key cleared");
    } catch {
      toast.error("Couldn't clear API key");
    } finally {
      setAiSaving(false);
    }
  }

  async function handleModeChange(mode: AiMode) {
    if (!hasManagedCredits && mode !== "byok") {
      return;
    }
    if (aiSettings.aiMode === mode) {
      return;
    }
    const previous = aiSettings.aiMode;
    setAiSettings((current) => ({ ...current, aiMode: mode }));
    try {
      const response = await fetch("/api/app/ai/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiMode: mode }),
      });
      const payload = (await response.json()) as {
        settings?: PublicAiSettings;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error || "Could not switch mode.");
      }
      if (payload.settings) {
        setAiSettings(payload.settings);
        setCachedSettingsAiSettings(payload.settings);
      }
    } catch {
      setAiSettings((current) => ({ ...current, aiMode: previous }));
      toast.error("Couldn't switch mode");
    }
  }

  return (
    <>
      <div className="h-full overflow-y-auto bg-[var(--creed-surface)] creed-scrollbar">
        <div className="mx-auto max-w-3xl px-8 py-10 md:px-14">
          <h1 className="font-heading text-[1.75rem] font-medium tracking-[-0.03em] text-[var(--creed-text-primary)]">
            Settings
          </h1>

          <section id="settings-identity" className="mt-10 scroll-mt-6">
            <h2 className="text-[16px] font-medium text-[var(--creed-text-primary)]">
              Identity
            </h2>
            <div className="mt-4 rounded-[var(--radius-xl)] border border-[var(--creed-border)] bg-[var(--creed-surface)] p-5">
              <SettingsProfileLayout
                avatar={
                  <EditableProfileAvatar
                    kind="person"
                    name={nameDraft.trim() || activeCreedName}
                    initials={state.user.avatarInitials}
                    avatarUrl={activeCreed?.avatarUrl ?? state.user.avatarUrl}
                    uploading={avatarUploading}
                    onFile={(file) => void uploadCreedAvatar(file)}
                  />
                }
                nameField={
                  <>
                    <label className="mb-2 block text-[14px] font-medium leading-5 text-[var(--creed-text-secondary)]">
                      Creed name
                    </label>
                    <Input
                      value={nameDraft}
                      onChange={(event) => setNameDraft(event.target.value)}
                      onBlur={() => void saveCreedName()}
                      className="h-11 rounded-xl border-[var(--creed-border)] bg-[var(--creed-surface)] px-4 text-[15px]"
                    />
                  </>
                }
              />
            </div>
          </section>

          <Separator className="my-10 bg-[var(--creed-border)]" />

          <section id="settings-agent-edits" className="scroll-mt-6">
            <h2 className="text-[16px] font-medium text-[var(--creed-text-primary)]">
              Agent edit behaviour
            </h2>
            <div className="mt-4 rounded-[var(--radius-xl)] border border-[var(--creed-border)] bg-[var(--creed-surface)] p-5 pb-4">
              <div className="flex items-center justify-between gap-5">
                <div>
                  <div className="text-[15px] font-medium text-[var(--creed-text-primary)]">
                    All sections
                  </div>
                </div>
                <SectionPermissionControl
                  value={uniformPermission}
                  onChange={(permission) => {
                    if (permission !== "hidden") {
                      setAllSectionPermissions(permission);
                    }
                  }}
                  layoutGroup="all-sections"
                  options={GLOBAL_PERMISSION_OPTIONS}
                />
              </div>

              {liveSections.length ? (
                <div className="mt-5 border-t border-[var(--creed-border)] pt-4">
                  <button
                    type="button"
                    onClick={() => setPermsOpen((open) => !open)}
                    // -my-2 py-2 keeps the text where it is but expands the
                    // clickable box by 16px vertically (the bare row was too thin
                    // a target).
                    className="group -my-2 flex w-full items-center justify-between py-2 text-left"
                  >
                    <span className="text-[14px] font-medium text-[var(--creed-text-primary)]">
                      Per-section permissions
                    </span>
                    <ChevronDown
                      className={cn(
                        DROPDOWN_CHEVRON_CLASS,
                        permsOpen &&
                          "rotate-180 text-[var(--creed-text-primary)]",
                      )}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {permsOpen ? (
                      <motion.div
                        initial={{ height: 0, opacity: 0, y: -8 }}
                        animate={{ height: "auto", opacity: 1, y: 0 }}
                        exit={{ height: 0, opacity: 0, y: -8 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 space-y-1">
                          {liveSections.map((section) => (
                            <div
                              key={section.id}
                              className="flex items-center justify-between gap-3 rounded-sm py-1.5"
                            >
                              <div className="flex min-w-0 items-center gap-2.5">
                                <SectionAccentMark
                                  color={accentColorMap[section.accent]}
                                />
                                <span className="truncate text-[14px] text-[var(--creed-text-primary)]">
                                  {section.name}
                                </span>
                              </div>
                              <SectionPermissionControl
                                value={section.agentPermission}
                                onChange={(permission) =>
                                  setSectionPermission(section.id, permission)
                                }
                                layoutGroup={section.id}
                              />
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              ) : null}
            </div>
          </section>

          <Separator className="my-10 bg-[var(--creed-border)]" />

          <Separator className="my-10 bg-[var(--creed-border)]" />

          <section id="settings-model-usage" className="scroll-mt-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-[16px] font-medium text-[var(--creed-text-primary)]">
                Model usage
              </h2>
              {null}
            </div>
            <div className="mt-4 rounded-[var(--radius-xl)] border border-[var(--creed-border)] bg-[var(--creed-surface)] p-5">
              <div className="grid gap-5 md:grid-cols-[1.1fr_0.9fr] md:items-stretch">
                <div className="flex flex-col gap-4">
                  {
                    <div>
                      {openRouterBalance ? (
                        <div className="mb-4 rounded-[var(--radius-lg)] border border-[var(--creed-border)] px-4 py-3">
                          <div className="text-[13px] font-medium text-[var(--creed-text-secondary)]">
                            OpenRouter balance
                          </div>
                          <div className="mt-0.5 text-[30px] font-medium tracking-[-0.03em] text-[var(--creed-text-primary)]">
                            {openRouterBalance.remainingUsd != null
                              ? `$${openRouterBalance.remainingUsd.toFixed(2)}`
                              : "Unlimited"}
                          </div>
                        </div>
                      ) : null}
                      <label className="mb-2 block text-[13px] font-medium text-[var(--creed-text-secondary)]">
                        OpenRouter API key
                      </label>
                      <Input
                        type="password"
                        value={aiKeyDraft}
                        onChange={(event) => {
                          setAiKeyDraft(event.target.value);
                        }}
                        placeholder={
                          aiSettings.keyLastFour
                            ? `Saved key ending in ${aiSettings.keyLastFour}`
                            : "sk-or-..."
                        }
                        className="h-11 rounded-xl border-[var(--creed-border)] bg-[var(--creed-surface)] px-4 text-[14px]"
                      />
                    </div>
                  }

                  {
                    <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                      <Button
                        variant="outline"
                        className="rounded-md border-[var(--creed-border)]"
                        onClick={() => {
                          if (aiSettings.keyLastFour) {
                            void handleClearAiKey();
                          } else {
                            setAiKeyDraft("");
                          }
                        }}
                        disabled={
                          aiSaving || (!aiKeyDraft && !aiSettings.keyLastFour)
                        }
                      >
                        Clear
                      </Button>
                      <Button
                        className="rounded-md bg-[var(--creed-accent)]! text-white! hover:bg-[var(--creed-accent-hover)]! hover:text-white! disabled:bg-[var(--creed-surface-raised)]! disabled:text-[var(--creed-text-tertiary)]! disabled:opacity-100"
                        onClick={() => void handleSaveAiSettings()}
                        disabled={!canSaveAiKey}
                      >
                        Save
                        <DelayedSpinner pending={aiSaving} className="h-4 w-4 animate-spin" />
                      </Button>
                    </div>
                  }
                </div>

                <UsageCard
                  usage={usage}
                  range={usageRange}
                  onRangeChange={setUsageRange}
                  mode={aiSettings.aiMode}
                />
              </div>
            </div>

            {null}
          </section>

          <Separator className="my-10 bg-[var(--creed-border)]" />

          <Separator className="my-10 bg-[var(--creed-border)]" />

          <section id="settings-archived" className="scroll-mt-6">
            <h2 className="text-[16px] font-medium text-[var(--creed-text-primary)]">
              Archived
            </h2>
            <div className="mt-4 rounded-[var(--radius-xl)] border border-[var(--creed-border)] bg-[var(--creed-surface)] p-5">
              {archivedSections.length === 0 ? (
                <p className="text-[14px] leading-7 text-[var(--creed-text-secondary)]">
                  Nothing archived. Archived sections show up here, ready to
                  restore.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {archivedSections.map((section) => {
                    const expanded = expandedArchived === section.id;
                    return (
                      <div
                        key={section.id}
                        className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--creed-border)]"
                      >
                        <div className="flex items-center justify-between gap-4 px-4 py-3">
                          <ArchivedSectionHeading
                            name={section.name}
                            accent={accentColorMap[section.accent]}
                            expanded={expanded}
                            onToggle={() =>
                              setExpandedArchived((current) =>
                                current === section.id ? null : section.id,
                              )
                            }
                          />
                          <div className="flex shrink-0 items-center gap-2">
                            <Button
                              variant="outline"
                              className="rounded-md border-[var(--creed-border)]"
                              onClick={() => {
                                restoreSection(section.id);
                              }}
                            >
                              Restore
                            </Button>
                            <Button
                              className="rounded-md bg-[#DC2626] text-white hover:bg-[#B91C1C] hover:text-white"
                              onClick={() =>
                                setArchivedDeleteTarget({
                                  id: section.id,
                                  name: section.name,
                                })
                              }
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                        <AnimatePresence initial={false}>
                          {expanded ? (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{
                                duration: 0.24,
                                ease: [0.22, 1, 0.36, 1],
                              }}
                              className="overflow-hidden"
                            >
                              <div className="border-t border-[var(--creed-border)] px-4 py-4">
                                <FileSectionReadOnly
                                  section={section}
                                  sectionTagTargets={sectionTagTargets}
                                />
                              </div>
                            </motion.div>
                          ) : null}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <Separator className="my-10 bg-[var(--creed-border)]" />

          <section id="settings-data" className="scroll-mt-6">
            <h2 className="text-[16px] font-medium text-[var(--creed-text-primary)]">
              Data
            </h2>
            <div className="mt-4 rounded-[var(--radius-xl)] border border-[var(--creed-border)] bg-[var(--creed-surface)] p-5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[14px]">
                <span>
                  <span className="font-medium text-[var(--creed-text-primary)]">
                    {dataStats.wordCount.toLocaleString()}
                  </span>
                  <span className="ml-1 text-[var(--creed-text-secondary)]">
                    {dataStats.wordCount === 1 ? "word" : "words"}
                  </span>
                </span>
                <span aria-hidden className="text-[var(--creed-text-tertiary)]">
                  ·
                </span>
                <span>
                  <span className="font-medium text-[var(--creed-text-primary)]">
                    {dataStats.sectionCount.toLocaleString()}
                  </span>
                  <span className="ml-1 text-[var(--creed-text-secondary)]">
                    {dataStats.sectionCount === 1 ? "section" : "sections"}
                  </span>
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <AnimatedIconButton
                  icon={DownloadIcon}
                  variant="outline"
                  className="rounded-md border-[var(--creed-border)]"
                  onClick={() =>
                    downloadFile(
                      creedMarkdownFilename(activeCreedName),
                      exportMarkdown,
                      "text/markdown;charset=utf-8",
                    )
                  }
                >
                  Export Creed as markdown
                </AnimatedIconButton>
                <AnimatedIconButton
                  icon={DownloadIcon}
                  variant="outline"
                  className="rounded-md border-[var(--creed-border)]"
                  onClick={() =>
                    downloadFile(
                      "creed-activity.json",
                      exportActivityJson,
                      "application/json;charset=utf-8",
                    )
                  }
                >
                  Export activity log
                </AnimatedIconButton>
                <AnimatedIconButton
                  icon={DownloadIcon}
                  variant="outline"
                  className="rounded-md border-[var(--creed-border)]"
                  onClick={() =>
                    downloadFile(
                      "creed-data.json",
                      exportAllDataJson,
                      "application/json;charset=utf-8",
                    )
                  }
                >
                  Export all data
                </AnimatedIconButton>
              </div>
            </div>
          </section>

          <Separator className="my-10 bg-[var(--creed-border)]" />

          <section id="settings-danger" className="scroll-mt-6">
            <h2 className="text-[16px] font-medium text-[var(--creed-text-primary)]">
              Danger zone
            </h2>
            <div className="mt-4 rounded-[var(--radius-xl)] border border-[#FECACA] bg-[#FEF2F2] p-5 dark:border-[#7F1D1D]/40 dark:bg-[#3F1212]/30">
              <div className="flex items-center justify-between gap-5">
                <div className="min-w-0">
                  <div className="text-[15px] font-medium text-[#DC2626] dark:text-[#DC2626]">
                    Delete Creed
                  </div>
                  <div className="mt-2 hidden text-[14px] leading-7 text-[#DC2626] dark:text-[#DC2626] md:block">
                    Moves its Markdown file to Trash and removes this Creed from
                    the app.
                  </div>
                </div>
                <Button
                  className="rounded-md bg-[#DC2626] text-white hover:bg-[#B91C1C] hover:text-white"
                  onClick={() => {
                    setDeleteConfirm("");
                    setDeleteOpen(true);
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setDeleteConfirm("");
        }}
      >
        <DialogContent className="rounded-[var(--radius-xl)] border-[var(--creed-border)] bg-[var(--creed-surface)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-[#B91C1C]" />
              Delete Creed
            </DialogTitle>
          </DialogHeader>
          <p className="text-[14px] leading-7 text-[var(--creed-text-secondary)]">
            Moves the Markdown file to Trash and removes this Creed from the
            app. Type its name to confirm.
          </p>
          <Input
            value={deleteConfirm}
            onChange={(event) => setDeleteConfirm(event.target.value)}
            placeholder={activeCreedName}
            className="mt-1 h-11 rounded-xl border-[var(--creed-border)] bg-[var(--creed-surface)] px-4 text-[15px] focus-visible:border-[#DC2626] focus-visible:ring-[#DC2626]/20"
          />
          <DialogFooter className="flex-row items-center justify-between border-t-[var(--creed-border)] bg-[var(--creed-surface)] sm:justify-between">
            <Button
              variant="outline"
              className="rounded-md border-[var(--creed-border)]"
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="rounded-md bg-[#DC2626] text-white hover:bg-[#B91C1C]"
              onClick={() => void handleDeleteCreed()}
              disabled={deleting || deleteConfirm !== activeCreedName}
            >
              {deleting ? (
                <>
                  Deleting
                  <DelayedSpinner pending={deleting} className="h-4 w-4 animate-spin" />
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={archivedDeleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setArchivedDeleteTarget(null);
        }}
      >
        <DialogContent className="rounded-[var(--radius-xl)] border-[var(--creed-border)] bg-[var(--creed-surface)]">
          <DialogHeader>
            <DialogTitle>Delete archived section</DialogTitle>
            <DialogDescription>
              This permanently deletes &ldquo;{archivedDeleteTarget?.name}
              &rdquo; and its history. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row items-center justify-between border-t-[var(--creed-border)] bg-[var(--creed-surface)] sm:justify-between">
            <Button
              variant="outline"
              className="rounded-md border-[var(--creed-border)]"
              onClick={() => setArchivedDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              className="rounded-md bg-[#DC2626] text-white hover:bg-[#B91C1C] hover:text-white"
              onClick={() => {
                if (archivedDeleteTarget)
                  deleteSection(archivedDeleteTarget.id);
                setArchivedDeleteTarget(null);
              }}
            >
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ConnectButton({
  label,
  loading,
  onClick,
}: {
  label: string;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      aria-label={`Connect ${label}`}
      className="rounded-md bg-[#16A34A] text-white hover:bg-[#15803d] hover:text-white max-md:size-9 max-md:p-0 md:text-sm"
      onClick={onClick}
      disabled={loading}
    >
      <DelayedSpinner
        pending={loading}
        className="h-4 w-4 animate-spin"
        fallback={
        <>
          <Link2 className="h-4 w-4 md:hidden" />
          <span className="hidden md:inline">Connect</span>
        </>
        }
      />
    </Button>
  );
}

export function DisconnectButton({
  label,
  loading,
  onClick,
}: {
  label: string;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      aria-label={`Disconnect ${label}`}
      className="rounded-md bg-[#DC2626] text-white hover:bg-[#B91C1C] hover:text-white max-md:size-9 max-md:p-0 md:text-sm"
      onClick={onClick}
      disabled={loading}
    >
      <DelayedSpinner
        pending={loading}
        className="h-4 w-4 animate-spin"
        fallback={
        <>
          <Unlink2 className="h-4 w-4 md:hidden" />
          <span className="hidden md:inline">Disconnect</span>
        </>
        }
      />
    </Button>
  );
}

export function ReauthorizeButton() {
  return (
    <Button
      asChild
      variant="outline"
      className="rounded-md border-[var(--creed-border)] max-md:hidden"
    >
      <a
        href={GITHUB_AUTHORIZED_APPS_URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        Re-authorize
      </a>
    </Button>
  );
}

export function IntegrationRow({
  title,
  icon,
  action,
  secondaryLabel,
  status,
  statusLabel,
}: {
  title: string;
  icon: ReactNode;
  action: ReactNode;
  secondaryLabel?: string;
  status?: IntegrationConnectionStatus;
  statusLabel?: string;
}) {
  const isConnected = status === "connected";
  const isDisconnected = status === "disconnected";
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div className="flex min-w-0 items-center gap-3.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-medium text-[var(--creed-text-primary)]">
              {title}
            </span>
            {statusLabel ? (
              <span
                className={cn(
                  "inline-flex items-center whitespace-nowrap rounded-[6px] px-1.5 py-0.5 text-[12px] font-medium",
                  isConnected
                    ? "bg-[#ECFDF5] text-[#047857] dark:bg-[#052e1a]/50 dark:text-[#4ade80]"
                    : isDisconnected
                      ? "bg-[#FEF2F2] text-[#B91C1C] dark:bg-[#3F1212]/40 dark:text-[#F87171]"
                      : "bg-[var(--creed-surface-raised)] text-[var(--creed-text-secondary)]",
                )}
              >
                {statusLabel}
              </span>
            ) : null}
          </div>
          {secondaryLabel ? (
            <div className="mt-1 truncate text-[13px] text-[var(--creed-text-secondary)]">
              {secondaryLabel}
            </div>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

const USAGE_RANGE_ITEMS: { key: AiUsageRange; label: string }[] = [
  { key: "all", label: "All time" },
  { key: "90d", label: "90d" },
  { key: "30d", label: "30d" },
  { key: "7d", label: "7d" },
];

function usageRangeLabel(range: AiUsageRange) {
  return USAGE_RANGE_ITEMS.find((item) => item.key === range)?.label ?? range;
}

export function UsageCard({
  usage,
  range,
  onRangeChange,
}: {
  usage: AiUsageSummary | null;
  range: AiUsageRange;
  onRangeChange: (range: AiUsageRange) => void;
  mode: AiMode;
}) {
  const total = usage?.totalCostUsd ?? 0;

  // Features present in the range, known features first. Each day's spend is
  // stacked by feature - same recharts pattern as the /connections charts.
  const featureOrder: readonly string[] = AI_FEATURES;
  const present = Array.from(
    new Set(
      (usage?.days ?? []).flatMap((day) =>
        day.segments.filter((s) => s.costUsd > 0).map((s) => s.feature),
      ),
    ),
  ).sort((a, b) => {
    const ai = featureOrder.indexOf(a);
    const bi = featureOrder.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
  const chartData = (usage?.days ?? [])
    .map((day) => {
      const row: Record<string, number | string> = { date: day.date };
      for (const feature of present) row[feature] = 0;
      for (const segment of day.segments) {
        if (present.includes(segment.feature)) {
          row[segment.feature] =
            (Number(row[segment.feature]) || 0) + segment.costUsd;
        }
      }
      return row;
    })
    // Only plot days that actually have spend.
    .filter(
      (row) =>
        present.reduce((sum, feature) => sum + Number(row[feature] ?? 0), 0) >
        0,
    );
  const chartConfig: ChartConfig = {};
  present.forEach((feature) => {
    const meta = featureMeta(feature);
    chartConfig[feature] = { label: meta.label, color: meta.color };
  });

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--creed-border)] bg-[var(--creed-surface)] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[13px] font-medium text-[var(--creed-text-secondary)]">
            OpenRouter spend
          </div>
          {usage == null ? (
            <SkeletonText preset="fig30" width="w-[72px]" className="mt-2" />
          ) : (
            <div className="mt-2 text-[30px] font-medium tracking-[-0.04em] text-[var(--creed-text-primary)]">
              ${total.toFixed(total < 10 ? 2 : 0)}
            </div>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              type="button"
              className="inline-flex h-8 items-center gap-2 rounded-md border border-[var(--creed-border)] bg-[var(--creed-surface)] px-3 text-sm font-normal text-[var(--creed-text-primary)] transition-colors duration-150 hover:bg-[var(--creed-surface-raised)]"
            >
              <SwapLabel
                value={usageRangeLabel(range)}
                options={USAGE_RANGE_ITEMS.map((item) => item.label)}
              />
              <ChevronDown className={DROPDOWN_CHEVRON_CLASS} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className={cn(DROPDOWN_CONTENT_CLASS, "min-w-28")}
          >
            {USAGE_RANGE_ITEMS.map((item) => (
              <DropdownMenuItem
                key={item.key}
                onSelect={() => onRangeChange(item.key)}
                className={cn(DROPDOWN_ITEM_CLASS, "justify-between")}
              >
                <span>{item.label}</span>
                {range === item.key ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-[var(--creed-text-primary)]" />
                ) : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="relative mt-5 h-[120px] w-full overflow-hidden">
        {usage == null ? (
          <SkeletonBar className="h-[120px] w-full rounded-lg" />
        ) : (
          <AnimatePresence initial={false}>
            <motion.div
              // Cross-fade between states on timeframe change. The populated
              // chart keeps a stable key so recharts morphs its bars across
              // ranges; the empty state is keyed per-range so it re-animates
              // (and updates its caption) when you switch the timeframe.
              key={chartData.length > 0 ? "chart" : `empty-${range}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 overflow-hidden"
            >
              {chartData.length > 0 ? (
                <ChartContainer
                  config={chartConfig}
                  className="w-full"
                  chartHeight={120}
                >
                  <BarChart
                    data={chartData}
                    margin={{ left: 4, right: 4, top: 8, bottom: 0 }}
                  >
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="date" hide />
                    <YAxis hide />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          labelFormatter={(value) =>
                            formatUsageDate(String(value))
                          }
                          formatter={(value, name, item) => (
                            <div className="flex w-full items-center justify-between gap-3">
                              <span className="flex items-center gap-1.5 text-[var(--creed-text-primary)]">
                                <span
                                  className="h-2.5 w-2.5 rounded-[4px]"
                                  style={{
                                    backgroundColor:
                                      item.color ?? item.payload?.fill,
                                  }}
                                />
                                {chartConfig[String(name)]?.label ?? name}
                              </span>
                              <span className="tabular-nums text-[var(--creed-text-primary)]">
                                ${Number(value).toFixed(2)}
                              </span>
                            </div>
                          )}
                        />
                      }
                    />
                    {present.map((feature) => (
                      <StackedRoundedBar
                        key={feature}
                        dataKey={feature}
                        stackId="cost"
                        fill={`var(--color-${feature})`}
                        orderedKeys={present}
                      />
                    ))}
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="relative flex h-full items-center justify-center">
                  {/* Faint zero baseline echoing the chart grid, so the empty
                    state reads as a chart at $0 rather than a bare message. */}
                  <div className="absolute inset-x-0 bottom-0 border-t border-dashed border-[var(--creed-border)]" />
                  <span className="text-[12px] text-[var(--creed-text-tertiary)]">
                    {range === "all"
                      ? "No spend yet."
                      : `No spend in the last ${range.replace("d", " days")}`}
                  </span>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

function formatUsageDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
