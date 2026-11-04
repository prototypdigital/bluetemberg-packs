'use strict';

// Frontmatter helpers shared by scripts/generate-catalog.js and
// .github/scripts/validate-packs.cjs, so the catalog and its freshness check
// read a value the same way.
//
// These are not a YAML parser. They read top-level `key: value` lines, which is
// all the catalog needs, and they flag the plain (unquoted) scalars a strict
// YAML parser rejects or misreads. Hosts (the engine via gray-matter/js-yaml,
// Agent Plugins hosts, Claude Code) drop a file whose frontmatter does not
// parse, so a description like `Next.js caching: ...` silently hides a skill.

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
const ENTRY_RE = /^([A-Za-z_](?:[A-Za-z0-9_ -]*[A-Za-z0-9_-])?):(?:[ \t]+(.*))?$/;
const DOUBLE_QUOTED_RE = /^"((?:[^"\\]|\\.)*)"\s*(?:#.*)?$/;
const SINGLE_QUOTED_RE = /^'((?:[^']|'')*)'\s*(?:#.*)?$/;

/** The frontmatter block without its `---` fences, or null when there is none. */
function frontmatterBlock(content) {
  const match = content.match(FRONTMATTER_RE);
  return match ? match[1] : null;
}

/** Top-level `key: value` entries, in order. `raw` is the trimmed text after the colon. */
function topLevelEntries(block) {
  const entries = [];
  block.split(/\r?\n/).forEach((text, index) => {
    const match = text.match(ENTRY_RE);
    if (!match) return;
    entries.push({ key: match[1], raw: (match[2] ?? '').trim(), line: index + 2 });
  });
  return entries;
}

// YAML 1.2 double-quoted escapes (spec 5.7). `\x`, `\u` and `\U` take 2, 4 and 8 hex digits.
const SIMPLE_ESCAPES = {
  0: '\0', a: '\x07', b: '\b', t: '\t', '\t': '\t', n: '\n', v: '\v', f: '\f', r: '\r', e: '\x1b',
  ' ': ' ', '"': '"', '/': '/', '\\': '\\', N: '\x85', _: '\xa0', L: '\u2028', P: '\u2029',
};
const HEX_ESCAPE_LENGTH = { x: 2, u: 4, U: 8 };

/** Unescape a double-quoted body, or return null when it has an escape YAML rejects. */
function unescapeDoubleQuoted(body) {
  let out = '';
  for (let i = 0; i < body.length; i++) {
    if (body[i] !== '\\') {
      out += body[i];
      continue;
    }
    const code = body[++i];
    if (code in SIMPLE_ESCAPES) {
      out += SIMPLE_ESCAPES[code];
      continue;
    }
    const length = HEX_ESCAPE_LENGTH[code];
    const hex = length ? body.slice(i + 1, i + 1 + length) : '';
    if (!length || !new RegExp(`^[0-9a-fA-F]{${length}}$`).test(hex)) return null;
    out += String.fromCodePoint(parseInt(hex, 16));
    i += length;
  }
  return out;
}

/** The string a YAML parser reads from a single-line scalar. Quotes are removed and unescaped. */
function scalarValue(raw) {
  const double = raw.match(DOUBLE_QUOTED_RE);
  if (double) return unescapeDoubleQuoted(double[1]) ?? double[1];
  const single = raw.match(SINGLE_QUOTED_RE);
  if (single) return single[1].replace(/''/g, "'");
  return raw;
}

/** The value of top-level `key`, unquoted, or '' when it is absent or empty. */
function readScalar(content, key) {
  const block = frontmatterBlock(content);
  if (block === null) return '';
  const entry = topLevelEntries(block).find((e) => e.key === key);
  return entry ? scalarValue(entry.raw) : '';
}

