import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function createUpdaterManifest({
  archivePath,
  releaseBaseUrl,
  signature,
  version,
}) {
  const url = new URL(basename(archivePath), releaseBaseUrl).href;
  return {
    version,
    notes: `Creed ${version}.`,
    pub_date: new Date().toISOString(),
    platforms: {
      "darwin-aarch64": { signature, url },
    },
  };
}

function requireFile(path, message) {
  if (!statSync(path, { throwIfNoEntry: false })?.isFile()) throw new Error(message);
  return path;
}

export function writeUpdaterManifest({ bundleDirectory, releaseBaseUrl, version }) {
  const archiveName = readdirSync(bundleDirectory).find((name) =>
    name.endsWith(".app.tar.gz"),
  );
  if (!archiveName) throw new Error("The macOS updater archive was not generated.");
  const archivePath = requireFile(
    resolve(bundleDirectory, archiveName),
    "The macOS updater archive is unavailable.",
  );
  const signature = readFileSync(
    requireFile(`${archivePath}.sig`, "The updater signature was not generated."),
    "utf8",
  ).trim();
  if (!signature) throw new Error("The updater signature is empty.");
  const manifest = createUpdaterManifest({
    archivePath,
    releaseBaseUrl,
    signature,
    version,
  });
  const destination = resolve(bundleDirectory, "latest.json");
  writeFileSync(destination, `${JSON.stringify(manifest, null, 2)}\n`);
  return destination;
}

function main() {
  const version = JSON.parse(
    readFileSync(resolve("src-tauri/tauri.conf.json"), "utf8"),
  ).version;
  const repository = process.env.GITHUB_REPOSITORY;
  const tag = process.env.CREED_RELEASE_TAG || process.env.GITHUB_REF_NAME;
  if (!repository || !tag)
    throw new Error("GitHub repository and release tag are required.");
  const releaseBaseUrl = `https://github.com/${repository}/releases/download/${tag}/`;
  const bundleDirectory = resolve("src-tauri/target/release/bundle/macos");
  process.stdout.write(
    `${writeUpdaterManifest({ bundleDirectory, releaseBaseUrl, version })}\n`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
