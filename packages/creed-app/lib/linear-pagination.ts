export type LinearPage<T> = {
  nodes: T[];
  pageInfo: {
    hasNextPage: boolean;
    endCursor: string | null;
  };
};

export async function collectLinearConnection<T>(
  loadPage: (after: string | undefined) => Promise<LinearPage<T>>,
): Promise<T[]> {
  const nodes: T[] = [];
  const seenCursors = new Set<string>();
  let after: string | undefined;

  while (true) {
    const page = await loadPage(after);
    nodes.push(...page.nodes);

    if (!page.pageInfo.hasNextPage) return nodes;

    const nextCursor = page.pageInfo.endCursor?.trim();
    if (!nextCursor || seenCursors.has(nextCursor)) {
      throw new Error("linear_invalid_page_info");
    }
    seenCursors.add(nextCursor);
    after = nextCursor;
  }
}
