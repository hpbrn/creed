import { useEffect, useSyncExternalStore } from "react";
import { invoke } from "@tauri-apps/api/core";

let enabled = false;
let revision = 0;
let initialized = false;
const listeners = new Set<() => void>();
export const aiEnabled = () => enabled;
export function setAiEnabled(value: boolean) {
  revision++;
  enabled = value;
  listeners.forEach((listener) => listener());
}
export function subscribeAiAvailability(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function useAiEnabled() {
  const value = useSyncExternalStore(subscribeAiAvailability, aiEnabled, () => false);
  useEffect(() => {
    if (initialized) return;
    initialized = true;
    const current = revision;
    void invoke<boolean>("key_status").then((ready) => {
      if (revision === current) setAiEnabled(ready);
    }).catch(() => undefined);
  }, []);
  return value;
}
