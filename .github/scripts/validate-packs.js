#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

// ─── 3. Version bump check (PRs only) ────────────────────────────────────────
const baseSha = process.env.BASE_SHA;
if (baseSha) {
  console.log('\n[3] Version bump check');
  try {
    const changedFiles = execSync(`git diff --name-only ${baseSha} HEAD`, { encoding: 'utf8' })
      .trim().split('\n').filter(Boolean);

    const affectedPacks = new Set(
      changedFiles
        .map(f => { const m = f.match(/^packages\/([^/]+)\//); return m ? m[1] : null; })
        .filter(Boolean)
    );

    if (affectedPacks.size === 0) {
      console.log('  (no pack changes in this PR)');
    }

    for (const packDir of affectedPacks) {
      const llmChanged = changedFiles.some(f => f.startsWith(`packages/${packDir}/llm/`));
      if (!llmChanged) {
        pass(`packages/${packDir}: no llm/ changes — version bump not required`);
        continue;
      }

      const versionBumped = changedFiles.includes(`packages/${packDir}/package.json`);
      if (!versionBumped) {
        fail(`packages/${packDir}: llm/ content changed but package.json version was not bumped`);
      } else {
        pass(`packages/${packDir}: version bumped`);
      }
    }
  } catch (e) {
    console.warn('  Version check skipped:', e.message);
  }
} else {
  console.log('\n[3] Version bump check — skipped (not a PR context)');
}

// ─── Result ───────────────────────────────────────────────────────────────────
console.log(`\n${errors === 0 ? '✅ All checks passed.' : `❌ ${errors} error(s) found.`}\n`);
process.exit(errors > 0 ? 1 : 0);
