import { nativeRequest as fetch } from "@/lib/native/request";

import { useState } from "react";
import { AlertTriangle, Ellipsis, Pencil } from "lucide-react";
import { DelayedSpinner } from "@/components/ui/delayed-spinner";
import { AddAgent } from "@/components/creed/add-agent-dialog";
import { customAgent } from "@/lib/custom-agents";
import { AnimatedCheckmark } from "@/components/ui/animated-checkmark";
import { ArrowUpRightIcon } from "@/components/ui/arrow-up-right";

import { Button } from "@/components/ui/button";
import { ChartColumnIncreasingIcon } from "@/components/ui/chart-column-increasing";
import { CopyIcon } from "@/components/ui/copy";
import { KeyIcon } from "@/components/ui/key";
import { RadioTowerIcon } from "@/components/ui/radio-tower";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DROPDOWN_CONTENT_CLASS,
  DROPDOWN_ICON_TRIGGER_CLASS,
  DROPDOWN_ICON_SURFACE_CLASS,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PlusIcon } from "@/components/ui/plus";
import {
  AnimatedIconButton,
  AnimatedMenuIconItem,
} from "@/components/creed/animated-icon-action";
import { IntegrationGlyph } from "@/components/creed/brand";
import {
  getCliConnectionPresentation,
  getConnectionPresentation,
} from "@/lib/connection-actions";
import type { ConnectionAction, ConnectionItem } from "@/lib/creed/creed-data";
import type { AgentConnectionKind } from "@/lib/agent-icon";
import { SwapLabel } from "@/components/creed/swap-label";
import { cn } from "@/components/ui/utils";

