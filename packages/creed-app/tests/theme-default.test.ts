import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(
  new URL("../public/theme-init.js", import.meta.url),
  "utf8",
);

function runThemeInit({
  stored,
  systemDark,
}: {
  stored: string | null;
  systemDark: boolean;
}) {
  const classes = new Set<string>();
  const style: { colorScheme?: string } = {};

  vm.runInNewContext(source, {
    localStorage: { getItem: () => stored },
    matchMedia: () => ({ matches: systemDark }),
    document: {
      documentElement: {
        classList: {
          toggle(name: string, enabled: boolean) {
            if (enabled) classes.add(name);
            else classes.delete(name);
          },
        },
        style,
      },
    },
  });

  return { classes, colorScheme: style.colorScheme };
}

test("the main app follows a dark device theme without a saved preference", () => {
  const result = runThemeInit({ stored: null, systemDark: true });
  assert.equal(result.classes.has("dark"), true);
  assert.equal(result.colorScheme, "dark");
});

test("the main app follows a light device theme without a saved preference", () => {
  const result = runThemeInit({ stored: null, systemDark: false });
  assert.equal(result.classes.has("dark"), false);
  assert.equal(result.colorScheme, "light");
});

test("a saved Creed theme overrides the device theme", () => {
  const light = runThemeInit({ stored: "light", systemDark: true });
  const dark = runThemeInit({ stored: "dark", systemDark: false });
  assert.equal(light.classes.has("dark"), false);
  assert.equal(light.colorScheme, "light");
  assert.equal(dark.classes.has("dark"), true);
  assert.equal(dark.colorScheme, "dark");
});

test("the main layout keeps hydrated theme changes on the system preference", () => {
  const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /<ThemeProvider followSystem>/);
});
