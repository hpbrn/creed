import assert from "node:assert/strict";
import test from "node:test";
import { aiEnabled, setAiEnabled, subscribeAiAvailability } from "../src/lib/native/ai-availability.ts";

test("AI availability follows key changes and unsubscribes cleanly", () => {
  const changes: boolean[] = [];
  const unsubscribe = subscribeAiAvailability(() => changes.push(aiEnabled()));
  try {
    setAiEnabled(true);
    assert.equal(aiEnabled(), true);
    setAiEnabled(false);
    assert.equal(aiEnabled(), false);
    assert.deepEqual(changes, [true, false]);
    unsubscribe();
    setAiEnabled(false);
    assert.equal(changes.length, 2);
  } finally {
    unsubscribe();
    setAiEnabled(false);
  }
});
