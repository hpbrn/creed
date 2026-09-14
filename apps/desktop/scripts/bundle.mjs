import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  renameSync,
  rmSync,
  readdirSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(`${command} failed with exit code ${result.status ?? 1}.`);
  }
}

function finalizeDmgLayout(dmgPath) {
  const workingDirectory = mkdtempSync(join(tmpdir(), "creed-dmg-"));
  const writableDmg = resolve(workingDirectory, "writable.dmg");
  const repairedDmg = resolve(workingDirectory, "repaired.dmg");
  const mountPoint = resolve(workingDirectory, "volume");
  let mounted = false;
  mkdirSync(mountPoint);

  try {
    run("hdiutil", ["convert", dmgPath, "-format", "UDRW", "-o", writableDmg]);
    run("hdiutil", [
      "attach",
      writableDmg,
      "-nobrowse",
      "-mountpoint",
      mountPoint,
    ]);
    mounted = true;
    rmSync(resolve(mountPoint, ".VolumeIcon.icns"), { force: true });
    copyFileSync(
      resolve("src-tauri/installer/finder-layout.bin"),
      resolve(mountPoint, ".DS_Store"),
    );
    run("hdiutil", ["detach", mountPoint]);
    mounted = false;
    run("hdiutil", [
      "convert",
      writableDmg,
      "-format",
      "UDZO",
      "-imagekey",
      "zlib-level=9",
      "-o",
      repairedDmg,
    ]);
    copyFileSync(repairedDmg, dmgPath);
  } finally {
    if (mounted) {
      const detached = spawnSync("hdiutil", ["detach", mountPoint], {
        stdio: "inherit",
      });
      if (detached.status !== 0) {
        throw new Error(`Could not detach installer volume at ${mountPoint}.`);
      }
    }
    rmSync(workingDirectory, { recursive: true, force: true });
  }
}

run("cargo", [
  "build",
  "--release",
  "--manifest-path",
  "src-tauri/Cargo.toml",
  "--bin",
  "creed-mcp",
]);
const bridge = resolve("src-tauri/target/release/creed-mcp");
const rust = spawnSync("rustc", ["-vV"], { encoding: "utf8" });
const target = rust.stdout?.match(/^host: (.+)$/m)?.[1];
if (!target) throw new Error("Could not identify the Rust target.");
mkdirSync("src-tauri/binaries", { recursive: true });
copyFileSync(bridge, `src-tauri/binaries/creed-mcp-${target}`);
const config = {
  bundle: {
    externalBin: ["binaries/creed-mcp"],
    macOS: { signingIdentity: process.env.APPLE_SIGNING_IDENTITY || "-" },
  },
};
if (process.env.CREED_UPDATER_PUBLIC_KEY && process.env.CREED_UPDATER_URL) {
  const endpoint = new URL(process.env.CREED_UPDATER_URL);
  if (endpoint.protocol !== "https:")
    throw new Error("The updater feed must use HTTPS.");
  config.plugins = {
    updater: {
      pubkey: process.env.CREED_UPDATER_PUBLIC_KEY,
      endpoints: [endpoint.href],
    },
  };
  config.bundle.createUpdaterArtifacts = true;
}
rmSync(resolve("src-tauri/target/release/bundle/macos/Creed.app"), {
  recursive: true,
  force: true,
});
run("tauri", ["build", "--config", JSON.stringify(config)]);
const application = resolve("src-tauri/target/release/bundle/macos/Creed.app");
run("codesign", ["--verify", "--deep", "--strict", application]);
run("plutil", [
  "-extract",
  "CFBundleIconFile",
  "raw",
  `${application}/Contents/Info.plist`,
]);
if (!statSync(`${application}/Contents/Resources/icon.icns`).isFile())
  throw new Error("The Creed app icon was not bundled.");
if (!(statSync(`${application}/Contents/MacOS/creed-mcp`).mode & 0o111))
  throw new Error("The bundled MCP bridge is not executable.");
const directory = "src-tauri/target/release/bundle/dmg";
const dmg = readdirSync(directory)
  .filter((name) => name.endsWith(".dmg") && name.startsWith("Creed_"))
  .sort(
    (a, b) =>
      statSync(resolve(directory, b)).mtimeMs -
      statSync(resolve(directory, a)).mtimeMs,
  )[0];
if (!dmg) throw new Error("The Mac installer was not generated.");
const sourceDmg = resolve(directory, dmg);
const releaseDmg = resolve(directory, "Creed.dmg");
finalizeDmgLayout(sourceDmg);
renameSync(sourceDmg, releaseDmg);
run("hdiutil", ["verify", releaseDmg]);
const downloads = resolve("../home/public/downloads");
mkdirSync(downloads, { recursive: true });
copyFileSync(releaseDmg, resolve(downloads, "Creed.dmg"));
