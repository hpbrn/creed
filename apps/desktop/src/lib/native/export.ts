import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { flushEdits } from "./workspace";

export function downloadFile(filename: string, content: string | (() => string), _type: string) {
  void flushEdits()
    .then(() => invoke("export_file", { filename, content: typeof content === "function" ? content() : content }))
    .catch((error: unknown) => toast.error(String(error)));
}
