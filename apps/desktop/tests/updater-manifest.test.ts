import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { writeUpdaterManifest } from "../scripts/write-updater-manifest.mjs";

test("updater manifest references the signed Apple-silicon archive", () => {
  const directory = mkdtempSync(join(tmpdir(), "creed-updater-"));
  const archive = join(directory, "Creed.app.tar.gz");
  try {
    writeFileSync(archive, "updater archive");
    writeFileSync(`${archive}.sig`, "signed archive\n");
    const output = writeUpdaterManifest({
      bundleDirectory: directory,
      releaseBaseUrl:
        "https://github.com/hpbrn/creed/releases/download/v1.0.1/",
      version: "1.0.1",
    });
    const manifest = JSON.parse(readFileSync(output, "utf8")) as {
      notes: string;
      platforms: Record<string, { signature: string; url: string }>;
      pub_date: string;
      version: string;
    };
    assert.equal(manifest.version, "1.0.1");
    assert.equal(manifest.notes, "Creed 1.0.1.");
    assert.match(manifest.pub_date, /^\d{4}-\d{2}-\d{2}T/);
    assert.deepEqual(manifest.platforms, {
      "darwin-aarch64": {
        signature: "signed archive",
        url: "https://github.com/hpbrn/creed/releases/download/v1.0.1/Creed.app.tar.gz",
      },
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
