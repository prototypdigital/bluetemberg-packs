#!/usr/bin/env node
// @ts-check
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import frontmatter from './frontmatter.cjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const PACKAGES_DIR = join(REPO_ROOT, 'packages');
const CATALOG_PATH = join(REPO_ROOT, 'catalog.json');
const WIKI_CATALOG_PATH = join(REPO_ROOT, 'docs', 'wiki', 'Catalog.md');
// Hand-edited stack → package map, copied into the catalog verbatim as
// `stackPackages`. The engine (0.19+) merges it over its built-in table to know
// which package carries each stack's version. See docs/wiki/Contributing.md.
const STACK_PACKAGES_PATH = join(REPO_ROOT, 'stack-packages.json');

const PREVIEW_MAX_CHARS = 300;

/** Extract the `description` field from YAML frontmatter, unquoted. */
function parseFrontmatterDescription(content) {
  return frontmatter.readScalar(content, 'description');
}

/** Strip YAML frontmatter and return the first non-empty paragraph of body text. */
function extractPreview(content) {
  const withoutFrontmatter = content.replace(/^---[\s\S]*?---\n/, '');
  const lines = withoutFrontmatter.split('\n');
  const body = lines
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'))
    .join(' ');
  return body.slice(0, PREVIEW_MAX_CHARS).trim();
}

/** Infer the kind from the package name. */
function inferKind(name) {
  if (name.includes('-rules-')) return 'rules';
  if (name.includes('-agents-')) return 'agents';
  if (name.includes('-skills-')) return 'skills';
  if (name.includes('-guardrails-')) return 'guardrails';
  return 'rules';
}

/** List all content files under llm/<kind>/. Returns [{ name, path, description }] */
function listContentFiles(pkgDir, kind) {
  const contentDir = join(pkgDir, 'llm', kind);
  if (!existsSync(contentDir)) return [];

  const entries = readdirSync(contentDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.md')) {
      const filePath = join(contentDir, entry.name);
      const content = readFileSync(filePath, 'utf8');
      files.push({
        name: entry.name.replace(/\.md$/, ''),
        path: filePath,
        description: parseFrontmatterDescription(content),
      });
    } else if (entry.isDirectory()) {
      // skills are nested: llm/skills/<name>/SKILL.md
      const skillFile = join(contentDir, entry.name, 'SKILL.md');
      if (existsSync(skillFile)) {
        const content = readFileSync(skillFile, 'utf8');
        files.push({
          name: entry.name,
          path: skillFile,
          description: parseFrontmatterDescription(content),
        });
      }
    }
  }

  // Sort by name so catalog.json item order and the preview (contentFiles[0])
  // are deterministic — readdirSync order is filesystem-dependent.
  return files.sort((a, b) => a.name.localeCompare(b.name));
}

/** Returns true if the package name resolves on the npm registry. */
async function isPublished(name) {
  try {
    const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return false;
    const data = await res.json();
    return !!(data['dist-tags'] && data['dist-tags'].latest);
  } catch {
    return false;
  }
}

function buildEntry(pkgDir) {
  try {
    const pkgJsonPath = join(pkgDir, 'package.json');
    if (!existsSync(pkgJsonPath)) return null;

    const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
    const kind = inferKind(pkg.name);
    const contentFiles = listContentFiles(pkgDir, kind);

    const preview = contentFiles.length > 0
      ? extractPreview(readFileSync(contentFiles[0].path, 'utf8'))
      : '';

    const meta = pkg.bluetemberg ?? {};

    return {
      name: pkg.name,
      version: pkg.version,
      description: pkg.description ?? '',
      profiles: meta.profiles ?? [],
      stacks: Array.isArray(meta.stacks) ? meta.stacks.filter((s) => typeof s === 'string') : [],
      // Platforms the pack works on (e.g. ["claude"] for a pack that needs Claude Code
      // hooks). Empty = every platform. The engine (0.19+) skips the pack's output for
      // other platforms and doesn't preselect it in `init` when none is targeted.
      platforms: Array.isArray(meta.platforms) ? meta.platforms.filter((p) => typeof p === 'string') : [],
      universal: meta.universal ?? false,
      kind,
      // Rich items { name, description } — consumed by both the wiki table and
      // the browser. Descriptions come from each file's frontmatter.
      [kind]: contentFiles.map((f) => ({ name: f.name, description: f.description })),
      preview,
    };
  } catch (err) {
    console.error(`Error building entry for ${pkgDir}:`, err.message);
    return null;
  }
}

