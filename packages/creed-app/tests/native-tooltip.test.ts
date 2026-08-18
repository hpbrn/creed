import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const sourceRoots = ["apps", "packages"];

function sourceFiles(path: string): string[] {
  const absolute = join(repoRoot, path);
  return readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    if (
      entry.name === "node_modules" ||
      entry.name === ".next" ||
      entry.name.startsWith(".")
    ) {
      return [];
    }

    const child = join(path, entry.name);
    if (entry.isDirectory()) return sourceFiles(child);
    return /\.tsx$/.test(entry.name) ? [child] : [];
  });
}

test("authored DOM elements do not use browser-native title tooltips", () => {
  const violations: string[] = [];

  for (const path of sourceRoots.flatMap(sourceFiles)) {
    const source = readFileSync(join(repoRoot, path), "utf8");
    const file = ts.createSourceFile(
      path,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );

    function visit(node: ts.Node) {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tag = node.tagName.getText(file);
        const rendersDom = /^[a-z]/.test(tag) || tag.startsWith("motion.");
        const hasTitle = node.attributes.properties.some(
          (attribute) =>
            ts.isJsxAttribute(attribute) &&
            attribute.name.getText(file) === "title",
        );

        if (rendersDom && hasTitle) {
          const position = file.getLineAndCharacterOfPosition(node.getStart(file));
          violations.push(`${relative(repoRoot, path)}:${position.line + 1}`);
        }
      }

      ts.forEachChild(node, visit);
    }

    visit(file);
  }

  assert.deepEqual(violations, []);
});
