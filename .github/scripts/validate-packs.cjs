#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
let errors = 0;

function fail(msg) {
  console.error(`  ✗ ${msg}`);
  errors++;
}

function pass(msg) {
  console.log(`  ✓ ${msg}`);
}

// Parses YAML frontmatter — handles both scalar and block/array values.
// Returns { fieldValues, presentKeys } where presentKeys tracks all keys
// that appeared, even those with no inline value (e.g. multi-line arrays).
function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;

  const values = {};
  const keys = new Set();

  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (kv) {
      keys.add(kv[1]);
      const val = kv[2].trim().replace(/^["']|["']$/g, '');
      if (val) values[kv[1]] = val;
    }
  }

  return { values, keys };
}

function findMdFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findMdFiles(full));
    else if (entry.name.endsWith('.md')) results.push(full);
  }
  return results;
}

function packType(packDir) {
  if (packDir.includes('-rules-')) return 'rules';
  if (packDir.includes('-agents-')) return 'agents';
  if (packDir.includes('-skills-')) return 'skills';
  if (packDir.includes('-guardrails-')) return 'guardrails';
  return 'unknown';
}

function listPackDirs() {
  return fs.readdirSync(path.join(ROOT, 'packages')).filter(d =>
    fs.statSync(path.join(ROOT, 'packages', d)).isDirectory()
  );
}

// ─── 0. Package name integrity ───────────────────────────────────────────────
console.log('\n[0] Package name integrity (name field must match directory name)');
{
  const NAME_RE = /^bluetemberg-[a-z][a-z0-9-]*$/;
  for (const dir of listPackDirs()) {
    const pkgPath = path.join(ROOT, 'packages', dir, 'package.json');
    if (!fs.existsSync(pkgPath)) {
      fail(`packages/${dir}: missing package.json`);
      continue;
    }
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (pkg.name !== dir) {
      fail(`packages/${dir}: name field "${pkg.name}" does not match directory name "${dir}"`);
    } else if (!NAME_RE.test(pkg.name)) {
      fail(`packages/${dir}: name "${pkg.name}" does not match required pattern ${NAME_RE}`);
    } else {
      pass(`packages/${dir}: name "${pkg.name}" ✓`);
    }
  }
}