const KIND_ORDER = ['rules', 'agents', 'skills', 'guardrails'];

const KIND_META = {
  rules: {
    heading: 'Rules',
    intro: 'Always-on instructions loaded into every AI session automatically.',
    itemCol: 'Rule',
    descCol: 'Enforces',
  },
  agents: {
    heading: 'Agents',
    intro: 'Specialist agents invoked for focused, domain-specific tasks.',
    itemCol: 'Agent',
    descCol: 'Description',
  },
  skills: {
    heading: 'Skills',
    intro: 'On-demand workflows triggered by slash commands.',
    itemCol: 'Skill',
    descCol: 'Description',
  },
  guardrails: {
    heading: 'Guardrails',
    intro: 'Hook-based constraints that fire automatically during AI operations.',
    itemCol: 'Guardrail',
    descCol: 'Description',
  },
};

function generateWikiCatalog(packs) {
  const byKind = /** @type {Record<string, typeof packs>} */ ({});
  for (const kind of KIND_ORDER) byKind[kind] = [];
  for (const pack of packs) {
    if (byKind[pack.kind]) byKind[pack.kind].push(pack);
  }

  const lines = [
    '# Catalog',
    '',
    'Every official pack — rules, agents, skills, and guardrails — and the items it contains.',
    'Item names match filenames in each pack\'s `llm/<kind>/` directory and are used for local overrides.',
    '',
  ];

  for (const kind of KIND_ORDER) {
    const packsOfKind = byKind[kind];
    if (packsOfKind.length === 0) continue;

    const meta = KIND_META[kind];
    lines.push(`## ${meta.heading}`, '');
    lines.push(meta.intro, '');

    for (const pack of packsOfKind) {
      lines.push(`### ${pack.name}`, '');
      lines.push(pack.description, '');
      if (pack.platforms?.length) {
        lines.push(`**Platforms:** ${pack.platforms.map((p) => `\`${p}\``).join(', ')} only. Sync skips this pack for other platforms.`, '');
      }

      const items = pack[pack.kind] ?? [];
      if (items.length > 0) {
        lines.push(`| ${meta.itemCol} | ${meta.descCol} |`);
        lines.push(`| ${'---'.padEnd(meta.itemCol.length, '-')} | ${'---'.padEnd(meta.descCol.length, '-')} |`);
        for (const item of items) {
          const desc = item.description || '';
          lines.push(`| \`${item.name}\` | ${desc} |`);
        }
        lines.push('');
      }
    }
  }

  lines.push(
    '## Overriding a rule',
    '',
    'Every rule is a self-contained Markdown file. To change one for your project without forking the pack,',
    'create a file with the **same name** in your local `llm/rules/` — it takes priority over the pack version',
    'during sync. See [Usage](Usage#overrides) for the full priority order.',
    '',
  );

  return lines.join('\n');
}

async function main() {
  const pkgDirs = readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => join(PACKAGES_DIR, e.name))
    .sort();

  const candidates = pkgDirs.map(buildEntry).filter(Boolean);

  // Filter to only packs that are published on npm
  const publishResults = await Promise.all(
    candidates.map((p) => isPublished(p.name)),
  );

  const packs = candidates.filter((_, i) => {
    if (publishResults[i]) return true;
    console.warn(`  skipped (not on npm): ${candidates[i].name}`);
    return false;
  });

  let stackPackages;
  try {
    stackPackages = JSON.parse(readFileSync(STACK_PACKAGES_PATH, 'utf8'));
  } catch (err) {
    console.error(`Failed to read stack-packages.json:`, err.message);
    process.exit(1);
  }

  const catalog = {
    generated: new Date().toISOString(),
    stackPackages,
    packs,
  };

  try {
    writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2) + '\n');
    console.log(`catalog.json written — ${packs.length} pack(s)`);
  } catch (err) {
    console.error(`Failed to write catalog.json:`, err.message);
    process.exit(1);
  }

  // Write docs/wiki/Catalog.md
  try {
    writeFileSync(WIKI_CATALOG_PATH, generateWikiCatalog(packs));
    console.log('docs/wiki/Catalog.md written');
  } catch (err) {
    console.error(`Failed to write Catalog.md:`, err.message);
    process.exit(1);
  }
}

main();
