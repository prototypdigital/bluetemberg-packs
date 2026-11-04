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
const ENTRY_RE = /^([A-Za-z_][A-Za-z0-9_-]*):(?:[ \t]+(.*))?$/;
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

/** The string a YAML parser reads from a single-line scalar. Quotes are removed and unescaped. */
function scalarValue(raw) {
  const double = raw.match(DOUBLE_QUOTED_RE);
  if (double) {
    try {
      return JSON.parse(`"${double[1]}"`);
    } catch {
      return double[1];
    }
  }
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

const RESERVED_START = {
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
  if (first === '"') return DOUBLE_QUOTED_RE.test(raw) ? null : 'double-quoted value is not closed, or has text after the closing quote';
  if (first === "'") return SINGLE_QUOTED_RE.test(raw) ? null : "single-quoted value is not closed, or has text after the closing quote (escape ' as '')";
  if (first === '[' || first === '{' || first === '|' || first === '>') return null;
  if (RESERVED_START[first]) return RESERVED_START[first];
  if (/^[-?:](\s|$)/.test(raw)) return `starts with "${first} ", which YAML reads as structure`;
  if (/:(\s|$)/.test(raw)) return 'contains ": ", which YAML reads as a nested mapping';
  if (/\s#/.test(raw)) return 'contains " #", so YAML drops the rest as a comment';
  return null;
}

/** One message per top-level entry whose value a strict YAML parser would reject or misread. */
function frontmatterErrors(content) {
  const block = frontmatterBlock(content);
  if (block === null) return [];
  const errors = [];
  for (const entry of topLevelEntries(block)) {
    const reason = scalarError(entry.raw);
    if (reason) errors.push(`line ${entry.line}: '${entry.key}' ${reason}; quote the value`);
  }
  return errors;
}

module.exports = { frontmatterBlock, topLevelEntries, scalarValue, scalarError, readScalar, frontmatterErrors };
