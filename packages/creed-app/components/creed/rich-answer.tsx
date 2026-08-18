"use client";

// Renders an Ask answer's markdown as the same Creed editor components the
// file uses: headings, lists, checklists, tables, callouts, code, dividers,
// and inline marks. With `animate`, each word (and each list item, so the
// squircle marker joins the cascade) reveals in a fast waterfall.

import { Fragment, type CSSProperties, type ReactNode } from "react";
import { motion } from "motion/react";
import { SectionReferenceChip } from "@/components/creed/section-reference-chip";
import { CreedCodeBlock } from "@/components/creed/code-block";
import type { PanelSectionReference } from "@/lib/panel/actions";
import {
  parseAnswerBlocks,
  type ListGroup,
  type ListKind,
} from "@/lib/panel/rich-answer-blocks";

const EASE = [0.22, 1, 0.36, 1] as const;
const STAGGER = 0.018; // seconds between words - fast.
const WORD_DURATION = 0.22;
// Cap the cascade so a long answer's tail doesn't reveal seconds late; past
// this many words they all ride in on the final wave together.
const MAX_STAGGER_STEPS = 60;

const INLINE =
  /(\[\[section:[^\]]+\]\])|(`[^`]+`)|(\[[^\]]+\]\([^)]+\))|(\*\*[^*]+\*\*)|(==[^=]+==)|(__[^_]+__)|(~~[^~]+~~)|(\*[^*]+\*)|(_[^_]+_)/g;

type Anim = { counter: { n: number } } | null;

const REVEAL = {
  initial: { opacity: 0, y: 2, filter: "blur(2px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
};

function revealTransition(index: number) {
  return {
    duration: WORD_DURATION,
    delay: Math.min(index, MAX_STAGGER_STEPS) * STAGGER,
    ease: EASE,
  };
}

function reveal(node: ReactNode, anim: Anim, key: string | number): ReactNode {
  if (!anim) return node;
  const index = anim.counter.n++;
  return (
    <motion.span
      key={key}
      className="inline-block"
      initial={REVEAL.initial}
      animate={REVEAL.animate}
      transition={revealTransition(index)}
    >
      {node}
    </motion.span>
  );
}

function safeExternalHref(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" || url.protocol === "mailto:"
      ? value
      : null;
  } catch {
    return null;
  }
}

function inlineElement(
  token: string,
  key: number,
  references: ReadonlyMap<string, PanelSectionReference>,
  onSectionClick?: (sectionId: string) => void,
): ReactNode {
  if (token.startsWith("[[section:")) {
    const id = token.slice(10, -2);
    const reference = references.get(id);
    if (!reference) return <Fragment key={key}>{token}</Fragment>;
    return (
      <SectionReferenceChip
        key={key}
        section={reference}
        onSelect={onSectionClick}
      />
    );
  }
  if (token.startsWith("`")) {
    return (
      <code key={key} className="rounded-[5px] bg-[var(--creed-surface-raised)] px-1 py-0.5 font-mono text-[0.85em]">
        {token.slice(1, -1)}
      </code>
    );
  }
  if (token.startsWith("[")) {
    const m = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    const href = m ? safeExternalHref(m[2]) : null;
    return m && href ? (
      <a key={key} href={href} target="_blank" rel="noreferrer" className="text-[var(--creed-accent)] underline underline-offset-2">
        {m[1]}
      </a>
    ) : (
      <Fragment key={key}>{token}</Fragment>
    );
  }
  if (token.startsWith("**")) {
    return <strong key={key} className="font-semibold">{token.slice(2, -2)}</strong>;
  }
  if (token.startsWith("==")) {
    return <mark key={key}>{token.slice(2, -2)}</mark>;
  }
  if (token.startsWith("__")) {
    return <u key={key}>{token.slice(2, -2)}</u>;
  }
  if (token.startsWith("~~")) {
    return <s key={key}>{token.slice(2, -2)}</s>;
  }
  return <em key={key}>{token.slice(1, -1)}</em>;
}

function inlineText(text: string, anim: Anim, keyBase: string): ReactNode {
  if (!anim) return <Fragment key={keyBase}>{text}</Fragment>;
  return text
    .split(/(\s+)/)
    .filter(Boolean)
    .map((part, i) =>
      /^\s+$/.test(part) ? <Fragment key={`${keyBase}-${i}`}>{part}</Fragment> : reveal(part, anim, `${keyBase}-${i}`),
    );
}

function renderInline(
  text: string,
  anim: Anim,
  references: ReadonlyMap<string, PanelSectionReference>,
  onSectionClick?: (sectionId: string) => void,
): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const match of text.matchAll(INLINE)) {
    const token = match[0];
    const start = match.index ?? 0;
    if (start > last) nodes.push(inlineText(text.slice(last, start), anim, `t${key++}`));
    const el = inlineElement(token, key++, references, onSectionClick);
    nodes.push(anim ? reveal(el, anim, `e${key}`) : el);
    last = start + token.length;
  }
  if (last < text.length) nodes.push(inlineText(text.slice(last), anim, `t${key++}`));
  return nodes;
}

const LIST_CLASS: Record<ListKind, string> = {
  bullets: "creed-list creed-list-bullet",
  numbered: "creed-list creed-list-ordered",
  tasks: "creed-list creed-list-task",
};