// ─── 1. Config integrity ──────────────────────────────────────────────────────
console.log('\n[1] Config integrity (bluetemberg.config.json ↔ packages/)');
{
  const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'bluetemberg.config.json'), 'utf8'));
  const packDirs = listPackDirs();
  const listedPacks = new Set(
    (config.extends || [])
      .map(e => e.replace(/^\.\//, '').replace(/^packages\//, '').split('/')[0])
      .filter(Boolean)
  );

  for (const dir of packDirs) {
    // Guardrail packs are distributed as npm packages but are not content
    // that syncs to the marketplace — they define hooks, not rules/agents/skills.
    if (packType(dir) === 'guardrails') {
      pass(`packages/${dir} (guardrails — extends exempt)`);
      continue;
    }
    if (!listedPacks.has(dir)) fail(`packages/${dir} exists but is not listed in bluetemberg.config.json extends`);
    else pass(`packages/${dir} listed in config`);
  }

  for (const listed of listedPacks) {
    if (!packDirs.includes(listed)) fail(`extends references "${listed}" which does not exist in packages/`);
  }
}

// ─── 2. Frontmatter validation ────────────────────────────────────────────────
console.log('\n[2] Frontmatter validation');
{
  for (const packDir of listPackDirs()) {
    const llmDir = path.join(ROOT, 'packages', packDir, 'llm');
    const type = packType(packDir);
    const mdFiles = findMdFiles(llmDir);

    if (mdFiles.length === 0) {
      fail(`packages/${packDir}: no .md files found in llm/`);
      continue;
    }

    for (const file of mdFiles) {
      const rel = path.relative(ROOT, file);
      const content = fs.readFileSync(file, 'utf8');
      const fm = parseFrontmatter(content);

      if (!fm) {
        fail(`${rel}: missing frontmatter block`);
        continue;
      }

      const { values, keys } = fm;
      let fileOk = true;

      if (!values.description) {
        fail(`${rel}: missing required field 'description'`);
        fileOk = false;
      } else if (values.description.length > 200) {
        fail(`${rel}: 'description' exceeds 200 chars (${values.description.length})`);
        fileOk = false;
      }

      if (type === 'rules' && !keys.has('scope')) {
        fail(`${rel}: rules require a 'scope' field`);
        fileOk = false;
      }

      if ((type === 'agents' || type === 'skills') && !keys.has('name')) {
        fail(`${rel}: ${type} require a 'name' field`);
        fileOk = false;
      }

      if (fileOk) pass(rel);
    }
  }
}

// ─── 3. Release-please registration integrity ───────────────────────────────
// Every pack in packages/ must be registered in both release-please-config.json
// and .release-please-manifest.json, otherwise new packs silently never release.
console.log('\n[3] Release-please registration integrity');
{
  const packDirs = listPackDirs();
  const rpConfig = JSON.parse(fs.readFileSync(path.join(ROOT, 'release-please-config.json'), 'utf8'));
  const rpManifest = JSON.parse(fs.readFileSync(path.join(ROOT, '.release-please-manifest.json'), 'utf8'));

  for (const dir of packDirs) {
    const key = `packages/${dir}`;
    if (!rpConfig.packages || !(key in rpConfig.packages)) {
      fail(`${key} missing in release-please-config.json packages`);
    } else {
      pass(`${key} present in release-please-config.json`);
    }
    if (!(key in rpManifest)) {
      fail(`${key} missing in .release-please-manifest.json`);
    } else {
      pass(`${key} present in .release-please-manifest.json`);
    }
  }
}

// ─── 4. Catalog freshness ─────────────────────────────────────────────────────
// catalog.json (and the generated wiki Catalog) is derived from each pack's
// package.json description and each content file's frontmatter description. If a
// pack's frontmatter changes but `npm run generate:catalog` is not re-run, the
// catalog drifts (the PR-that-renamed-descriptions-but-not-the-catalog case).
// This check recomputes the expected description/items for every pack ALREADY in
// catalog.json and fails on drift. It is deterministic — reads files only, no
// npm/network, and ignores the `generated` timestamp + `preview` field. Logic
// mirrors scripts/generate-catalog.js so it can't false-positive.
console.log('\n[4] Catalog freshness (catalog.json ↔ pack frontmatter)');
{
  const catalogPath = path.join(ROOT, 'catalog.json');
  if (!fs.existsSync(catalogPath)) {
    fail('catalog.json not found — run `npm run generate:catalog`');
  } else {
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

    const parseDesc = (content) => {
      const m = content.match(/^---\n([\s\S]*?)---\n/);
      if (!m) return '';
      const d = m[1].match(/^description:\s*(.+)$/m);
      return d ? d[1].trim() : '';
    };
    const inferKind = (name) => {
      if (name.includes('-rules-')) return 'rules';
      if (name.includes('-agents-')) return 'agents';
      if (name.includes('-skills-')) return 'skills';
      if (name.includes('-guardrails-')) return 'guardrails';
      return 'rules';
    };
    const listItems = (pkgDir, kind) => {
      const dir = path.join(pkgDir, 'llm', kind);
      if (!fs.existsSync(dir)) return [];
      const out = [];
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.isFile() && e.name.endsWith('.md')) {
          out.push({ name: e.name.replace(/\.md$/, ''), description: parseDesc(fs.readFileSync(path.join(dir, e.name), 'utf8')) });
        } else if (e.isDirectory()) {
          const skillFile = path.join(dir, e.name, 'SKILL.md');
          if (fs.existsSync(skillFile)) out.push({ name: e.name, description: parseDesc(fs.readFileSync(skillFile, 'utf8')) });
        }
      }
      return out.sort((a, b) => a.name.localeCompare(b.name));
    };
    const norm = (arr) => JSON.stringify((arr || []).map((i) => [i.name, i.description]));

    for (const pack of catalog.packs || []) {
      const pkgDir = path.join(ROOT, 'packages', pack.name);
      const pkgJsonPath = path.join(pkgDir, 'package.json');
      if (!fs.existsSync(pkgJsonPath)) {
        fail(`catalog.json lists "${pack.name}" but packages/${pack.name}/package.json is missing — run \`npm run generate:catalog\``);
        continue;
      }
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
      const kind = inferKind(pack.name);
      let entryOk = true;

      if ((pkg.description ?? '') !== (pack.description ?? '')) {
        fail(`${pack.name}: catalog description is stale — run \`npm run generate:catalog\``);
        entryOk = false;
      }
      if (norm(listItems(pkgDir, kind)) !== norm(pack[kind])) {
        fail(`${pack.name}: catalog ${kind} items/descriptions are stale — run \`npm run generate:catalog\``);
        entryOk = false;
      }
      if (entryOk) pass(`${pack.name} catalog entry matches frontmatter`);
    }
  }
}

// ─── Result ───────────────────────────────────────────────────────────────────
console.log(`\n${errors === 0 ? '✅ All checks passed.' : `❌ ${errors} error(s) found.`}\n`);
process.exit(errors > 0 ? 1 : 0);
