import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const source = readFileSync(
  resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../../creed-ui/waypoints.tsx",
  ),
  "utf8",
);

test("Nexus hover pulses dots and leaves connectors unanimated", () => {
  assert.doesNotMatch(source, /<motion\.path/);
  assert.doesNotMatch(source, /PATH_VARIANTS/);
  assert.doesNotMatch(source, /pathLength\s*:/);
  assert.match(source, /scale: \[1, 1\.24, 1\]/);
  assert.match(source, /transformBox: "fill-box"/);
  assert.match(source, /d="m10\.586 5\.414-5\.172 5\.172"/);
  assert.match(source, /d="M6 12h12"/);

  const circleIdx = source.lastIndexOf("motion.circle");
  const pathIdx = source.indexOf('d="m10.586');
  assert.ok(circleIdx >= 0 && pathIdx > circleIdx);
});