const LIST_STYLE = { "--section-accent-bar": "#2563EB" } as CSSProperties;

function AnswerListItem({
  text,
  checked,
  children,
  anim,
  references,
  onSectionClick,
}: {
  text: string;
  checked?: boolean;
  children?: ReactNode;
  anim: Anim;
  references: ReadonlyMap<string, PanelSectionReference>;
  onSectionClick?: (sectionId: string) => void;
}) {
  // Animate the li so the ::before marker (squircle, number, or check)
  // enters with the first word instead of popping in ahead of the cascade.
  const start = anim?.counter.n ?? 0;
  const body = (
    <>
      <p>{renderInline(text, anim, references, onSectionClick)}</p>
      {children}
    </>
  );
  if (!anim) {
    return (
      <li
        className="creed-list-item"
        data-checked={checked === undefined ? undefined : String(checked)}
      >
        {body}
      </li>
    );
  }
  return (
    <motion.li
      className="creed-list-item"
      data-checked={checked === undefined ? undefined : String(checked)}
      initial={REVEAL.initial}
      animate={REVEAL.animate}
      transition={revealTransition(start)}
    >
      {body}
    </motion.li>
  );
}

function AnswerTableRow({
  children,
  anim,
}: {
  children: ReactNode;
  anim: Anim;
}) {
  if (!anim) return <tr>{children}</tr>;
  const start = anim.counter.n;
  return (
    <motion.tr
      initial={REVEAL.initial}
      animate={REVEAL.animate}
      transition={revealTransition(start)}
    >
      {children}
    </motion.tr>
  );
}

function renderListGroups(
  groups: ListGroup[],
  anim: Anim,
  references: ReadonlyMap<string, PanelSectionReference>,
  onSectionClick?: (sectionId: string) => void,
): ReactNode {
  return groups.map((group, groupIndex) => {
    const Tag = group.kind === "numbered" ? "ol" : "ul";
    return (
      <Tag
        key={`${group.kind}-${groupIndex}`}
        className={`${LIST_CLASS[group.kind]} my-1 space-y-0.5`}
        style={LIST_STYLE}
      >
        {group.items.map((item, itemIndex) => (
          <AnswerListItem
            key={itemIndex}
            text={item.text}
            checked={item.checked}
            anim={anim}
            references={references}
            onSectionClick={onSectionClick}
          >
            {item.children.length
              ? renderListGroups(item.children, anim, references, onSectionClick)
              : null}
          </AnswerListItem>
        ))}
      </Tag>
    );
  });
}

export function RichAnswer({
  markdown,
  animate = false,
  className,
  references = [],
  onSectionClick,
}: {
  markdown: string;
  animate?: boolean;
  className?: string;
  references?: PanelSectionReference[];
  onSectionClick?: (sectionId: string) => void;
}) {
  const blocks = parseAnswerBlocks(markdown);
  const referencesById = new Map(references.map((reference) => [reference.id, reference]));
  const anim: Anim = animate ? { counter: { n: 0 } } : null;
  return (
    <div className={`break-words ${className ?? ""}`}>
      {blocks.map((block, index) => {
        if (block.kind === "heading") {
          const size = block.level <= 1 ? "text-[15px]" : block.level === 2 ? "text-[14px]" : "text-[13px]";
          return (
            <div key={index} className={`mt-2 mb-1 font-semibold text-[var(--creed-text-primary)] first:mt-0 ${size}`}>
              {renderInline(block.text, anim, referencesById, onSectionClick)}
            </div>
          );
        }
        if (block.kind === "list") {
          return (
            <div key={index} className="first:mt-0">
              {renderListGroups(block.groups, anim, referencesById, onSectionClick)}
            </div>
          );
        }
        if (block.kind === "callout") {
          return (
            <blockquote
              key={index}
              className="creed-callout my-2"
              style={{
                "--section-accent-tint": "#2563EB22",
                "--section-accent-bar": "#2563EB",
              } as CSSProperties}
            >
              <p>{renderInline(block.text, anim, referencesById, onSectionClick)}</p>
            </blockquote>
          );
        }
        if (block.kind === "code") {
          return <CreedCodeBlock key={index} code={block.text} language={block.language} />;
        }
        if (block.kind === "divider") {
          return <hr key={index} className="my-3 border-[var(--creed-border)]" />;
        }
        if (block.kind === "table") {
          return (
            <div key={index} className="my-2 overflow-x-auto">
              <table className="creed-table">
                <tbody>
                  {block.headerless ? null : (
                    <AnswerTableRow anim={anim}>
                      {block.headers.map((cell, cellIndex) => (
                        <th key={cellIndex}>
                          <p>{renderInline(cell, anim, referencesById, onSectionClick)}</p>
                        </th>
                      ))}
                    </AnswerTableRow>
                  )}
                  {block.rows.map((row, rowIndex) => (
                    <AnswerTableRow key={rowIndex} anim={anim}>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex}>
                          <p>{renderInline(cell, anim, referencesById, onSectionClick)}</p>
                        </td>
                      ))}
                    </AnswerTableRow>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return (
          <p key={index} className="mt-1.5 first:mt-0">
            {renderInline(block.text, anim, referencesById, onSectionClick)}
          </p>
        );
      })}
    </div>
  );
}
