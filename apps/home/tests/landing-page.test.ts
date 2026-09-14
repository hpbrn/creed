import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import test from "node:test";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

test("animated demo plates cannot become page scroll anchors", () => {
  const card = read("../src/components/marketing/landing/plate-card.tsx");
  assert.match(card, /\[overflow-anchor:none\]/);
});

test("feature cards remain borderless and section accents match the homepage", () => {
  const card = read("../src/components/marketing/landing/plate-card.tsx");
  assert.doesNotMatch(card, /border border-/);
  const features = read("../src/components/marketing/landing/ai-features.tsx");
  assert.match(features, /border border-\[var\(--creed-border\)\]/);
  const faq = read("../src/components/marketing/landing/faq.tsx");
  assert.doesNotMatch(faq, /text-\[var\(--creed-danger\)\]/);
});

test("both previews are loaded and follow the theme class inside its reveal", () => {
  const source = read("../src/components/marketing/landing/app-preview.tsx");
  assert.doesNotMatch(source, /useTheme/);
  assert.match(source, /loading="eager"/);
  assert.match(source, /decoding="sync"/);
  assert.match(source, /dark:opacity-0/);
  assert.match(source, /dark:opacity-100/);
});

test("the website exposes one page and retains its download and feedback routes", () => {
  const routes = readdirSync(new URL("../src/app", import.meta.url), {
    recursive: true,
  }).map(String);
  assert.deepEqual(
    routes.filter((path) => path.endsWith("page.tsx")),
    ["page.tsx"],
  );
  for (const route of [
    "download",
    "api/feedback",
    "api/github/stars",
    "api/roadmap",
  ]) {
    assert.ok(routes.includes(route + "/route.ts"));
  }
  assert.ok(!existsSync(new URL("../supabase", import.meta.url)));
  const pkg = JSON.parse(read("../package.json"));
  assert.ok(
    !Object.keys(pkg.dependencies).some((name) => /stripe|supabase/.test(name)),
  );
});

test("the homepage keeps only the requested sections in order", () => {
  const source = read("../src/components/marketing/landing/landing-page.tsx");
  const names = [
    "LandingHero",
    "AiFeaturesSection",
    "IntegrationsSection",
    "RoadmapSection",
    "CommunitySponsorsSection",
    "LandingFaqSection",
    "MarketingFooter",
  ];
  let previous = -1;
  for (const name of names) {
    const index = source.indexOf("<" + name);
    assert.ok(index > previous, name);
    previous = index;
  }
  assert.match(source, /<AppPreview/);
  assert.doesNotMatch(
    source,
    /HowCreedWorksSection|GovernedCollaborationSection|ScrollHighlightStatement/,
  );
});

test("the stack lists every desktop Connections agent once with identical icons", () => {
  const source = read("../src/components/marketing/landing/integrations.tsx");
  const provider = read(
    "../../desktop/src/components/creed/creed-provider.tsx",
  );
  const filter = provider
    .split("connections: initialCreedState.connections")[1]
    .split(".includes(connection.id)")[0];
  const desktop = [...filter.matchAll(/"([a-z]+)"/g)]
    .map((match) => match[1])
    .sort();
  const website = [...source.matchAll(/brand: "([a-z]+)"/g)]
    .map((match) => match[1])
    .sort();
  assert.ok(desktop.length > 0);
  assert.deepEqual(website, desktop);
  assert.equal(new Set(website).size, website.length);
  for (const id of website) {
    assert.equal(
      read("../public/assets/agents/" + id + ".svg"),
      read("../../desktop/public/assets/agents/" + id + ".svg"),
      id,
    );
  }
  assert.match(source, /accent="questions"/);
});

test("sponsors stay hidden without data and never use fabricated sponsors", () => {
  const source = read(
    "../src/components/marketing/landing/sponsors.tsx",
  );
  assert.match(source, /if \(sponsors.length === 0\) return null/);
  assert.doesNotMatch(source, /No sponsors yet/);
  assert.doesNotMatch(source, /mockSponsors|alexbuilds|jamiecreates|samcodes/);
  assert.match(source, /sponsors\.slice\(0, 6\)/);
  assert.match(
    source,
    /https:\/\/github\.com\/\$\{encodeURIComponent\(sponsor\.handle\)\}/,
  );
  assert.match(source, /hover:bg-\[var\(--creed-surface-raised\)\]/);
  assert.doesNotMatch(source, /border-|Preview data for now|Sponsor preview/);
  assert.doesNotMatch(source, /fetch\(|usePublicSponsors|\/api\/sponsor/);
});
