import type { Node } from "@tiptap/pm/model";
import type { EditorState } from "@tiptap/pm/state";

export function editorContentSync(state: EditorState, incoming: Node) {
  const start = state.doc.content.findDiffStart(incoming.content);
  if (start === null) return null;
  const end = state.doc.content.findDiffEnd(incoming.content)!;
  const overlap = start - Math.min(end.a, end.b);
  if (overlap > 0) {
    end.a += overlap;
    end.b += overlap;
  }
  // Replace only the changed range so ProseMirror maps the live selection.
  return state.tr
    .replace(start, end.a, incoming.slice(start, end.b))
    .setMeta("preventUpdate", true)
    .setMeta("addToHistory", false)
    .setMeta("creed-content-sync", true);
}