// Compacts the backend's relative-time strings ("2 days ago", "5 min ago",
// "3h ago", "just now") to the card's short form ("2d", "5m", "3h", "now").
function compactLastSeen(value: string) {
  const timestamp = Date.parse(value);
  if (Number.isFinite(timestamp)) {
    const minutes = Math.max(Math.round((Date.now() - timestamp) / 60_000), 0);
    if (minutes < 1) return "now";
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.round(hours / 24)}d`;
  }
  if (value === "just now") return "now";
  const match = value.match(/^(\d+)\s*(min|h|day)/);
  if (!match) return value;
  const unit = match[2] === "min" ? "m" : match[2] === "h" ? "h" : "d";
  return `${match[1]}${unit}`;
}

// Per-agent button colour, matching each client's brand.
function getAgentButtonClasses(connectionId: string) {
  switch (connectionId) {
    case "codex":
    case "whirl":
      return "bg-[var(--creed-accent)] text-white transition-colors hover:bg-[var(--creed-accent-hover)]";
    case "claude":
    case "claudecode":
      return "bg-[#FF6200] text-white hover:bg-[#E65A00]";
    case "replit":
      return "bg-[#F26207] text-white transition-colors hover:bg-[#D65606]";
    case "openclaw":
      return "bg-[#FF0000] text-white hover:bg-[#E00000]";
    case "hermes":
      return "bg-[#FFBB00] text-white hover:bg-[#E6A900] dark:bg-[#D9A000] dark:hover:bg-[#B88600]";
    case "chatgpt":
    case "cursor":
    case "devin":
    case "grok":
    case "grokbot":
    case "goose":
    case "v0":
    case "opencode":
    case "factory":
    case "manus":
    case "custom":
      return "bg-[#171717] text-white hover:bg-[#0F0F0F] dark:bg-[#e7e7e2] dark:text-[#0e0e0d] dark:hover:bg-[#cfcfc8]";
    default:
      return "bg-[var(--creed-text-primary)] text-[var(--creed-button-primary-fg)] hover:bg-[var(--creed-button-primary-hover)]";
  }
}

// Alternative setup actions use the same quiet outline across agent cards.
export const CONNECTION_SECONDARY_BUTTON_CLASS =
  "w-fit max-w-full justify-center rounded-md border border-[var(--creed-border-strong)] bg-[var(--creed-surface)] px-2.5 text-[var(--creed-text-primary)] hover:bg-[var(--creed-surface-raised)]";

// One per-agent connect card on /connections. Self-contained: it manages its
// own copy/flash state and renders
// the connection's primary/secondary actions (install link, settings page, or
// copyable command/JSON/URL), falling back to a plain "Copy URL".
export function ConnectionCard({
  connection,
  creedId,
  mcpUrl,
  isConnected,
  statusKind = isConnected ? "connected" : "not-connected",
  lastSeen,
  onRevoke,
  onLogs,
  mode = "mcp",
  statusOverride,
}: {
  connection: ConnectionItem;
  creedId?: string;
  mcpUrl: string;
  isConnected: boolean;
  statusKind?: AgentConnectionKind;
  lastSeen?: string;
  onRevoke?: () => Promise<void>;
  // Jump to the Health section filtered to this agent.
  onLogs?: () => void;
  mode?: "mcp" | "cli";
  statusOverride?: "checking" | "unavailable";
}) {
  // Which button is showing its "Copied"/"Added" flash; primary and secondary
  // flash independently.
  const [flashedSlot, setFlashedSlot] = useState<
    "primary" | "secondary" | null
  >(null);
  const [testState, setTestState] = useState<
    "idle" | "testing" | "ok" | "fail"
  >("idle");
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const savedAgent = customAgent(connection.id);
  const [revoking, setRevoking] = useState(false);
  const runTest = async () => {
    if (!creedId) {
      setTestState("fail");
      window.setTimeout(() => setTestState("idle"), 1600);
      return;
    }
    setTestState("testing");
    try {
      const response = await fetch(
        `/api/app/mcp/test?icon=${encodeURIComponent(connection.icon)}&creedId=${encodeURIComponent(creedId)}`,
      );
      const payload = (await response.json().catch(() => ({}))) as {
        connected?: boolean;
      };
      setTestState(response.ok && payload.connected ? "ok" : "fail");
    } catch {
      setTestState("fail");
    }
    window.setTimeout(() => setTestState("idle"), 1600);
  };
  const flash = (slot: "primary" | "secondary") => {
    setFlashedSlot(slot);
    window.setTimeout(
      () => setFlashedSlot((current) => (current === slot ? null : current)),
      1600,
    );
  };
  const buttonClass = cn(
    "w-fit max-w-full justify-center rounded-md px-2.5",
    getAgentButtonClasses(connection.id),
  );

  // Buttons and hint are derived client-side from the agent id + MCP URL (see
  // lib/connection-actions.ts for why they don't ride the server payload),
  // with the server definition as fallback and a plain Copy URL as the floor.
  const presentation =
    mode === "cli"
      ? getCliConnectionPresentation(connection.id, connection.name)
      : getConnectionPresentation(connection.id, mcpUrl);
  const primaryAction: ConnectionAction = presentation.primary ??
    connection.primaryAction ?? {
      kind: "copy",
      label: "Copy URL",
      value: mcpUrl,
    };
  const secondaryAction =
    presentation.secondary ?? connection.secondaryAction ?? null;

  const renderAction = (
    action: ConnectionAction,
    slot: "primary" | "secondary",
  ) => {
    const flashed = flashedSlot === slot;
    const className =
      slot === "primary" && !connection.id.startsWith("custom:")
        ? buttonClass
        : CONNECTION_SECONDARY_BUTTON_CLASS;
    if (action.kind === "open") {
      // Settings pages open in a new tab; no flash, the destination is the
      // feedback.
      return (
        <AnimatedIconButton
          icon={ArrowUpRightIcon}
          className={className}
          onClick={() => {
            void invoke("open_external_link", { url: action.href }).catch(
              (error: unknown) => toast.error(String(error)),
            );
          }}
        >
          {action.label}
        </AnimatedIconButton>
      );
    }
    if (action.kind === "install") {
      return (
        <AnimatedIconButton
          icon={PlusIcon}
          showIcon={!flashed}
          className={className}
          onClick={() => {
            flash(slot);
            void invoke("open_external_link", { url: action.href }).catch(
              (error: unknown) => toast.error(String(error)),
            );
          }}
        >
          {flashed ? <AnimatedCheckmark className="h-4 w-4" size={16} /> : null}
          <SwapLabel
            value={flashed ? "Added" : action.label}
            options={[action.label, "Added"]}
          />
        </AnimatedIconButton>
      );
    }
    return (
      <AnimatedIconButton
        icon={CopyIcon}
        showIcon={!flashed}
        className={className}
        onClick={async () => {
          await navigator.clipboard.writeText(action.value);
          flash(slot);
        }}
      >
        {flashed ? <AnimatedCheckmark className="h-4 w-4" size={16} /> : null}
        <SwapLabel
          value={flashed ? "Copied" : action.label}
          options={[action.label, "Copied"]}
        />
      </AnimatedIconButton>
    );
  };

  return (
    <div className="flex h-full flex-col rounded-lg border border-[var(--creed-border)] bg-[var(--creed-surface)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <IntegrationGlyph
            kind={connection.icon}
            framed={false}
            className="h-9 w-9 shrink-0"
          />
          <div className="min-w-0">
            <div className="text-[15px] font-medium text-[var(--creed-text-primary)] [overflow-wrap:anywhere]">
              {connection.name}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-[var(--creed-text-secondary)]">
              <span
                className={cn(
                  "h-2 w-2 rounded-[3px]",
                  statusKind === "connected"
                    ? "bg-[#16A34A]"
                    : statusKind === "disconnected"
                      ? "bg-[#DC2626]"
                      : "bg-[var(--creed-border-strong)]",
                )}
              />
              <span>
                {statusOverride === "checking"
                  ? "Checking connection"
                  : statusOverride === "unavailable"
                    ? "Connection unavailable"
                    : mode === "cli"
                      ? statusKind === "connected"
                        ? "Connected via CLI"
                        : statusKind === "disconnected"
                          ? "Disconnected"
                          : "Not connected via CLI"
                      : statusKind === "connected"
                        ? "Connected via MCP"
                        : statusKind === "disconnected"
                          ? "Disconnected"
                          : "Not connected"}
              </span>
              {(statusKind === "connected" || statusKind === "disconnected") &&
              lastSeen ? (
                <>
                  <span>·</span>
                  <span>Last seen {compactLastSeen(lastSeen)}</span>
                </>
              ) : null}
            </div>
          </div>
        </div>

        {mode === "mcp" && ((isConnected && onRevoke) || savedAgent) ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={`Actions for ${connection.name}`}
                className={DROPDOWN_ICON_TRIGGER_CLASS}
              >
                <span className={DROPDOWN_ICON_SURFACE_CLASS}>
                  <Ellipsis className="h-4 w-4" />
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className={DROPDOWN_CONTENT_CLASS}>
              {savedAgent && creedId ? (
                <DropdownMenuItem
                  onSelect={() => window.setTimeout(() => setEditOpen(true), 0)}
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              ) : null}
              {isConnected && onRevoke ? (
                <>
                  <AnimatedMenuIconItem
                    icon={RadioTowerIcon}
                    showIcon={testState === "idle"}
                    className="text-sm"
                    disabled={testState === "testing"}
                    onSelect={(event) => {
                      event.preventDefault();
                      void runTest();
                    }}
                  >
                    {testState === "testing" ? (
                      <DelayedSpinner pending className="h-3.5 w-3.5 animate-spin" />
                    ) : testState === "ok" ? (
                      <AnimatedCheckmark />
                    ) : null}
                    <SwapLabel
                      value={
                        testState === "testing"
                          ? "Testing"
                          : testState === "ok"
                            ? "Connected"
                            : testState === "fail"
                              ? "No connection"
                              : "Test"
                      }
                      options={[
                        "Test",
                        "Testing",
                        "Connected",
                        "No connection",
                      ]}
                    />
                  </AnimatedMenuIconItem>
                  {onLogs ? (
                    <AnimatedMenuIconItem
                      icon={ChartColumnIncreasingIcon}
                      className="text-sm"
                      onSelect={onLogs}
                    >
                      Logs
                    </AnimatedMenuIconItem>
                  ) : null}
                  <AnimatedMenuIconItem
                    icon={KeyIcon}
                    className="mt-1 bg-[#DC2626] text-sm text-white hover:bg-[#B91C1C] hover:text-white focus:bg-[#B91C1C] focus:text-white data-[highlighted]:bg-[#B91C1C] data-[highlighted]:text-white not-data-[variant=destructive]:focus:**:text-white"
                    onSelect={() => {
                      // Let the menu close first, then open the dialog on the
                      // next tick so its enter animation plays (two Radix
                      // overlays in the same tick skips it).
                      window.setTimeout(() => setRevokeOpen(true), 0);
                    }}
                  >
                    Revoke
                  </AnimatedMenuIconItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      {editOpen && savedAgent && creedId ? (
        <AddAgent
          creedId={creedId}
          agent={savedAgent}
          onClose={() => setEditOpen(false)}
        />
      ) : null}
      <div className="mt-auto flex flex-wrap items-center gap-3 pt-4">
        {renderAction(primaryAction, "primary")}
        {secondaryAction ? renderAction(secondaryAction, "secondary") : null}
      </div>

      {onRevoke ? (
        <Dialog open={revokeOpen} onOpenChange={setRevokeOpen}>
          <DialogContent className="rounded-[var(--radius-xl)] border-[var(--creed-border)] bg-[var(--creed-surface)]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-[#B91C1C]" />
                Revoke {connection.name} access
              </DialogTitle>
              <DialogDescription>
                Disconnects {connection.name} and revokes its MCP tokens. It
                stops reading your Creed until you reconnect and authorize it
                again.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-row items-center justify-between border-t-[var(--creed-border)] bg-[var(--creed-surface)] sm:justify-between">
              <Button
                variant="outline"
                className="rounded-md border-[var(--creed-border)]"
                onClick={() => setRevokeOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="rounded-md bg-[#DC2626] text-white hover:bg-[#B91C1C]"
                disabled={revoking}
                onClick={async () => {
                  setRevoking(true);
                  try {
                    await onRevoke();
                    setRevokeOpen(false);
                  } catch {
                    // Failed revoke: keep the dialog open so the action can be
                    // retried; the card would otherwise read as disconnected.
                  } finally {
                    setRevoking(false);
                  }
                }}
              >
                <DelayedSpinner pending={revoking} className="h-4 w-4 animate-spin" />
                {revoking ? "Revoking" : "Revoke"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
