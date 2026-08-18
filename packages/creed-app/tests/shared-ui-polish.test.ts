import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { applyAccountSubmenuOpenChange } from "../lib/account-menu.ts";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

test("shared overlays, consent spacing, and connection actions stay responsive", () => {
  const picker = source("../components/creed/authorize-space-picker.tsx");
  const connections = source("../components/creed/connections-screen.tsx");
  const connectionCard = source("../components/creed/connection-card.tsx");
  const marketingDemo = source("../components/marketing/how-it-works-demos.tsx");
  const toaster = source("../../creed-ui/toaster.tsx");

  assert.match(picker, /py-0 pl-1\.5 pr-3/);
  assert.match(picker, /py-1\.5 pl-1\.5 pr-2/);
  assert.match(toaster, /className="!z-40/);
  assert.match(connections, /\{setupOpen \? "Hide instructions" : "Show instructions"\}/);
  assert.doesNotMatch(connections, /sm:hidden[^\n]*\{setupOpen/);
  assert.doesNotMatch(connectionCard, /min-w-\[116px\]/);
  assert.doesNotMatch(connections, /min-w-\[116px\]/);
  assert.doesNotMatch(marketingDemo, /min-w-\[116px\]/);
});

test("Open model usage omits the redundant BYOK badge", () => {
  const settings = source("../components/creed/settings-screen.tsx");

  assert.match(settings, /\{hasManagedCredits \? \([\s\S]*?\) : null\}/);
  assert.doesNotMatch(settings, /text-\[var\(--creed-text-secondary\)\][^>]*>\s*BYOK/);
});

test("file section preview reuses live heading, column, and tag chips", () => {
  const presentation = source("../components/creed/file-presentation.tsx");
  const fileScreen = source("../components/creed/file-screen.tsx");
  const loading = source("../app/(creed-app)/file/loading.tsx");
  assert.match(presentation, /export function FileSectionsPreview/);
  assert.match(presentation, /sectionTagTargets=\{sectionTagTargets\}/);
  assert.match(presentation, /FILE_SECTION_NAME_CLASS/);
  assert.match(presentation, /FILE_COLUMN_CLASS, "pt-6 md:pt-10"/);
  assert.match(presentation, /: "z-20 mb-6 -mx-4 px-4 py-3/);
  assert.match(presentation, /: "mt-3"/);
  assert.doesNotMatch(presentation, /md:pb-7|md:py-10|md:mb-12/);
  assert.match(loading, /px-4 py-3/);
  assert.match(loading, /md:mb-8/);
  assert.doesNotMatch(loading, /md:pb-7|md:py-10|md:mb-12/);
  assert.match(fileScreen, /FILE_COLUMN_CLASS/);
  assert.match(fileScreen, /FILE_SECTION_NAME_CLASS/);
  const switcher = source("../components/creed/creed-switcher.tsx");
  assert.match(switcher, /inline-flex h-8 max-w-full min-w-0 items-center gap-2\.5/);
  assert.match(switcher, /leading-none tracking-\[-0\.03em\]/);
});

test("section copy stays open with feedback and structural proposals use semantic badges", () => {
  const fileScreen = source("../components/creed/file-screen.tsx");
  const filePresentation = source("../components/creed/file-presentation.tsx");
  const shell = source("../components/creed/shell.tsx");

  assert.match(fileScreen, /event\.preventDefault\(\);\s*onCopy\(\);\s*setSectionCopied\(true\)/);
  assert.match(fileScreen, /sectionCopied \? <AnimatedCheckmark \/> : null/);
  assert.match(fileScreen, /sectionCopied \? "Copied" : "Copy"/);
  assert.match(filePresentation, /pendingDelete\s*\? "bg-\[#dc2626\]"/);
  assert.match(filePresentation, /pendingCreate\s*\? "bg-\[#16A34A\]"/);
  assert.match(shell, /pendingCount=\{1\}\s*pendingCreate/);
});

test("Open owner code boxes hide the mobile caret and use 14px corners", () => {
  const claim = source("../components/auth/open-owner-claim-form.tsx");
  assert.match(claim, /max-md:caret-transparent/);
  assert.match(claim, /rounded-\[14px\]/);
});

test("Open owner unlock is only a masked code and auto-submits", () => {
  const claim = source("../components/auth/open-owner-claim-form.tsx");
  const setup = source("../../creed-open/app/setup/page.tsx");
  const enter = source("../../creed-open/app/enter/page.tsx");

  assert.match(claim, /Enter code/);
  assert.match(claim, /Opening your Creed\./);
  assert.match(claim, /nextPath = "\/file"/);
  assert.match(claim, /text-\[1\.5rem\]/);
  assert.match(claim, /text-\[22px\]/);
  assert.match(claim, /h-10 w-10/);
  assert.match(claim, /OWNER_CODE_GROUPS = \[4, 4\]/);
  assert.match(claim, /•/);
  assert.match(claim, /secret\.length === OWNER_CODE_LENGTH/);
  assert.match(claim, /const nextSecret = next\.join\(""\)/);
  assert.match(claim, /void submitClaim\(nextSecret\)/);
  assert.doesNotMatch(claim, /useEffect\(\(\) => \{\s*if \(secret\.length === OWNER_CODE_LENGTH\)/);
  assert.match(claim, /OPEN_OWNER_OK_STORAGE_KEY/);
  assert.match(claim, /localStorage\.setItem/);
  assert.doesNotMatch(claim, /\bClear\b|Continue|EyeToggle|Show owner code|Hide owner code/);
  assert.doesNotMatch(claim, /hidden \? "•" : digit/);
  assert.doesNotMatch(setup, /CreedWordmark|OpenOwnerClaimForm/);
  assert.doesNotMatch(setup, /Finish the setup, then return here to open your Creed/);
  assert.match(setup, /Setup your Creed/);
  assert.match(setup, /OPEN_ENTER_PATH/);
  assert.match(enter, /OpenOwnerClaimForm/);
  assert.match(enter, /OPEN_SETUP_PATH/);
});

test("sidebar collapse keeps page nav aligned and fades Sections into a line", () => {
  const shell = source("../components/creed/shell.tsx");
  const presentation = source("../components/creed/file-presentation.tsx");
  const panel = source("../components/creed/panel.tsx");

  assert.match(shell, /relative hidden h-8 w-full lg:block/);
  assert.match(shell, /<nav className="mt-4 space-y-1">/);
  assert.match(shell, /w-\[calc\(3rem\+1px\)\] shrink-0/);
  assert.match(shell, /lg:w-\[220px\]/);
  assert.doesNotMatch(shell, /grid-cols-\[48px/);
  assert.match(shell, /px-2 py-3/);
  assert.doesNotMatch(presentation, /lg:mx-auto lg:w-8/);
  assert.doesNotMatch(shell, /lg:mt-8/);
  assert.doesNotMatch(shell, /justify-center pt-4/);
  assert.doesNotMatch(shell, /lg:py-5/);
  assert.match(shell, />\s*Sections\s*</);
  assert.match(shell, /w-3\.5 -translate-x-1\/2 -translate-y-1\/2 rounded-full/);
  assert.match(presentation, /sidebarLabelRevealClass/);
  assert.match(presentation, /sidebarNavRowClass/);
  assert.match(presentation, /sidebarIconSlotClass/);
  assert.match(
    presentation,
    /lg:justify-start lg:transition-\[gap,padding\]/,
  );
  assert.match(presentation, /lg:gap-0 lg:px-0/);
  assert.match(presentation, /lg:gap-3 lg:px-2/);
  assert.doesNotMatch(presentation, /lg:justify-center/);
  assert.match(shell, /sidebarIconSlotClass\(collapsed\)/);
  assert.match(panel, /flex h-8 w-full items-center gap-2\.5/);
  assert.match(
    shell,
    /group\/account relative mx-auto block h-8 w-8 bg-transparent/,
  );
  assert.match(
    shell,
    /overflow-hidden rounded-sm hover:bg-\[var\(--creed-surface-raised\)\]/,
  );
  assert.match(shell, /rounded-\[8px\]/);
  assert.match(shell, /lg:pl-\[6px\]/);
  assert.doesNotMatch(shell, /rounded-\[var\(--radius-sm\)\]/);
  assert.match(shell, /The trigger box stays still/);
  assert.match(shell, /accountTriggerRef.current\?\.matches\(":hover"\)/);
  assert.match(shell, /accountHovered && "bg-\[var\(--creed-surface-raised\)\]"/);
  assert.match(shell, /sidebarNavRowClass\(collapsed\)/);
});

test("mobile account submenus ignore Radix closes after a tap toggle", () => {
  const calls: boolean[] = [];
  applyAccountSubmenuOpenChange(true, false, (open) => calls.push(open));
  assert.deepEqual(calls, []);
  applyAccountSubmenuOpenChange(true, true, (open) => calls.push(open));
  applyAccountSubmenuOpenChange(false, false, (open) => calls.push(open));
  assert.deepEqual(calls, [true, false]);
});

test("account menu rows match the switcher inset and 32px sidebar rows", () => {
  const accountMenu = source("../lib/account-menu.ts");
  const shell = source("../components/creed/shell.tsx");
  const status = source("../components/creed/status-menu.tsx");
  const feedback = source("../../creed-cloud/components/creed/feedback-menu.tsx");
  assert.match(accountMenu, /export const ACCOUNT_MENU_ITEM_CLASS/);
  assert.match(accountMenu, /h-8 gap-2 rounded-sm px-1\.5 py-0/);
  assert.match(shell, /rounded-lg border-\[var\(--creed-border\)\] bg-\[var\(--creed-surface\)\] p-1/);
  assert.match(shell, /className=\{ACCOUNT_MENU_ITEM_CLASS\}/);
  assert.match(status, /ACCOUNT_MENU_ITEM_CLASS/);
  assert.match(feedback, /ACCOUNT_MENU_ITEM_CLASS/);
  assert.match(status, /applyAccountSubmenuOpenChange/);
  assert.match(feedback, /applyAccountSubmenuOpenChange/);
  assert.match(status, /useAccountAlignedPanel\(open\)/);
  assert.match(feedback, /useAccountAlignedPanel\(open\)/);
  assert.doesNotMatch(feedback, /useAccountAlignedPanel\(open, isMobile\)/);
  assert.match(feedback, /height: panelHeight/);
  assert.match(feedback, /minHeight: panelHeight/);
  assert.match(feedback, /maxHeight: panelHeight/);
  assert.match(feedback, /min-h-0 flex-1 resize-none/);
  assert.match(feedback, /fieldSizing: "fixed"/);
  assert.match(feedback, /mt-2\.5 flex shrink-0 items-center justify-between gap-2/);
  assert.doesNotMatch(feedback, /md:h-\[132px\]/);
  assert.doesNotMatch(feedback, /mt-auto flex shrink-0/);
});

test("Get started card is visible on mobile", () => {
  const card = source("../components/creed/getting-started-card.tsx");
  assert.match(card, /w-\[min\(356px,calc\(100vw-2\.5rem\)\)\]/);
  assert.doesNotMatch(card, /hidden w-\[356px\] sm:block/);
});

test("file header outline pills share one mobile focus ring reset", () => {
  const presentation = source("../components/creed/file-presentation.tsx");
  const file = source("../components/creed/file-screen.tsx");
  const demo = source("../components/marketing/creed-app-demo.tsx");
  assert.match(
    presentation,
    /export const FILE_HEADER_OUTLINE_MOBILE_FOCUS_CLASS/,
  );
  assert.match(
    presentation,
    /max-md:focus-visible:border-\[var\(--creed-border\)\] max-md:focus-visible:ring-0/,
  );
  assert.equal(
    (file.match(/FILE_HEADER_OUTLINE_MOBILE_FOCUS_CLASS/g) ?? []).length,
    7,
  );
  assert.equal(
    (demo.match(/FILE_HEADER_OUTLINE_MOBILE_FOCUS_CLASS/g) ?? []).length,
    6,
  );
});

test("mobile review-pill actions sit 2px closer to the card edges", () => {
  const reviewPill = source("../components/creed/review-pill.tsx");
  assert.match(
    reviewPill,
    /border-t border-\[var\(--creed-border\)\] px-1\.5 py-1\.5/,
  );
});
