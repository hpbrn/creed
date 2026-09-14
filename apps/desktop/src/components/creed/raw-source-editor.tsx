import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { action, registerFlush, useWorkspace } from "@/lib/native/workspace";

type Draft = { source: string; baseline: string };

export function RawSourceEditor({ documentId, active, locked }: {
  documentId: string;
  active: boolean;
  locked: boolean;
}) {
  const state = useWorkspace();
  const document = state.documents.find((item) => item.id === documentId);
  const savedSource = document?.source;
  const savedRevision = document?.revision;
  const storageKey = `creed:source-draft:${documentId}`;
  const [draft, setDraft] = useState<Draft>(() => {
    try {
      const restored: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "null");
      if (restored && typeof restored === "object" && "source" in restored &&
          "baseline" in restored && typeof restored.source === "string" &&
          typeof restored.baseline === "string") return restored as Draft;
    } catch {}
    return { source: document?.source ?? "", baseline: document?.revision ?? "" };
  });
  const current = useRef(draft);
  const dirty = useRef(draft.source !== document?.source);
  const pending = useRef<Promise<void> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const save = useCallback(async () => {
    if (pending.current) await pending.current;
    if (!dirty.current) return;
    const run = async () => {
      while (dirty.current) {
        const snapshot = current.current;
        const next = await action(documentId, { kind: "save-source", ...snapshot });
        const saved = next.documents.find((item) => item.id === documentId);
        if (!saved) throw new Error("The file is no longer available.");
        const latest = { source: current.current.source, baseline: saved.revision };
        current.current = latest;
        dirty.current = latest.source !== snapshot.source;
        setDraft(latest);
        if (dirty.current) localStorage.setItem(storageKey, JSON.stringify(latest));
        else localStorage.removeItem(storageKey);
      }
      setError(null);
    };
    pending.current = run();
    try { await pending.current; }
    catch (cause) { setError(String(cause)); throw cause; }
    finally { pending.current = null; }
  }, [documentId, storageKey]);

  useEffect(() => registerFlush(save, 2), [save]);
  useEffect(() => {
    if (!dirty.current || error) return;
    const timer = window.setTimeout(() => {
      void save().catch((cause: unknown) => toast.error(String(cause)));
    }, 650);
    return () => window.clearTimeout(timer);
  }, [draft, error, save]);
  useEffect(() => {
    if (savedSource === undefined || savedRevision === undefined || dirty.current || pending.current) return;
    const latest = { source: savedSource, baseline: savedRevision };
    current.current = latest;
    setDraft(latest);
  }, [savedSource, savedRevision]);

  return (
    <div className={active ? "flex flex-col gap-3" : "hidden"}>
      {error ? <p role="alert" className="text-sm text-amber-600">{error}</p> : null}
      <div className="relative min-h-56 font-sans text-[17px] leading-[1.75] text-[var(--creed-text-primary)]">
        <div aria-hidden="true" className="invisible whitespace-pre-wrap break-words">{draft.source + "\n"}</div>
      <textarea
        aria-label="Raw Markdown"
        spellCheck={false}
        readOnly={locked || Boolean(document?.missing)}
        className="absolute inset-0 h-full w-full resize-none overflow-hidden border-0 bg-transparent p-0 font-sans text-[17px] leading-[1.75] whitespace-pre-wrap break-words outline-none"
        value={draft.source}
        onChange={(event) => {
          const next = { ...current.current, source: event.target.value };
          try { localStorage.setItem(storageKey, JSON.stringify(next)); }
          catch { toast.error("Couldn’t save a recovery draft."); }
          current.current = next;
          dirty.current = true;
          setDraft(next);
        }}
      />
      </div>
    </div>
  );
}
