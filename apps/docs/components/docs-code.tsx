import type { ReactNode } from "react";
import { CodeCommand } from "@/components/marketing/code-command";

export function DocsCommand({ children }: { children: string }) {
  return <CodeCommand copyText={children} />;
}

export function InlineCode({ children }: { children: ReactNode }) {
  return <code>{children}</code>;
}
