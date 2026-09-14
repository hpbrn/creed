import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, FolderOpen, Plus, Upload } from "lucide-react";
import { DelayedSpinner } from "@/components/ui/delayed-spinner";
import { openDocumentPath, workspace } from "@/lib/native/workspace";
import { toast } from "sonner";

export function NewCreedDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountName?: string;
  initials?: string;
  onCreated?: (creed: { id: string }) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [selection, setSelection] = useState<{
    path: string;
    create: boolean;
  } | null>(null);
  const busyRef = useRef(busy);
  busyRef.current = busy;
  useEffect(() => {
    if (!open) {
      const reset = window.setTimeout(() => {
        setSelection(null);
        setDragging(false);
      }, 200);
      return () => window.clearTimeout(reset);
    }
    let disposed = false;
    const listener = getCurrentWebview()
      .onDragDropEvent(({ payload }) => {
        if (disposed || busyRef.current) return;
        setDragging(payload.type === "enter" || payload.type === "over");
        if (payload.type !== "drop") return;
        if (
          payload.paths.length !== 1 ||
          !/\.(md|markdown)$/i.test(payload.paths[0])
        ) {
          toast.error("Choose one Markdown file (.md or .markdown).");
          return;
        }
        setSelection({ path: payload.paths[0], create: false });
      })
      .catch(() => () => {});
    return () => {
      disposed = true;
      void listener.then((off) => off());
    };
  }, [open]);
  async function choose(create: boolean) {
    setChoosing(true);
    try {
      const path = await invoke<string | null>("choose_document_path", {
        create,
      });
      if (path) setSelection({ path, create });
    } catch (error) {
      toast.error(String(error));
    } finally {
      setChoosing(false);
    }
  }
  async function continueWithFile() {
    if (!selection || busy || choosing) return;
    setBusy(true);
    try {
      await openDocumentPath(selection.path, selection.create);
      const id = workspace().activeId;
      if (id) await onCreated?.({ id });
      onOpenChange(false);
    } catch (error) {
      toast.error(String(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!busy && !choosing) onOpenChange(next);
      }}
    >
      <DialogContent
        className="sm:max-w-[440px] border-[var(--creed-border)] bg-[var(--creed-surface)]"
        showCloseButton={workspace().activeId !== null}
      >
        <DialogHeader>
          <DialogTitle>Open a Creed</DialogTitle>
          <DialogDescription>
            Create a new file or open an existing Markdown file.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            disabled={busy || choosing}
            onClick={() => void choose(true)}
          >
            <Plus size={14} />
            Create new file
          </Button>
          <Button
            variant="outline"
            disabled={busy || choosing}
            onClick={() => void choose(false)}
          >
            <FolderOpen size={14} />
            Open existing file
          </Button>
        </div>
        <button
          type="button"
          disabled={busy || choosing}
          onClick={() => void choose(false)}
          className={`flex min-h-36 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-5 text-center transition-colors ${dragging ? "border-green-500 bg-green-500/5" : "border-[var(--creed-border-strong)] hover:bg-[var(--creed-surface-raised)]"}`}
        >
          {selection ? (
            <FileText size={24} className="text-[var(--creed-accent)]" />
          ) : (
            <Upload size={22} className="text-[var(--creed-text-tertiary)]" />
          )}
          <span className="max-w-full truncate text-sm font-medium">
            {selection
              ? selection.path.split(/[\\/]/).pop()
              : "Drop a Markdown file here"}
          </span>
          <span className="text-xs text-[var(--creed-text-tertiary)]">
            {selection
              ? selection.create
                ? "New file, ready to create"
                : "Ready to open"
              : "or click to browse"}
          </span>
        </button>
        <DialogFooter className="flex-row items-center justify-between border-t-[var(--creed-border)] bg-[var(--creed-surface)] sm:justify-between">
          <Button
            variant="outline"
            className="rounded-md border-[var(--creed-border)]"
            disabled={busy || choosing || !selection}
            onClick={() => setSelection(null)}
          >
            Clear
          </Button>
          <Button
            className="rounded-md bg-[var(--creed-accent)] text-white transition-colors hover:bg-[var(--creed-accent-hover)]"
            disabled={busy || choosing || !selection}
            onClick={() => void continueWithFile()}
          >
            <DelayedSpinner pending={busy} className="h-3.5 w-3.5 animate-spin" />
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
