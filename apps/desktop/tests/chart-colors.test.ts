import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChartContainer } from "../src/components/ui/chart.tsx";
import { AI_FEATURE_META } from "../src/lib/ai/features.ts";

test("chart palettes are present on the container without injected stylesheets", () => {
  const html = renderToStaticMarkup(
    // ChartContainer requires children in its props type for createElement.
    // eslint-disable-next-line react/no-children-prop
    createElement(ChartContainer, {
      config: AI_FEATURE_META,
      chartHeight: 120,
      children: createElement("div"),
    }),
  );
  assert.match(html, /--color-analysis:#2563EB/);
  assert.match(html, /--color-tab:#16A34A/);
  assert.match(html, /--color-panel:#DB2777/);
  assert.doesNotMatch(html, /<style/);
});
