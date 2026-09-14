import { useEffect, useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  action,
  flushEdits,
  registerFlush,
  workspace,
} from "@/lib/native/workspace";
import { toast } from "sonner";

export const OPEN_SOURCE_EVENT = "creed:open-markdown-source";
export function NativeSourceDialog() {
  const [draft, setDraft] = useState<{
    documentId: string;
    source: string;
    baseline: string;
  } | null>(null);
  const current = useRef(draft);
  current.current = draft;
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const open = () => {
      void (async () => {
        await flushEdits();
        const state = workspace();
        const document = state.documents.find(
          (item) => item.id === state.activeId,
        );
        if (!document) return;
        let restored: { source: string; baseline: string } | null = null;
        try {
          restored = JSON.parse(
            localStorage.getItem(`creed:source-draft:${document.id}`) ?? "null",
          );
        } catch {
          /* Invalid drafts never replace file content. */
        }
        setDraft({
          documentId: document.id,
          source: restored?.source ?? document.source,
          baseline: restored?.baseline ?? document.revision,
        });
      })().catch((error: unknown) => toast.error(String(error)));
    };
    window.addEventListener(OPEN_SOURCE_EVENT, open);
    return () => window.removeEventListener(OPEN_SOURCE_EVENT, open);
  }, []);
  async function save() {
    const value = current.current;
    if (!value) return;
    setBusy(true);
    try {
      await action(value.documentId, {
        kind: "save-source",
        source: value.source,
        baseline: value.baseline,
      });
      localStorage.removeItem(`creed:source-draft:${value.documentId}`);
      setDraft(null);
    } finally {
      setBusy(false);
    }
  }
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => registerFlush(() => saveRef.current(), 2), []);
  return (
    <Dialog
      open={draft !== null}
      onOpenChange={(open) => {
        if (!open) setDraft(null);
      }}
    >
      <DialogContent className="max-w-3xl! rounded-[var(--radius-xl)]">
        <DialogHeader>
          <DialogTitle>Markdown source</DialogTitle>
          <DialogDescription>
            Edit the file directly. A conflicting external edit will not be
            overwritten.
          </DialogDescription>
        </DialogHeader>
        <textarea
          aria-label="Markdown source"
          className="h-[55vh] resize-none rounded-lg border border-[var(--creed-border)] bg-[var(--creed-surface)] p-4 font-mono text-sm outline-none"
          value={draft?.source ?? ""}
          onChange={(event) => {
            if (!draft) return;
            const next = { ...draft, source: event.target.value };
            localStorage.setItem(
              `creed:source-draft:${draft.documentId}`,
              JSON.stringify(next),
            );
            setDraft(next);
          }}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setDraft(null)}>
            Close
          </Button>
          <Button
            disabled={busy}
            onClick={() =>
              void save().catch((error: unknown) => toast.error(String(error)))
            }
          >
            Save to file
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
