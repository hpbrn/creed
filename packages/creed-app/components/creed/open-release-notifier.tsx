"use client";

import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { VERSION_UPDATE_TOAST_CLASS_NAMES } from "@/components/creed/app-version-notifier";
import { isNewerOpenVersion } from "@/lib/open-release";
import { OPEN_UPDATE_GUIDE_URL } from "@/lib/branding";
import { ArrowUpRight } from "lucide-react";

const OPEN_RELEASE_TOAST_ID = "creed-open-release-update";
const RELEASE_CHECK_INTERVAL_MS = 3_600_000;

type OpenReleaseNotifierProps = {
  installedVersion: string;
};

type OpenReleasePayload = {
  version?: string | null;
};

export function showOpenReleaseUpdateToast() {
  toast.info("New version available", {
    id: OPEN_RELEASE_TOAST_ID,
    duration: Infinity,
    closeButton: false,
    action: {
      label: (
        <>
          <ArrowUpRight size={16} aria-hidden="true" />
          <span className="sr-only">Update instructions</span>
        </>
      ),
      onClick: (event) => {
        event.preventDefault();
        window.open(OPEN_UPDATE_GUIDE_URL, "_blank", "noopener,noreferrer");
      },
    },
    classNames: VERSION_UPDATE_TOAST_CLASS_NAMES,
  });
}

export function OpenReleaseNotifier({
  installedVersion,
}: OpenReleaseNotifierProps) {
  const shownVersionRef = useRef<string | null>(null);

  const checkForRelease = useCallback(async () => {
    try {
      const response = await fetch("/api/open/latest-release");
      if (!response.ok) return;

      const payload = (await response.json()) as OpenReleasePayload;
      const latestVersion = typeof payload.version === "string" ? payload.version.trim() : null;
      if (
        !latestVersion ||
        latestVersion === shownVersionRef.current ||
        !isNewerOpenVersion(latestVersion, installedVersion)
      ) {
        return;
      }

      shownVersionRef.current = latestVersion;
      showOpenReleaseUpdateToast();
    } catch {
      // A release check must not interrupt the self-hosted app.
    }
  }, [installedVersion]);

  useEffect(() => {
    let intervalId: number | null = null;

    function stopPolling() {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    }

    function startPolling() {
      stopPolling();
      void checkForRelease();
      intervalId = window.setInterval(
        checkForRelease,
        RELEASE_CHECK_INTERVAL_MS,
      );
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        startPolling();
      } else {
        stopPolling();
      }
    }

    if (document.visibilityState === "visible") startPolling();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [checkForRelease]);

  return null;
}
