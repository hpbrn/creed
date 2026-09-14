import assert from "node:assert/strict";
import test from "node:test";
import { onSettledResize } from "../src/lib/settled-resize";

test("slow continuous resizing still defers the native check", (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const target = new EventTarget();
  let ends = 0;
  const stop = onSettledResize(target, () => ends++, 250);
  for (let i = 0; i < 10; i++) {
    target.dispatchEvent(new Event("resize"));
    context.mock.timers.tick(100);
  }
  assert.equal(ends, 0);
  context.mock.timers.tick(250);
  assert.equal(ends, 1);
  target.dispatchEvent(new Event("resize"));
  stop();
});

test("native checks wait until a continuous resize finishes", (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const target = new EventTarget();
  let calls = 0;
  const stop = onSettledResize(target, () => calls++);
  for (let i = 0; i < 100; i++) {
    target.dispatchEvent(new Event("resize"));
    context.mock.timers.tick(16);
  }
  assert.equal(calls, 0);
  context.mock.timers.tick(120);
  assert.equal(calls, 1);
  stop();
});

test("cleanup cancels pending and future resize checks", (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const target = new EventTarget();
  let calls = 0;
  const stop = onSettledResize(target, () => calls++);
  target.dispatchEvent(new Event("resize"));
  stop();
  target.dispatchEvent(new Event("resize"));
  context.mock.timers.tick(1000);
  assert.equal(calls, 0);
});
