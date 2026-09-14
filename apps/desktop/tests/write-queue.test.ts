import assert from "node:assert/strict";
import test from "node:test";
import { createWriteQueue } from "../src/lib/native/write-queue.ts";

test("a rejected rename is reported once and does not poison later flushes or writes", async () => {
  const queue = createWriteQueue();
  await assert.rejects(
    queue.enqueue(async () => {
      throw new Error("Name exists");
    }),
    /Name exists/,
  );
  await queue.idle();
  assert.equal(await queue.enqueue(async () => "renamed"), "renamed");
  await queue.idle();
});

test("writes remain serialized after a failure", async () => {
  const queue = createWriteQueue();
  const events: number[] = [];
  const first = queue.enqueue(async () => {
    events.push(1);
    throw new Error("failed");
  });
  const second = queue.enqueue(async () => {
    events.push(2);
  });
  await assert.rejects(first);
  await second;
  assert.deepEqual(events, [1, 2]);
});
