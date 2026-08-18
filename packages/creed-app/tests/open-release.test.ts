import assert from "node:assert/strict";
import test from "node:test";

import {
  getOpenVersionFromReleaseTag,
  isNewerOpenVersion,
  OPEN_UPDATE_COMMAND,
} from "../lib/open-release.ts";

test("Open release tags expose stable product versions", () => {
  assert.equal(getOpenVersionFromReleaseTag("open-v1.2.3"), "1.2.3");
  assert.equal(getOpenVersionFromReleaseTag("v1.2.3"), null);
  assert.equal(getOpenVersionFromReleaseTag("open-v1.2.3-beta.1"), null);
});

test("Open only reports a strictly newer stable release", () => {
  assert.equal(isNewerOpenVersion("1.0.1", "1.0.0"), true);
  assert.equal(isNewerOpenVersion("1.1.0", "1.0.9"), true);
  assert.equal(isNewerOpenVersion("2.0.0", "1.99.99"), true);
  assert.equal(isNewerOpenVersion("1.0.0", "1.0.0"), false);
  assert.equal(isNewerOpenVersion("1.0.0", "1.0.1"), false);
  assert.equal(isNewerOpenVersion("1.1.0-beta.1", "1.0.0"), false);
});

test("the Open update notice copies an upstream fast-forward pull", () => {
  assert.equal(
    OPEN_UPDATE_COMMAND,
    "git pull --ff-only https://github.com/hpbrn/creed.git main",
  );
});
