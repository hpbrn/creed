import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

test("homepage drops the demo and first two sections for a scroll statement", () => {
  const page = source(
    "../../creed-marketing/components/marketing/landing/landing-page.tsx",
  );
  const hero = source(
    "../../creed-marketing/components/auth/landing-hero.tsx",
  );
  const statement = source(
    "../../creed-marketing/components/marketing/landing/scroll-highlight-statement.tsx",
  );
  const governed = source(
    "../../creed-marketing/components/marketing/landing/governed.tsx",
  );
  const activityDemo = source(
    "../components/marketing/how-creed-works-demos.tsx",
  );

  assert.match(page, /ScrollHighlightStatement/);
  assert.doesNotMatch(page, /WhyUseItSection|WhyNotOtherToolsSection|HowItWorksSection/);
  assert.doesNotMatch(hero, /CreedAppDemo/);
  assert.match(hero, /items-center justify-center pb-\[10vh\] text-center/);
  assert.doesNotMatch(hero, /Tell every agent who you are/);
  assert.match(hero, /HeroGitHubButton/);
  assert.match(hero, /View repo/);
  assert.match(hero, /bg-white pl-3\.5 pr-3[\s\S]*text-black/);
  assert.doesNotMatch(hero, /border-2 border-white\/45/);
  assert.match(hero, /GitHubMark/);
  assert.match(hero, /ArrowUpRightIcon/);
  assert.doesNotMatch(hero, /useGitHubStars|github-star-icon/);
  assert.doesNotMatch(page, /ClosingCtaSection/);
  assert.match(statement, /Your personal information is valuable/);
  assert.match(statement, /It should stay in your control/);
  assert.match(statement, /Creed gives it back to you/);
  assert.match(page, /bg-\[var\(--creed-background\)\]/);
  assert.doesNotMatch(statement, /bg-\[var\(--creed-background\)\]/);
  assert.match(statement, /t-section/);
  assert.doesNotMatch(statement, /\u2014/);
  const features = source(
    "../../creed-marketing/components/marketing/landing/ai-features.tsx",
  );
  assert.match(features, /Models inside the file/);
  assert.match(features, /accentColorMap\.projects/);
  assert.match(features, /creed-tab-ghost/);
  assert.doesNotMatch(features, /#06B6D4/);
  assert.match(
    source("../../creed-marketing/components/marketing/landing/plate-card.tsx"),
    /lg:aspect-\[5\/4\]/,
  );
  assert.doesNotMatch(features, /AI inside the file/);
  assert.match(governed, /plateColor="var\(--plate-yellow\)"/);
  assert.match(governed, /plateColor="var\(--plate-purple\)"/);
  assert.match(activityDemo, /chamath\.md/);
  assert.doesNotMatch(activityDemo, /Chamath\.md/);
});

function functionSource(path: string, name: string) {
  const file = source(path);
  const start = file.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `${name} missing in ${path}`);
  const next = file.indexOf("\nfunction ", start + 1);
  return file.slice(start, next === -1 ? undefined : next);
}

test("homepage proposal bars put the chevron after the diff stats", () => {
  for (const bar of [
    functionSource("../components/marketing/how-creed-works-demos.tsx", "MiniProposalDiff"),
    functionSource("../components/marketing/governed-demos.tsx", "DemoProposalDiff"),
  ]) {
    assert.match(bar, /<DiffBadge tone="removed"[\s\S]{0,220}<AnimatedChevronDown/);
    assert.doesNotMatch(bar, /<AnimatedChevronDown[\s\S]*?<DiffBadge/);
    assert.match(bar, /px-3 py-2/);
    assert.match(bar, /rounded-xl/);
    assert.match(bar, />proposed</);
  }
});
