import { Fragment, type ReactNode } from "react";
import type { Element, RootContent } from "hast";
import { highlightCreedCode } from "@/lib/code-highlighting";

function renderHighlightedNode(node: RootContent, key: string): ReactNode {
  if (node.type === "text") return <Fragment key={key}>{node.value}</Fragment>;
  if (node.type !== "element") return null;
  const element = node as Element;
  const classNames = element.properties.className;
  const className = Array.isArray(classNames)
    ? classNames.join(" ")
    : String(classNames ?? "");
  return (
    <span key={key} className={className || undefined}>
      {element.children.map((child, index) =>
        renderHighlightedNode(child, `${key}-${index}`),
      )}
    </span>
  );
}

export function CreedCodeBlock({
  code,
  language,
}: {
  code: string;
  language?: string;
}) {
  const normalizedLanguage = language?.trim().toLowerCase() ?? "";
  const highlighted = highlightCreedCode(code, normalizedLanguage);
  return (
    <div className="my-2 min-w-0">
      <pre className="creed-code-block max-w-full">
        <code>
          {highlighted
            ? highlighted.children.map((node: RootContent, index: number) =>
                renderHighlightedNode(node, String(index)),
              )
            : code}
        </code>
      </pre>
    </div>
  );
}
