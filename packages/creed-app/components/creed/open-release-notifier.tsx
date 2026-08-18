"use client";

import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { VERSION_UPDATE_TOAST_CLASS_NAMES } from "@/components/creed/app-version-notifier";
import {
  isNewerOpenVersion,
  OPEN_UPDATE_COMMAND,
} from "@/lib/open-release";
import { AnimatedCheckmark } from "@creed/ui/animated-checkmark";
import { CopyIcon } from "@creed/ui/copy";

const OPEN_RELEASE_TOAST_ID = "creed-open-release-update";
const RELEASE_CHECK_INTERVAL_MS = 3_600_000;
const COPIED_TOAST_DURATION_MS = 900;

type OpenReleaseNotifierProps = {
  installedVersion: string;
};

type OpenReleasePayload = {
  version?: string | null;
};

function showCopiedToast() {
  toast.info("New version available", {
    id: OPEN_RELEASE_TOAST_ID,
    duration: Infinity,
    closeButton: false,
    action: {
      label: (
        <>
          <AnimatedCheckmark size={16} />
          <span className="sr-only">Copied</span>
        </>
      ),
      onClick: (event) => event.preventDefault(),
    },
    classNames: VERSION_UPDATE_TOAST_CLASS_NAMES,
  });

  window.setTimeout(
    () => toast.dismiss(OPEN_RELEASE_TOAST_ID),
    COPIED_TOAST_DURATION_MS,
  );
}

export function showOpenReleaseUpdateToast() {
  toast.info("New version available", {
    id: OPEN_RELEASE_TOAST_ID,
    duration: Infinity,
    closeButton: false,
    action: {
      label: (
        <>
          <CopyIcon size={16} aria-hidden="true" />
          <span className="sr-only">Copy update command</span>
        </>
      ),
      onClick: (event) => {
        event.preventDefault();
        void navigator.clipboard
          ?.writeText(OPEN_UPDATE_COMMAND)
          .then(showCopiedToast);
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
      const latestVersion = payload.version?.trim();
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
