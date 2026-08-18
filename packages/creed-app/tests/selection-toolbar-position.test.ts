import assert from "node:assert/strict";
import test from "node:test";
import { selectionToolbarPosition } from "../lib/selection-toolbar-position.ts";

const toolbar = {
  toolbarHeight: 36,
  toolbarWidth: 400,
  gap: 8,
  padding: 8,
};

test("mobile toolbar pins to the visual viewport bottom in document coordinates", () => {
  assert.deepEqual(
    selectionToolbarPosition({
      selection: { left: 120, right: 260, top: 396, bottom: 416 },
      viewport: { left: 0, top: 96, width: 390, height: 510 },
      pinToViewportBottom: true,
      ...toolbar,
    }),
    { x: 195, y: 562, placeBelow: true },
  );
});

test("selection toolbar follows document coordinates when the viewport is panned", () => {
  assert.deepEqual(
    selectionToolbarPosition({
      selection: { left: 120, right: 260, top: 396, bottom: 416 },
      viewport: { left: 0, top: 96, width: 390, height: 510 },
      ...toolbar,
    }),
    { x: 195, y: 388, placeBelow: false },
  );
});

test("selection near the visible top places the toolbar below", () => {
  assert.deepEqual(
    selectionToolbarPosition({
      selection: { left: 120, right: 260, top: 120, bottom: 140 },
      viewport: { left: 0, top: 96, width: 390, height: 510 },
      ...toolbar,
    }),
    { x: 195, y: 148, placeBelow: true },
  );
});

test("narrow viewports keep the toolbar within their horizontal edges", () => {
  assert.equal(
    selectionToolbarPosition({
      selection: { left: 12, right: 32, top: 300, bottom: 320 },
      viewport: { left: 0, top: 0, width: 320, height: 500 },
      ...toolbar,
    }).x,
    160,
  );
});
