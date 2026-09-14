import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { toast } from "sonner";
import { CreedProvider } from "@/components/creed/creed-provider";
import { AppShellLayout } from "@/components/creed/app-shell-layout";
import { ThemeProvider } from "@/components/creed/theme-provider";
import { NewCreedDialog } from "@/components/creed/new-creed-dialog";
import { Button } from "@/components/ui/button";
import { flushEdits, refresh, useWorkspace } from "@/lib/native/workspace";
import { checkUpdates } from "@/lib/native/updates";
import { NativeSourceDialog } from "@/components/creed/native-source-dialog";
import { Toaster } from "@/components/ui/toaster";
import { preloadFileScreen } from "@/components/creed/file-screen-loader";
import { onSettledResize } from "@/lib/settled-resize";

function Desktop() {
  const state = useWorkspace();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const document = state.documents.find(
    (item) => item.id === state.activeId && item.listed,
  );
  useEffect(() => {
    preloadFileScreen();
    const appWindow = getCurrentWindow();
    let disposed = false;
    let fullscreenRequest = 0;
    let fullscreenRetry: ReturnType<typeof setTimeout> | undefined;
    const syncFullscreen = () => {
      const request = ++fullscreenRequest;
      void appWindow
        .isFullscreen()
        .then((value) => {
          if (!disposed && request === fullscreenRequest) setFullscreen(value);
        })
        .catch(() => undefined);
    };
    const reconcileFullscreen = () => {
      syncFullscreen();
      clearTimeout(fullscreenRetry);
      // AppKit can finish its fullscreen transition after the last webview resize.
      fullscreenRetry = setTimeout(syncFullscreen, 750);
    };
    syncFullscreen();
    const stopResize = onSettledResize(window, reconcileFullscreen, 250);
    window.addEventListener("focus", reconcileFullscreen);
    void refresh()
      .then(() => setReady(true))
      .catch((error: unknown) => setError(String(error)));
    const interval = setInterval(
      () => {
        syncFullscreen();
        void refresh().catch((error: unknown) => setError(String(error)));
      },
      2500,
    );
    void checkUpdates(true).catch(() => undefined);
    const mcp = listen<string>("mcp-error", (event) =>
      toast.error(event.payload),
    );
    const quitting = listen("before-quit", () => {
      void flushEdits()
        .then(() => invoke("finish_quit"))
        .catch((error: unknown) => {
          toast.error(`Could not save: ${String(error)}`, {
            duration: Infinity,
            action: {
              label: "Quit, keep draft",
              onClick: () => {
                void invoke("finish_quit");
              },
            },
          });
        });
    });
    void quitting
      .then(() => invoke("frontend_ready"))
      .catch((error: unknown) => setError(String(error)));
    const save = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void flushEdits().catch((error: unknown) => toast.error(String(error)));
      }
    };
    const link = (event: MouseEvent) => {
      const anchor =
        event.target instanceof Element
          ? event.target.closest("a[href]")
          : null;
      if (
        !(anchor instanceof HTMLAnchorElement) ||
        !/^(https?:|mailto:)/.test(anchor.getAttribute("href") ?? "")
      )
        return;
      event.preventDefault();
      void invoke("open_external_link", { url: anchor.href }).catch(
        (error: unknown) => toast.error(String(error)),
      );
    };
    window.addEventListener("keydown", save);
    window.document.addEventListener("click", link);
    return () => {
      disposed = true;
      stopResize();
      clearTimeout(fullscreenRetry);
      window.removeEventListener("focus", reconcileFullscreen);
      clearInterval(interval);
      void mcp.then((off) => off());
      void quitting.then((off) => off());
      window.removeEventListener("keydown", save);
      window.document.removeEventListener("click", link);
    };
  }, []);
  return (
    <>
      <div
        className="creed-desktop-root"
        data-fullscreen={fullscreen ? "true" : "false"}
      >
        {error ? (
          <div
            role="alert"
            className="fixed bottom-4 left-4 z-50 rounded-lg border border-red-500 bg-[var(--creed-surface)] p-4 text-sm"
          >
            {error}
            <Button
              variant="ghost"
              onClick={() => {
                setError(null);
                void refresh().then(() => setReady(true));
              }}
            >
              Retry
            </Button>
          </div>
        ) : null}
        {document || ready ? (
          <div className="contents" inert={!document}>
            <AppShellLayout>{null}</AppShellLayout>
          </div>
        ) : !ready ? (
          <div className="h-dvh bg-[var(--creed-surface)]" />
        ) : null}
        <NewCreedDialog open={ready && !document} onOpenChange={() => {}} />
        <NativeSourceDialog />
        <Toaster />
      </div>
    </>
  );
}
export function DesktopApp() {
  return (
    <ThemeProvider followSystem>
      <CreedProvider>
        <Desktop />
      </CreedProvider>
    </ThemeProvider>
  );
}
