import { invoke } from "@tauri-apps/api/core";
import { HardDriveDownload, RefreshCw } from "lucide-react";
import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { AnimatedCheckmark } from "@/components/ui/animated-checkmark";
import { DelayedSpinner } from "@/components/ui/delayed-spinner";
import { SwapLabel } from "@/components/creed/swap-label";
import { flushEdits } from "./workspace";

const labels = {
  available: "New version available",
  downloading: "Downloading update…",
  ready: "Ready to restart.",
  restarting: "Restarting Creed…",
  complete: "Creed is up to date.",
};
type Phase = keyof typeof labels;
let phase: Phase = "available";
let activate: (() => void) | undefined;
let transitionVersion = 0;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
function transition(next: Phase, action?: () => void) {
  const version = ++transitionVersion;
  phase = next;
  activate = action;
  for (const listener of listeners) listener();
  if (next === "complete")
    window.setTimeout(() => {
      if (version === transitionVersion) toast.dismiss("creed-update");
    }, 4000);
}

function UpdateToastContent() {
  const current = useSyncExternalStore(subscribe, () => phase);
  const spinning = current === "downloading" || current === "restarting";
  const checked = current === "complete";
  return (
    <>
      <SwapLabel value={labels[current]} options={Object.values(labels)} />
      <button
        type="button"
        disabled={!activate}
        aria-label={
          current === "available"
            ? "Download update"
            : current === "ready"
              ? "Restart Creed"
              : labels[current]
        }
        onClick={() => activate?.()}
        className="absolute top-1/2 right-2.5 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-[8px] border-0 bg-transparent p-0 text-current opacity-70 transition-opacity enabled:hover:bg-current/10 enabled:hover:opacity-100"
      >
        <DelayedSpinner
          pending={spinning}
          className="h-4 w-4 animate-spin"
          fallback={
            checked ? (
              <AnimatedCheckmark key={current} size={16} className="h-4 w-4" />
            ) : current === "ready" ? (
              <HardDriveDownload className="h-4 w-4" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )
          }
        />
      </button>
    </>
  );
}

function showUpdate() {
  toast.info(<UpdateToastContent />, {
    id: "creed-update",
    duration: Infinity,
    closeButton: false,
    action: null,
  });
}

export async function checkUpdates(silent = false) {
  const target = localStorage.getItem("creed:update-target");
  if (target) {
    const { getVersion } = await import("@tauri-apps/api/app");
    if ((await getVersion()) === target) {
      localStorage.removeItem("creed:update-target");
      transition("complete");
      showUpdate();
    }
  }
  if (!(await invoke<boolean>("update_configured"))) {
    if (!silent)
      toast.info(
        "Automatic updates are not configured for this development build.",
      );
    return;
  }
  const { check } = await import("@tauri-apps/plugin-updater");
  const update = await check();
  if (!update) {
    if (!silent) toast.info("You're up to date.");
    return;
  }
  const fail = (error: unknown) => {
    toast.error(String(error));
    transition("available", download);
  };
  const restart = () => {
    transition("restarting");
    void flushEdits()
      .then(async () => {
        localStorage.setItem("creed:update-target", update.version);
        const { relaunch } = await import("@tauri-apps/plugin-process");
        await relaunch();
      })
      .catch((error: unknown) => {
        toast.error(String(error));
        transition("ready", restart);
      });
  };
  const download = () => {
    transition("downloading");
    void update
      .downloadAndInstall()
      .then(() => {
        transition("ready");
        window.setTimeout(restart, 800);
      })
      .catch(fail);
  };
  transition("available", download);
  showUpdate();
}
