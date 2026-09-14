import assert from "node:assert/strict";
import test from "node:test";
import { Schema } from "@tiptap/pm/model";
import { EditorState, TextSelection } from "@tiptap/pm/state";
import { editorContentSync } from "../src/lib/editor-content-sync";

const schema = new Schema({ nodes: {
  doc: { content: "paragraph+" },
  paragraph: { content: "text*" },
  text: {},
} });
const doc = (...lines: string[]) => schema.node("doc", null,
  lines.map((line) => schema.node("paragraph", null, line ? schema.text(line) : null)));

test("equivalent sync leaves selection and pending editor state untouched", () => {
  const content = doc("Typing here");
  const state = EditorState.create({ doc: content, selection: TextSelection.create(content, 5) });
  assert.equal(editorContentSync(state, doc("Typing here")), null);
});

test("sync maps the cursor instead of resetting it to the end", () => {
  const content = doc("First", "Typing here");
  const state = EditorState.create({ doc: content, selection: TextSelection.create(content, 12) });
  const transaction = editorContentSync(state, doc("New First", "Typing here"))!;
  assert.equal(transaction.selection.from, 16);
  assert.equal(transaction.getMeta("preventUpdate"), true);
  assert.equal(transaction.getMeta("addToHistory"), false);
});

test("sync after the caret preserves its position", () => {
  const content = doc("Typing here", "Last");
  const state = EditorState.create({ doc: content, selection: TextSelection.create(content, 5, 8) });
  const transaction = editorContentSync(state, doc("Typing here", "Last changed"))!;
  assert.equal(transaction.selection.from, 5);
  assert.equal(transaction.selection.to, 8);
});
