import { sectionBodyMarkdown, type CreedSection } from "@creed/core/creed-data";

// Agent-facing get_section payload. `contentMarkdown` is the body agents send
// back on update/append, not the file-level `## Name` wrapper.
export function mcpSectionReadResult(section: CreedSection) {
  return {
    id: section.id,
    name: section.name,
    kind: section.kind,
    accent: section.accent,
    agentWritable: section.agentWritable,
    permission: section.agentPermission,
    contentMarkdown: sectionBodyMarkdown(section),
    contentHtml: section.content,
    lastEditedBy: section.lastEditedBy,
    lastEditedType: section.lastEditedType,
    lastEditedLabel: section.lastEditedLabel,
  };
}
