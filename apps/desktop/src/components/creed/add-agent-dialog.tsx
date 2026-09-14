import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { action } from "@/lib/native/workspace";
import { cn } from "@/components/ui/utils";
import { EditableProfileAvatar } from "@/components/creed/profile-avatar";
import type { CustomAgent } from "@/lib/custom-agents";

async function readIcon(file: File): Promise<string> {
  if (
    !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
    file.size > 5 * 1024 * 1024
  ) {
    throw new Error("Choose a PNG, JPEG, or WebP image under 5 MB.");
  }
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This image could not be read.");
    const scale = Math.min(128 / bitmap.width, 128 / bitmap.height);
    const width = bitmap.width * scale;
    const height = bitmap.height * scale;
    context.drawImage(
      bitmap,
      (128 - width) / 2,
      (128 - height) / 2,
      width,
      height,
    );
    return canvas.toDataURL("image/png");
  } finally {
    bitmap.close();
  }
}

export function AddAgent({
  creedId,
  fillCard,
  agent,
  onClose,
}: {
  creedId: string;
  fillCard?: boolean;
  agent?: CustomAgent;
  onClose?: () => void;
}) {
  const [open, setOpen] = useState(Boolean(agent));
  const [name, setName] = useState(agent?.name ?? "");
  const [icon, setIcon] = useState<string | null>(agent?.icon ?? null);
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  async function save() {
    if (busy || reading || !name.trim()) return;
    setBusy(true);
    try {
      await action(creedId, {
        kind: agent ? "edit-agent" : "add-agent",
        agentId: agent?.id,
        name: name.trim(),
        icon,
      });
      setOpen(false);
      onClose?.();
      setName("");
      setIcon(null);
    } catch (error) {
      toast.error(String(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {!agent && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--creed-border-strong)] bg-[var(--creed-surface)] px-4 py-3.5 text-sm font-medium text-[var(--creed-text-secondary)] transition-colors duration-150 hover:border-[var(--creed-text-secondary)] hover:bg-[var(--creed-surface-raised)] hover:text-[var(--creed-text-primary)]",
            fillCard
              ? "lg:h-full lg:min-h-[126px] lg:self-stretch"
              : "lg:col-span-2",
          )}
        >
          <Plus size={16} />
          Add agent
        </button>
      )}
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!busy && !reading) {
            setOpen(next);
            if (!next) onClose?.();
          }
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-[var(--radius-xl)] border-[var(--creed-border)] bg-[var(--creed-surface)] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{agent ? "Edit agent" : "Add agent"}</DialogTitle>
            <DialogDescription>
              Choose a name for your agent. An icon is optional.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            <div className="grid grid-cols-[2.75rem_minmax(0,1fr)] items-center gap-3">
              <EditableProfileAvatar
                kind="person"
                name={name.trim() || "Agent icon"}
                avatarUrl={icon ?? undefined}
                size="input"
                disabled={busy}
                uploading={reading}
                uploadLabel="Upload agent icon"
                fallback={name.trim() ? undefined : "#"}
                accept="image/png,image/jpeg,image/webp"
                onFile={async (file) => {
                  setReading(true);
                  try {
                    setIcon(await readIcon(file));
                  } catch (error) {
                    toast.error(String(error));
                  } finally {
                    setReading(false);
                  }
                }}
              />
              <Input
                aria-label="Agent name"
                autoFocus
                autoComplete="off"
                placeholder="Agent name"
                value={name}
                maxLength={80}
                disabled={busy}
                onChange={(event) => setName(event.target.value)}
                className="h-11 rounded-xl border-[var(--creed-border)] bg-[var(--creed-surface)] px-4"
              />
            </div>
            <DialogFooter className="flex-row items-center justify-between border-t-[var(--creed-border)] bg-[var(--creed-surface)] sm:justify-between">
              <Button
                type="button"
                variant="outline"
                className="rounded-md border-[var(--creed-border)]"
                disabled={busy || reading || (!agent && !name && !icon)}
                onClick={async () => {
                  if (agent) {
                    setBusy(true);
                    try {
                      await action(creedId, {
                        kind: "remove-agent",
                        agentId: agent.id,
                      });
                      setOpen(false);
                      onClose?.();
                    } catch (error) {
                      toast.error(String(error));
                    } finally {
                      setBusy(false);
                    }
                    return;
                  }
                  setName("");
                  setIcon(null);
                }}
              >
                {agent ? "Remove" : "Clear"}
              </Button>
              <Button
                type="submit"
                className="rounded-md bg-[var(--creed-accent)] text-white hover:bg-[var(--creed-accent-hover)]"
                disabled={busy || reading || !name.trim()}
              >
                {agent ? (busy ? "Saving" : "Save") : busy ? "Adding" : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
