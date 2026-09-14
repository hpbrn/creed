import { useEffect, useState, type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";

export const SPINNER_DELAY_MS = 180;

export function useDelayedPending(pending: boolean, delay = SPINNER_DELAY_MS) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!pending) {
      setVisible(false);
      return;
    }
    const timer = window.setTimeout(() => setVisible(true), delay);
    return () => window.clearTimeout(timer);
  }, [delay, pending]);
  return visible;
}

export function DelayedSpinner({
  pending,
  className,
  fallback = null,
}: {
  pending: boolean;
  className?: string;
  fallback?: ReactNode;
}) {
  return useDelayedPending(pending) ? (
    <LoaderCircle className={className ?? "h-4 w-4 animate-spin"} />
  ) : (
    fallback
  );
}
