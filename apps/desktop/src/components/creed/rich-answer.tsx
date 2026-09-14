// Renders Ask answers with the same components as the editor. Each part shares
// one ordered reveal so a table, callout, or chip cannot leap ahead of prose.

import { Fragment, type CSSProperties, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { SectionReferenceChip } from "@/components/creed/section-reference-chip";
import { CreedCodeBlock } from "@/components/creed/code-block";
import { accentColorMap } from "@/lib/creed/creed-data";
import type { PanelSectionReference } from "@/lib/panel/actions";
import {
  parseAnswerBlocks,
  type ListGroup,
  type ListKind,
  type ListNode,
} from "@/lib/panel/rich-answer-blocks";
import {
  parseInlineMarkdown,
  type InlineNode,
} from "@/lib/panel/rich-answer-inline";
import { findSectionReferenceTarget } from "@/lib/creed/section-references";

const EASE = [0.22, 1, 0.36, 1] as const;
const STAGGER = 0.018;
const WORD_DURATION = 0.22;
const MAX_STAGGER_STEPS = 60;

type AnimationState = { word: number } | null;

const WORD_REVEAL = {
  initial: { opacity: 0, y: 2, filter: "blur(2px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
};

function revealWord(word: string, key: string, animation: AnimationState) {
  if (!animation) return word;
  const index = animation.word++;
  return (
    <motion.span
      key={key}
      className="inline-block"
      initial={WORD_REVEAL.initial}
      animate={WORD_REVEAL.animate}
      transition={{
        duration: WORD_DURATION,
        delay: Math.min(index, MAX_STAGGER_STEPS) * STAGGER,
        ease: EASE,
      }}
    >
      {word}
    </motion.span>
  );
}

function nextAnimationStep(animation: AnimationState) {
  return animation ? animation.word++ : 0;
}

function revealTransition(index: number) {
  return {
    duration: WORD_DURATION,
    delay: Math.min(index, MAX_STAGGER_STEPS) * STAGGER,
    ease: EASE,
  };
}

function revealNode(node: ReactNode, key: string, animation: AnimationState) {
  if (!animation) return node;
  const start = nextAnimationStep(animation);
  return (
    <motion.span
      key={key}
      className="inline-block"
      initial={WORD_REVEAL.initial}
      animate={WORD_REVEAL.animate}
      transition={revealTransition(start)}
    >
      {node}
    </motion.span>
  );
}

function revealText(text: string, key: string, animation: AnimationState) {
  if (!animation) return text;
  return text.split(/(\s+)/).map((part, index) =>
    /^\s+$/.test(part) ? (
      <Fragment key={`${key}-${index}`}>{part}</Fragment>
    ) : (
      revealWord(part, `${key}-${index}`, animation)
    ),
  );
}

function lookupReference(
  value: string,
  references: ReadonlyMap<string, PanelSectionReference>,
) {
  return (
    references.get(value) ??
    findSectionReferenceTarget(value, [...references.values()])
  );
}

function renderInlineNode(
  node: InlineNode,
  key: string,
  references: ReadonlyMap<string, PanelSectionReference>,
  onSectionClick?: (sectionId: string) => void,
  animation: AnimationState = null,
): ReactNode {
  if (node.type === "text") return revealText(node.text, key, animation);
  if (node.type === "code") {
    return revealNode(
      <code
        key={key}
        className="rounded-[5px] bg-[var(--creed-surface-raised)] px-1 py-0.5 font-mono text-[0.85em]"
      >
        {node.text}
      </code>,
      key,
      animation,
    );
  }
  if (node.type === "section" || node.type === "tag") {
    const reference = lookupReference(
      node.type === "section" ? node.id : node.name,
      references,
    );
    if (reference) {
      return revealNode(
        <SectionReferenceChip
          key={key}
          section={reference}
          onSelect={onSectionClick}
          accent="stack"
        />,
        key,
        animation,
      );
    }
    if (node.type === "tag") {
      return revealNode(
        <span key={key} className="creed-inline-tag">
          {node.name}
        </span>,
        key,
        animation,
      );
    }
    return revealText(`[[section:${node.id}]]`, key, animation);
  }
  const children = node.children.map((child, index) =>
    renderInlineNode(
      child,
      `${key}-${index}`,
      references,
      onSectionClick,
      animation,
    ),
  );
  if (node.type === "link") {
    return (
      <a
        key={key}
        href={node.href}
        target="_blank"
        rel="noreferrer"
        className="font-medium text-[var(--section-accent-bar,var(--creed-accent))]"
      >
        {children}
      </a>
    );
  }
  if (node.type === "strong") {
    return (
      <strong key={key} className="font-semibold">
        {children}
      </strong>
    );
  }
  if (node.type === "mark") {
    return (
      <mark key={key} className="creed-file-mark">
        {children}
      </mark>
    );
  }
  if (node.type === "u") {
    return (
      <u key={key} className="creed-file-underline">
        {children}
      </u>
    );
  }
  if (node.type === "s") return <s key={key}>{children}</s>;
  return <em key={key}>{children}</em>;
}

function renderInline(
  text: string,
  references: ReadonlyMap<string, PanelSectionReference>,
  onSectionClick?: (sectionId: string) => void,
  animation: AnimationState = null,
): ReactNode[] {
  return parseInlineMarkdown(text).map((node, index) =>
    renderInlineNode(node, `i${index}`, references, onSectionClick, animation),
  );
}

const ASK_BLUE_STYLE = {
  "--section-accent": accentColorMap.stack,
  "--section-accent-tint": "rgba(37, 99, 235, 0.11)",
  "--section-accent-border": "rgba(37, 99, 235, 0.12)",
  "--section-accent-bar": "rgba(37, 99, 235, 0.82)",
} as CSSProperties;

const LIST_CLASS: Record<ListKind, string> = {
  bullets: "creed-list creed-list-bullet",
  numbered: "creed-list creed-list-ordered",
  tasks: "creed-list creed-list-task",
};

function AnswerListItem({
  item,
  references,
  onSectionClick,
  animation,
}: {
  item: ListNode;
  references: ReadonlyMap<string, PanelSectionReference>;
  onSectionClick?: (sectionId: string) => void;
  animation: AnimationState;
}) {
  const start = animation?.word ?? 0;
  const content = (
    <>
      <p>{renderInline(item.text, references, onSectionClick, animation)}</p>
      {item.children.length
        ? renderListGroups(item.children, references, onSectionClick, animation)
        : null}
    </>
  );
  if (!animation) {
    return (
      <li
        className="creed-list-item"
        data-checked={
          item.checked === undefined ? undefined : String(item.checked)
        }
      >
        {content}
      </li>
    );
  }
  return (
    <motion.li
      className="creed-list-item"
      data-checked={
        item.checked === undefined ? undefined : String(item.checked)
      }
      initial={WORD_REVEAL.initial}
      animate={WORD_REVEAL.animate}
      transition={{
        ...revealTransition(start),
      }}
    >
      {content}
    </motion.li>
  );
}

function AnswerTableRow({
  children,
  animation,
}: {
  children: ReactNode;
  animation: AnimationState;
}) {
  if (!animation) return <tr>{children}</tr>;
  const start = nextAnimationStep(animation);
  return (
    <motion.tr
      initial={WORD_REVEAL.initial}
      animate={WORD_REVEAL.animate}
      transition={revealTransition(start)}
    >
      {children}
    </motion.tr>
  );
}

function renderListGroups(
  groups: ListGroup[],
  references: ReadonlyMap<string, PanelSectionReference>,
  onSectionClick?: (sectionId: string) => void,
  animation: AnimationState = null,
): ReactNode {
  return groups.map((group, groupIndex) => {
    const Tag = group.kind === "numbered" ? "ol" : "ul";
    return (
      <Tag
        key={`${group.kind}-${groupIndex}`}
        className={`${LIST_CLASS[group.kind]} my-1 space-y-0.5`}
      >
        {group.items.map((item, itemIndex) => (
          <AnswerListItem
            key={itemIndex}
            item={item}
            references={references}
            onSectionClick={onSectionClick}
            animation={animation}
          />
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
  footer = null,
}: {
  markdown: string;
  animate?: boolean;
  className?: string;
  references?: PanelSectionReference[];
  onSectionClick?: (sectionId: string) => void;
  footer?: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const blocks = parseAnswerBlocks(markdown);
  const referencesById = new Map(
    references.map((reference) => [reference.id, reference]),
  );
  const animation = animate && !reduceMotion ? { word: 0 } : null;

  const content = blocks.map((block, index) => {
    if (block.kind === "heading") {
      const Tag = block.level <= 2 ? "h2" : block.level === 3 ? "h3" : "h4";
      return (
        <Tag key={index}>
          {renderInline(block.text, referencesById, onSectionClick, animation)}
        </Tag>
      );
    }
    if (block.kind === "list") {
      return (
        <div key={index} className="first:mt-0">
          {renderListGroups(
            block.groups,
            referencesById,
            onSectionClick,
            animation,
          )}
        </div>
      );
    }
    if (block.kind === "callout") {
      const start = nextAnimationStep(animation);
      return (
        <motion.blockquote
          key={index}
          className="creed-callout my-2"
          initial={animation ? WORD_REVEAL.initial : false}
          animate={animation ? WORD_REVEAL.animate : undefined}
          transition={revealTransition(start)}
        >
          <p>{renderInline(block.text, referencesById, onSectionClick, animation)}</p>
        </motion.blockquote>
      );
    }
    if (block.kind === "code") {
      const start = nextAnimationStep(animation);
      return (
        <motion.div
          key={index}
          initial={animation ? WORD_REVEAL.initial : false}
          animate={animation ? WORD_REVEAL.animate : undefined}
          transition={revealTransition(start)}
        >
          <CreedCodeBlock code={block.text} language={block.language} />
        </motion.div>
      );
    }
    if (block.kind === "divider") {
      const start = nextAnimationStep(animation);
      return (
        <motion.hr
          key={index}
          className="creed-hr"
          initial={animation ? WORD_REVEAL.initial : false}
          animate={animation ? WORD_REVEAL.animate : undefined}
          transition={revealTransition(start)}
        />
      );
    }
    if (block.kind === "table") {
      const start = nextAnimationStep(animation);
      return (
        <motion.div
          key={index}
          className="my-2 overflow-x-auto"
          initial={animation ? WORD_REVEAL.initial : false}
          animate={animation ? WORD_REVEAL.animate : undefined}
          transition={revealTransition(start)}
        >
          <table className="creed-table">
            <tbody>
              {block.headerless ? null : (
                <AnswerTableRow animation={animation}>
                  {block.headers.map((cell, cellIndex) => (
                    <th key={cellIndex}>
                      <p>
                        {renderInline(cell, referencesById, onSectionClick, animation)}
                      </p>
                    </th>
                  ))}
                </AnswerTableRow>
              )}
              {block.rows.map((row, rowIndex) => (
                <AnswerTableRow key={rowIndex} animation={animation}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>
                      <p>
                        {renderInline(cell, referencesById, onSectionClick, animation)}
                      </p>
                    </td>
                  ))}
                </AnswerTableRow>
              ))}
            </tbody>
          </table>
        </motion.div>
      );
    }
    return (
      <p key={index} className="mt-1.5 first:mt-0">
        {renderInline(block.text, referencesById, onSectionClick, animation)}
      </p>
    );
  });

  const body = (
    <div
      className={`creed-ask-prose break-words ${className ?? ""}`}
      style={ASK_BLUE_STYLE}
    >
      {content}
      {footer}
    </div>
  );

  return body;
}
