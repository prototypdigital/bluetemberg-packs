#!/usr/bin/env node
// @ts-check
import { readdirSync, readFileSync, writeFileSync, existsSync, realpathSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import frontmatter from './frontmatter.cjs';
import registry from './npm-registry.cjs';

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

/**
 * Build catalog.json and docs/wiki/Catalog.md. Returns the process exit code.
 * Writes nothing unless every pack's npm status was resolved: a pack is left
 * out only when the registry says it isn't published (404 or fully
 * unpublished); any other failure aborts so a bad network can't drop a pack.
 * Options exist for the self-test in .github/scripts/validate-packs.cjs.
 */
export async function main({
  fetchImpl = globalThis.fetch,
  sleep,
  catalogPath = CATALOG_PATH,
  wikiCatalogPath = WIKI_CATALOG_PATH,
  now = () => new Date(),
} = {}) {
  const pkgDirs = readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => join(PACKAGES_DIR, e.name))
    .sort();

  const candidates = pkgDirs.map(buildEntry).filter(Boolean);

  // Keep only packs published on npm. Only a definitive "not published" answer
  // drops a pack; anything else throws and nothing is written.
  let publishStatus;
  try {
    publishStatus = await registry.checkAllPublished(candidates.map((p) => p.name), { fetchImpl, sleep });
  } catch (err) {
    console.error(`${err.message}\nNot writing catalog.json or Catalog.md. Re-run once the registry is reachable.`);
    return 1;
  }

  const packs = candidates.filter((p) => {
    const status = publishStatus.get(p.name);
    if (status?.published) return true;
    console.warn(`  excluded ${p.name}: not published on npm (${status?.reason ?? 'no status'})`);
    return false;
  });

  let stackPackages;
  try {
    stackPackages = JSON.parse(readFileSync(STACK_PACKAGES_PATH, 'utf8'));
  } catch (err) {
    console.error(`Failed to read stack-packages.json:`, err.message);
    return 1;
  }

  const catalog = {
    generated: now().toISOString(),
    stackPackages,
    packs,
  };

  try {
    writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
    console.log(`catalog.json written — ${packs.length} pack(s)`);
  } catch (err) {
    console.error(`Failed to write catalog.json:`, err.message);
    return 1;
  }

  // Write docs/wiki/Catalog.md
  try {
    writeFileSync(wikiCatalogPath, generateWikiCatalog(packs));
    console.log('docs/wiki/Catalog.md written');
  } catch (err) {
    console.error(`Failed to write Catalog.md:`, err.message);
    return 1;
  }
  return 0;
}

// Run only when executed directly, not when imported by the validator's self-test.
// Node realpaths the main module's URL, so realpath argv[1] too: otherwise a run
// through a symlinked path would skip main() and exit 0 having written nothing.
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(resolve(process.argv[1]))).href) {
  process.exitCode = await main();
}
