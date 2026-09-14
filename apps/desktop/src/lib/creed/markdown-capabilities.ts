export function needsSourceEditor(markdown: string): boolean {
  const withoutFences = markdown.replace(
    /^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1\s*$/gm,
    "",
  );
  return /!\[|\[\[|<!--|<\/?[a-z][^>]*>|^\s*\[[^\]]+\]:|^\s*(?:\$\$|:::)/im.test(
    withoutFences,
  );
}

export function sourceMayRenderDifferently(markdown: string): boolean {
  return needsSourceEditor(markdown.replace(/^\s*<!-- creed:accent=[\w-]+ -->\s*$/gm, ""));
}
