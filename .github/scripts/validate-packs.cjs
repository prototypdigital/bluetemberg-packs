#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { readScalar, frontmatterErrors, frontmatterBlock, topLevelEntries, scalarValue } = require('../../scripts/frontmatter.cjs');

const ROOT = process.cwd();
let errors = 0;

function fail(msg) {
  console.error(`  ✗ ${msg}`);
  errors++;
}

function pass(msg) {
  console.log(`  ✓ ${msg}`);
}

// Reads top-level frontmatter keys. Returns { values, keys }, where keys tracks
// every key that appeared, even those with no inline value (e.g. multi-line
// arrays), and values holds each scalar unquoted the way a YAML parser reads it.
function parseFrontmatter(content) {
  const block = frontmatterBlock(content);
  if (block === null) return null;

  const values = {};
  const keys = new Set();
  for (const { key, raw } of topLevelEntries(block)) {
    keys.add(key);
    const val = scalarValue(raw);
    if (val) values[key] = val;
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

// ─── 2a. Frontmatter checker self-test ───────────────────────────────────────
// Every pack file is clean, so step [2] alone can't show the checker still
// catches anything. These samples pin what it must reject and accept; a
// regression in scripts/frontmatter.cjs fails here instead of passing silently.
console.log('\n[2a] Frontmatter checker self-test');
{
  const doc = (body) => `---\nname: x\n${body}\n---\n`;
  const mustReject = [
    'description: Next.js caching: ISR and tags',
    'description: @prototyp/skeletor expert',
    'description: [WIP] Does things',
    'description: | Does things',
    'description: , oops',
    'description: Ends with colon:',
    'description: "unclosed',
    'description: "bad \\q escape"',
    'description: drops # the rest',
    'description: Foo\ndescription: Bar',
    'description:foo',
    '\tdescription: tabbed',
  ];
  const mustAccept = [
    'description: "Next.js caching: ISR and tags"',
    "description: 'it''s fine: really'",
    'description: plain text, with commas (and parens) 100%',
    'description: x:y and http://a.b/c',
    'tools: ["read", "search"]',
    'description: >-\n  Folded text',
    'stacks:\n  payload: ">=3 <4"',
  ];
  for (const body of mustReject) {
    if (frontmatterErrors(doc(body)).length === 0) fail(`self-test: checker accepted invalid frontmatter ${JSON.stringify(body)}`);
  }
  for (const body of mustAccept) {
    const errs = frontmatterErrors(doc(body));
    if (errs.length > 0) fail(`self-test: checker rejected valid frontmatter ${JSON.stringify(body)}: ${errs[0]}`);
  }
  const read = readScalar(doc('description: "a: b \\"q\\" \\x41"'), 'description');
  if (read !== 'a: b "q" A') fail(`self-test: readScalar unquoted to ${JSON.stringify(read)}`);
  pass(`checker rejects ${mustReject.length} invalid and accepts ${mustAccept.length} valid samples`);
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

      // Hosts parse frontmatter with a real YAML parser and drop a file that
      // fails, so an unquoted `description: Foo: bar` hides the whole skill.
      for (const err of frontmatterErrors(content)) {
        fail(`${rel}: frontmatter won't parse as written — ${err}`);
        fileOk = false;
      }

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

    const parseDesc = (content) => readScalar(content, 'description');
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
      const expectedPlatforms = Array.isArray(pkg.bluetemberg?.platforms) ? pkg.bluetemberg.platforms : [];
      if (JSON.stringify(expectedPlatforms) !== JSON.stringify(pack.platforms ?? [])) {
        fail(`${pack.name}: catalog platforms are stale — run \`npm run generate:catalog\``);
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

// ─── 5. Pack platforms ────────────────────────────────────────────────────────
// `bluetemberg.platforms` limits a pack to some hosts (e.g. ["claude"] for a pack
// that needs Claude Code hooks). The engine quietly ignores an unknown id in a
// catalog entry (a newer packs repo may name a platform an older engine lacks),
// so a typo would make the pack match no platform at all. Catch it here.
console.log('\n[5] Pack platforms (bluetemberg.platforms ids)');
{
  // The engine's platform ids (bluetemberg 0.19 `platforms` config). `windsurf`
  // is only an alias the engine rewrites to `devin`, so the catalog uses `devin`.
  const KNOWN_PLATFORMS = new Set([
    'cursor', 'claude', 'copilot', 'gemini', 'antigravity', 'devin', 'codex', 'claude-marketplace', 'agent-plugins',
  ]);
  for (const dir of listPackDirs()) {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'packages', dir, 'package.json'), 'utf8'));
    const platforms = pkg.bluetemberg?.platforms;
    if (platforms === undefined) continue;
    if (!Array.isArray(platforms) || !platforms.every((p) => typeof p === 'string')) {
      fail(`packages/${dir}: bluetemberg.platforms must be an array of platform ids`);
      continue;
    }
    const unknown = platforms.filter((p) => !KNOWN_PLATFORMS.has(p));
    if (unknown.length > 0) {
      fail(`packages/${dir}: bluetemberg.platforms has unknown id(s): ${unknown.join(', ')} (known: ${[...KNOWN_PLATFORMS].join(', ')})`);
    } else if (new Set(platforms).size !== platforms.length) {
      fail(`packages/${dir}: bluetemberg.platforms lists a platform twice`);
    } else {
      pass(`packages/${dir}: platforms ${JSON.stringify(platforms)}`);
    }
  }
}

// ─── 6. Stack map ─────────────────────────────────────────────────────────────
// stack-packages.json tells the engine which npm package carries each stack's
// version (catalog `stackPackages`). The engine drops a malformed entry with
// only a warning, so validate it here, and check that catalog.json carries it.
console.log('\n[6] Stack map (stack-packages.json ↔ catalog stackPackages)');
{
  // Same patterns as the engine's src/stacks/packages.ts.
  const NPM_NAME = /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
  const STACK_NAME = /^[a-z0-9][a-z0-9._-]*$/;
  const isObject = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

  const mapPath = path.join(ROOT, 'stack-packages.json');
  let map = null;
  try {
    map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
  } catch (err) {
    fail(`stack-packages.json: ${err.message}`);
  }

  if (map) {
    if (map.schema !== 1) fail(`stack-packages.json: "schema" must be 1 (got ${JSON.stringify(map.schema)})`);
    const stacks = isObject(map.stacks) ? map.stacks : null;
    if (!stacks) fail('stack-packages.json: "stacks" must be an object');

    // Stacks packs target: bluetemberg.stacks, plus keys of `stacks:` frontmatter.
    const tagged = new Map();
    const tag = (stack, where) => {
      if (!tagged.has(stack)) tagged.set(stack, where);
    };
    for (const dir of listPackDirs()) {
      const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'packages', dir, 'package.json'), 'utf8'));
      for (const s of pkg.bluetemberg?.stacks ?? []) tag(s, `packages/${dir}/package.json`);
      for (const file of findMdFiles(path.join(ROOT, 'packages', dir, 'llm'))) {
        const fmMatch = fs.readFileSync(file, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/);
        const m = fmMatch && fmMatch[1].match(/^stacks:[ \t]*\r?\n((?:[ \t]+.*(?:\r?\n|$))+)/m);
        if (!m) continue;
        for (const line of m[1].split(/\r?\n/)) {
          const k = line.match(/^[ \t]+["']?([^"':\s]+)["']?:/);
          if (k) tag(k[1], path.relative(ROOT, file));
        }
      }
    }

    if (stacks) {
      const byPackage = new Map();
      for (const [stack, entry] of Object.entries(stacks)) {
        const where = `stack-packages.json stacks.${stack}`;
        if (!STACK_NAME.test(stack)) { fail(`${where}: not a valid stack name (${STACK_NAME})`); continue; }
        if (!isObject(entry)) { fail(`${where}: entry must be an object`); continue; }
        const npm = entry.packages?.npm;
        if (entry.packages !== undefined && !isObject(entry.packages)) fail(`${where}: "packages" must be an object`);
        else if (npm !== undefined && (typeof npm !== 'string' || npm.length > 214 || !NPM_NAME.test(npm))) fail(`${where}: "packages.npm" ${JSON.stringify(npm)} is not a valid npm package name`);
        else if (npm !== undefined && byPackage.has(npm)) fail(`${where}: package "${npm}" is also mapped by ${byPackage.get(npm)} — one package, one stack`);
        else if (npm !== undefined) byPackage.set(npm, stack);
        if (entry.implies !== undefined) {
          if (!Array.isArray(entry.implies)) fail(`${where}: "implies" must be an array`);
          else {
            for (const implied of entry.implies) {
              if (implied === stack) fail(`${where}: implies itself`);
              else if (!(implied in stacks) && !tagged.has(implied)) fail(`${where}: implies unknown stack "${implied}"`);
            }
          }
        }
      }

      for (const [stack, where] of tagged) {
        if (stack in stacks) pass(`stack "${stack}" mapped to ${stacks[stack].packages?.npm ?? '(built-in)'}`);
        // The engine auto-detects only mapped stacks; an unmapped one counts only
        // when a project declares it in config `stacks` (or a mapped stack implies
        // it). That's deliberate for `skeletor` (authoring the library itself).
        else pass(`stack "${stack}" (${where}) is unmapped — never auto-detected, only when a project declares it in config \`stacks\``);
      }
    }

    const catalogPath = path.join(ROOT, 'catalog.json');
    if (fs.existsSync(catalogPath)) {
      const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
      if (JSON.stringify(catalog.stackPackages) !== JSON.stringify(map)) {
        fail('catalog.json stackPackages differs from stack-packages.json — run `npm run generate:catalog`');
      } else {
        pass('catalog.json stackPackages matches stack-packages.json');
      }
    }
  }
}

// ─── Result ───────────────────────────────────────────────────────────────────
console.log(`\n${errors === 0 ? '✅ All checks passed.' : `❌ ${errors} error(s) found.`}\n`);
process.exit(errors > 0 ? 1 : 0);