const BLOCK_SCALAR_RE = /^[|>][0-9+-]*\s*(?:#.*)?$/;

const RESERVED_START = {
  ',': 'starts with ",", a YAML flow indicator',
  ']': 'starts with "]", a YAML flow indicator',
  '}': 'starts with "}", a YAML flow indicator',
  '@': 'starts with "@", a reserved YAML indicator',
  '`': 'starts with "`", a reserved YAML indicator',
  '&': 'starts with "&", which YAML reads as an anchor',
  '*': 'starts with "*", which YAML reads as an alias',
  '!': 'starts with "!", which YAML reads as a tag',
  '%': 'starts with "%", which YAML reads as a directive',
  '#': 'starts with "#", so YAML reads the value as a comment',
};

/**
 * Why a single-line value would not parse as the string it looks like, or null when it is fine.
 * Quoted values must be closed with nothing after them; plain values must avoid the characters
 * YAML gives meaning to. Flow collections (`[...]`, `{...}`) and block scalars (`|`, `>`) are left
 * to the parser that reads them.
 */
function scalarError(raw) {
  if (raw === '') return null;
  const first = raw[0];
  if (first === '"') {
    const double = raw.match(DOUBLE_QUOTED_RE);
    if (!double) return 'double-quoted value is not closed, or has text after the closing quote';
    return unescapeDoubleQuoted(double[1]) === null ? 'double-quoted value has an escape YAML does not know (write a literal \\ as \\\\)' : null;
  }
  if (first === "'") return SINGLE_QUOTED_RE.test(raw) ? null : "single-quoted value is not closed, or has text after the closing quote (escape ' as '')";
  // A flow collection must close at the end of the line, so `[WIP] Does things` is caught.
  if (first === '[') return /\]\s*(?:#.*)?$/.test(raw) ? null : 'starts with "[" but is not a closed [list]';
  if (first === '{') return /\}\s*(?:#.*)?$/.test(raw) ? null : 'starts with "{" but is not a closed {map}';
  // A block scalar header (`|`, `>-`, `|2`) must be alone on its line.
  if (first === '|' || first === '>') return BLOCK_SCALAR_RE.test(raw) ? null : `starts with "${first}", a YAML block scalar indicator`;
  if (RESERVED_START[first]) return RESERVED_START[first];
  if (/^[-?:](\s|$)/.test(raw)) return `starts with "${first} ", which YAML reads as structure`;
  if (/:(\s|$)/.test(raw)) return 'contains ": ", which YAML reads as a nested mapping';
  if (/\s#/.test(raw)) return 'contains " #", so YAML drops the rest as a comment';
  return null;
}

/**
 * One message per problem a strict YAML parser would reject or misread: a top-level value that
 * doesn't parse as the string it looks like, a key given twice, or a line at column 0 that isn't a
 * `key: value` entry (`description:foo`, a stray `- item`). Indented lines (block lists, nested maps)
 * are left alone. Not a full parser: see the module comment.
 */
function frontmatterErrors(content) {
  const block = frontmatterBlock(content);
  if (block === null) return [];
  const errors = [];
  block.split(/\r?\n/).forEach((text, index) => {
    if (text === '' || /^\s+/.test(text) && !/^\t/.test(text)) return;
    if (/^\t/.test(text)) {
      errors.push(`line ${index + 2}: starts with a tab, which YAML does not allow for indentation`);
      return;
    }
    if (text.startsWith('#') || ENTRY_RE.test(text)) return;
    errors.push(`line ${index + 2}: not a \`key: value\` line (a key needs ": " after it)`);
  });
  const seen = new Set();
  for (const entry of topLevelEntries(block)) {
    if (seen.has(entry.key)) errors.push(`line ${entry.line}: '${entry.key}' is given twice`);
    seen.add(entry.key);
  }
  for (const entry of topLevelEntries(block)) {
    const reason = scalarError(entry.raw);
    if (reason) errors.push(`line ${entry.line}: '${entry.key}' ${reason}; quote the value`);
  }
  return errors;
}

module.exports = { frontmatterBlock, topLevelEntries, scalarValue, scalarError, readScalar, frontmatterErrors };
