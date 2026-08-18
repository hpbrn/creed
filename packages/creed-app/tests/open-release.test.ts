import assert from "node:assert/strict";
import test from "node:test";

import {
  getOpenVersionFromReleaseTag,
  isNewerOpenVersion,
  findLatestOpenRelease,
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

const release = (tag_name: string) => ({ tag_name, draft: false, prerelease: false });

test("Open lookup ignores Cloud, draft and prerelease releases and selects highest version", async () => {
  const version = await findLatestOpenRelease(async () => [
    release("cloud-v9.0.0"), release("open-v1.2.0"), release("open-v1.10.0"),
    { ...release("open-v2.0.0"), draft: true },
    { ...release("open-v3.0.0"), prerelease: true },
    release("open-v4.0.0-beta.1"), null,
  ]);
  assert.equal(version, "1.10.0");
});

test("Open lookup follows pagination past unrelated releases", async () => {
  const pages: number[] = [];
  assert.equal(await findLatestOpenRelease(async (page) => {
    pages.push(page);
    return page === 1 ? Array.from({ length: 100 }, () => release("cloud-v2.0.0")) : [release("open-v1.0.1")];
  }), "1.0.1");
  assert.deepEqual(pages, [1, 2]);
});

test("Open lookup distinguishes no release from a failed lookup", async () => {
  assert.equal(await findLatestOpenRelease(async () => []), null);
  await assert.rejects(findLatestOpenRelease(async () => ({ message: "rate limited" })));
  await assert.rejects(findLatestOpenRelease(async () => { throw new Error("offline"); }));
});
