#!/usr/bin/env node
// @ts-check
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const PACKAGES_DIR = join(REPO_ROOT, 'packages');
const CATALOG_PATH = join(REPO_ROOT, 'catalog.json');

const PREVIEW_MAX_CHARS = 300;

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

/** List all content files under llm/<kind>/. Returns [{ name, path }] */
function listContentFiles(pkgDir, kind) {
  const contentDir = join(pkgDir, 'llm', kind);
  if (!existsSync(contentDir)) return [];

  const entries = readdirSync(contentDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push({
        name: entry.name.replace(/\.md$/, ''),
        path: join(contentDir, entry.name),
      });
    } else if (entry.isDirectory()) {
      // skills are nested: llm/skills/<name>/SKILL.md
      const skillFile = join(contentDir, entry.name, 'SKILL.md');
      if (existsSync(skillFile)) {
        files.push({ name: entry.name, path: skillFile });
      }
    }
  }

  return files;
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
      universal: meta.universal ?? false,
      kind,
      [kind]: contentFiles.map((f) => f.name),
      preview,
    };
  } catch (err) {
    console.error(`Error building entry for ${pkgDir}:`, err.message);
    return null;
  }
}

function main() {
  const pkgDirs = readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => join(PACKAGES_DIR, e.name))
    .sort();

  const packs = pkgDirs
    .map(buildEntry)
    .filter(Boolean);

  const catalog = {
    generated: new Date().toISOString(),
    packs,
  };

  try {
    writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2) + '\n');
    console.log(`catalog.json written — ${packs.length} pack(s)`);
  } catch (err) {
    console.error(`Failed to write catalog.json:`, err.message);
    process.exit(1);
  }
}

main();
