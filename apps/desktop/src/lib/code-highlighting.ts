import bash from "highlight.js/lib/languages/bash";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import markdown from "highlight.js/lib/languages/markdown";
import typescript from "highlight.js/lib/languages/typescript";
import yaml from "highlight.js/lib/languages/yaml";
import { createLowlight } from "lowlight";

// One intentionally narrow grammar set for every Creed code surface. Keeping
// this shared prevents the editor and read-only renderers drifting in colour or
// language support.
export const creedLowlight = createLowlight({
  bash,
  javascript,
  json,
  markdown,
  typescript,
  yaml,
});

export function highlightCreedCode(
  code: string,
  language?: string,
): ReturnType<typeof creedLowlight.highlight> | null {
  if (!code) return null;
  const name = language?.trim().toLowerCase() ?? "";
  try {
    const tree =
      name && creedLowlight.registered(name)
        ? creedLowlight.highlight(name, code)
        : creedLowlight.highlightAuto(code);
    return tree.children.length ? tree : null;
  } catch {
    return null;
  }
}
