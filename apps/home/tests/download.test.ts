import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "../src/app/download/route.ts";

test("download preserves the configured installer and bypasses cached redirects", () => {
  const previous = process.env.CREED_DOWNLOAD_URL;
  try {
    process.env.CREED_DOWNLOAD_URL =
      "https://github.com/hpbrn/creed/releases/download/v1.0.0/Creed.dmg";
    const response = GET(
      new Request("https://creed.md/download?release=preview"),
    );
    assert.equal(response.status, 307);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    const destination = new URL(response.headers.get("Location")!);
    assert.ok(destination.pathname.endsWith("/Creed.dmg"));
    assert.equal(destination.searchParams.get("release"), "preview");
    delete process.env.CREED_DOWNLOAD_URL;
    assert.equal(GET(new Request("https://creed.md/download")).status, 503);
  } finally {
    if (previous === undefined) delete process.env.CREED_DOWNLOAD_URL;
    else process.env.CREED_DOWNLOAD_URL = previous;
  }
});
