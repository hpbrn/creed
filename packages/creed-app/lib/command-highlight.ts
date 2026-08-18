// hljs bash leaves `npm run setup` almost uncolored. This tokenizer marks
// binaries, scripts, flags, paths, and leftover arguments so command chips
// can use the same design-system hues as editor code.

export type CommandToken = {
  type: string;
  text: string;
};

const COMMAND = "hljs-built_in";
const FLAG = "hljs-attribute";
const STRING = "hljs-string";
const VARIABLE = "hljs-variable";
const PUNCT = "hljs-comment";

const BINARIES = new Set([
  "npm",
  "npx",
  "git",
  "curl",
  "node",
  "cd",
  "cp",
  "chmod",
  "copy",
  "icacls",
  "gh",
  "claude",
  "codex",
  "opencode",
  "supabase",
]);

const SUBCOMMANDS = new Set([
  "run",
  "install",
  "start",
  "dev",
  "setup",
  "doctor",
  "bench",
  "clone",
  "pull",
  "add",
  "login",
  "link",
  "sync",
  "auth",
  "mcp",
  "exec",
  "repo",
]);

const VARIABLE_PATTERN = /\$[A-Za-z_][A-Za-z0-9_]*|\$\{[^}]+\}|%USERNAME%/g;

function isPath(value: string) {
  return (
    value.startsWith(".") ||
    value.startsWith("/") ||
    value.includes("/") ||
    value.includes("\\") ||
    value.includes(".env") ||
    value.includes(".git") ||
    value.includes(".json") ||
    value.includes(".local") ||
    value.includes(".example")
  );
}

function isUrl(value: string) {
  return /^https?:\/\//.test(value);
}

function push(tokens: CommandToken[], type: string, text: string) {
  if (!text) return;
  const last = tokens[tokens.length - 1];
  if (last && last.type === type) {
    last.text += text;
    return;
  }
  tokens.push({ type, text });
}

function highlightJson(source: string): CommandToken[] {
  const tokens: CommandToken[] = [];
  const pattern =
    /("(?:\\.|[^"\\])*")(\s*:)?|(-?\d+(?:\.\d+)?)|(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|([{}\[\]:,]|true|false|null)|(\s+)/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source))) {
    if (match.index > cursor) {
      push(tokens, "", source.slice(cursor, match.index));
    }
    const [all, quoted, colon, number, comment, punct] = match;
    if (quoted) {
      push(tokens, colon ? FLAG : STRING, quoted);
      if (colon) push(tokens, PUNCT, colon);
    } else if (number) {
      push(tokens, COMMAND, number);
    } else if (comment) {
      push(tokens, PUNCT, comment);
    } else if (punct) {
      push(tokens, PUNCT, punct);
    } else {
      push(tokens, "", all);
    }
    cursor = match.index + all.length;
  }
  if (cursor < source.length) push(tokens, "", source.slice(cursor));
  return tokens;
}

function highlightQuoted(quoted: string, tokens: CommandToken[]) {
  let cursor = 0;
  for (const match of quoted.matchAll(VARIABLE_PATTERN)) {
    const index = match.index ?? 0;
    if (index > cursor) push(tokens, STRING, quoted.slice(cursor, index));
    push(tokens, VARIABLE, match[0]);
    cursor = index + match[0].length;
  }
  if (cursor < quoted.length) push(tokens, STRING, quoted.slice(cursor));
}

function highlightShellLine(line: string): CommandToken[] {
  const tokens: CommandToken[] = [];
  const pattern =
    /(\s+)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(\$[A-Za-z_][A-Za-z0-9_]*|\$\{[^}]+\}|%USERNAME%)|(--?[A-Za-z][\w-]*)|(\\|&&|\|\||;|\||--(?=\s|$))|(\S+)/g;
  let expectCommand = true;
  let afterNpm = false;
  let afterNpmRun = false;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(line))) {
    const [all, space, quoted, variable, flag, punct, word] = match;
    if (space) {
      push(tokens, "", space);
      continue;
    }
    if (quoted) {
      highlightQuoted(quoted, tokens);
      afterNpm = false;
      afterNpmRun = false;
      expectCommand = false;
      continue;
    }
    if (variable) {
      push(tokens, VARIABLE, variable);
      expectCommand = false;
      continue;
    }
    if (flag) {
      push(tokens, FLAG, flag);
      afterNpm = false;
      afterNpmRun = false;
      expectCommand = false;
      continue;
    }
    if (punct) {
      push(tokens, PUNCT, punct);
      expectCommand = punct !== "\\";
      afterNpm = false;
      afterNpmRun = false;
      continue;
    }
    if (!word) {
      push(tokens, "", all);
      continue;
    }
    if (isUrl(word) || isPath(word)) {
      push(tokens, STRING, word);
      expectCommand = false;
      afterNpm = false;
      afterNpmRun = false;
      continue;
    }
    const lower = word.toLowerCase();
    if (expectCommand || BINARIES.has(lower)) {
      push(tokens, COMMAND, word);
      afterNpm = lower === "npm" || lower === "npx";
      afterNpmRun = false;
      expectCommand = false;
      continue;
    }
    if (afterNpm && (lower === "run" || SUBCOMMANDS.has(lower))) {
      push(tokens, "", word);
      afterNpmRun = lower === "run";
      afterNpm = false;
      continue;
    }
    if (afterNpmRun) {
      push(tokens, STRING, word);
      afterNpmRun = false;
      continue;
    }
    if (SUBCOMMANDS.has(lower)) {
      push(tokens, "", word);
      continue;
    }
    if (/^-?\d+(?:\.\d+)?$/.test(word)) {
      push(tokens, COMMAND, word);
      continue;
    }
    push(tokens, "", word);
  }
  return tokens;
}

export function highlightCommand(source: string): CommandToken[] {
  const trimmed = source.trimStart();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return highlightJson(source);
  }
  const tokens: CommandToken[] = [];
  const lines = source.split("\n");
  lines.forEach((line, index) => {
    tokens.push(...highlightShellLine(line));
    if (index < lines.length - 1) push(tokens, "", "\n");
  });
  return tokens;
}
