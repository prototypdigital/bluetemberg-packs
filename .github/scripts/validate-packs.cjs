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
  // The engine's built-in table (bluetemberg 0.19 BUILTIN_STACK_PACKAGES). The
  // engine merges this file over it, so a built-in still owns its package and
  // an entry without packages.npm keeps the built-in one.
  const BUILTIN = {
    nextjs: 'next', react: 'react', payload: 'payload', angular: '@angular/core', vue: 'vue', svelte: 'svelte',
    astro: 'astro', solid: 'solid-js', tailwind: 'tailwindcss', drizzle: 'drizzle-orm', trpc: '@trpc/server',
  };

  /**
   * Every problem in a stack map, as the engine's buildStackPackages would see it.
   * `isTagged(name)` says whether a pack targets the stack (a known implies target).
   */
  function stackMapErrors(map, isTagged) {
    const errors = [];
    if (map.schema !== 1) errors.push(`stack-packages.json: "schema" must be 1 (got ${JSON.stringify(map.schema)})`);
    if (!isObject(map.stacks)) return errors;
    const stacks = map.stacks;
    const byPackage = new Map(Object.entries(BUILTIN).map(([stack, npm]) => [npm, stack]));
    const known = (name) => Object.hasOwn(stacks, name) || Object.hasOwn(BUILTIN, name) || isTagged(name);
    for (const [stack, entry] of Object.entries(stacks)) {
      const where = `stack-packages.json stacks.${stack}`;
      if (!STACK_NAME.test(stack)) { errors.push(`${where}: not a valid stack name (${STACK_NAME})`); continue; }
      if (!isObject(entry)) { errors.push(`${where}: entry must be an object`); continue; }
      const ownNpm = entry.packages?.npm;
      // What the engine resolves: this entry's package, else the built-in one.
      const npm = ownNpm ?? (Object.hasOwn(BUILTIN, stack) ? BUILTIN[stack] : undefined);
      if (entry.packages !== undefined && !isObject(entry.packages)) errors.push(`${where}: "packages" must be an object`);
      else if (ownNpm !== undefined && (typeof ownNpm !== 'string' || ownNpm.length > 214 || !NPM_NAME.test(ownNpm))) errors.push(`${where}: "packages.npm" ${JSON.stringify(ownNpm)} is not a valid npm package name`);
      else if (npm !== undefined && byPackage.has(npm) && byPackage.get(npm) !== stack) errors.push(`${where}: package "${npm}" is also mapped by ${byPackage.get(npm)}${Object.hasOwn(BUILTIN, byPackage.get(npm)) ? ' (built-in)' : ''} — one package, one stack`);
      else if (npm !== undefined) byPackage.set(npm, stack);
      if (entry.implies === undefined) continue;
      if (!Array.isArray(entry.implies)) { errors.push(`${where}: "implies" must be an array`); continue; }
      for (const implied of entry.implies) {
        // The engine drops the whole entry when any element is not a stack name.
        if (typeof implied !== 'string' || !STACK_NAME.test(implied)) errors.push(`${where}: implies ${JSON.stringify(implied)}, which is not a valid stack name`);
        else if (implied === stack) errors.push(`${where}: implies itself`);
        else if (!known(implied)) errors.push(`${where}: implies unknown stack "${implied}"`);
      }
    }
    return errors;
  }

  // Self-test: the real map is valid, so without these samples a regression in
  // the checks above would pass CI unnoticed. Each "bad" one is something the
  // engine warns about or drops (see buildStackPackages), except an unknown
  // `implies` target, which the engine accepts and this repo forbids (#134).
  {
    const map = (stacks, schema = 1) => ({ schema, stacks });
    const bad = [
      map({}, 2),
      map({ 'Bad Name': {} }),
      map({ expo: { packages: { npm: 'Expo' } } }),
      map({ expo: { packages: 'expo' } }),
      map({ 'next-app': { packages: { npm: 'next' } } }),
      map({ nextjs: { implies: ['react'] }, 'next-app': { packages: { npm: 'next' } } }),
      map({ a: { packages: { npm: 'pkg-a' } }, b: { packages: { npm: 'pkg-a' } } }),
      map({ expo: { packages: { npm: 'expo' }, implies: ['expo'] } }),
      map({ expo: { packages: { npm: 'expo' }, implies: ['nope-stack'] } }),
      map({ expo: { packages: { npm: 'expo' }, implies: ['Bad Name'] } }),
      map({ expo: { packages: { npm: 'expo' }, implies: 'react' } }),
    ];
    const good = [
      map({}),
      map({ nextjs: { packages: { npm: 'next' }, implies: ['react'] } }),
      map({ nextjs: { implies: ['react'] } }),
      map({ expo: { packages: { npm: 'expo' }, implies: ['react-native', 'vue'] }, 'react-native': { packages: { npm: 'react-native' } } }),
      map({ angular: { packages: { npm: '@angular/core' } }, py: { packages: { pypi: 'django' } } }),
    ];
    const none = () => false;
    bad.forEach((m, i) => { if (stackMapErrors(m, none).length === 0) fail(`self-test: stack map check accepted invalid sample #${i} ${JSON.stringify(m.stacks)}`); });
    good.forEach((m, i) => { const e = stackMapErrors(m, none); if (e.length) fail(`self-test: stack map check rejected valid sample #${i}: ${e[0]}`); });
    pass(`stack map check rejects ${bad.length} invalid and accepts ${good.length} valid samples`);
  }

  const mapPath = path.join(ROOT, 'stack-packages.json');
  let map = null;
  try {
    map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
  } catch (err) {
    fail(`stack-packages.json: ${err.message}`);
  }

  if (map) {
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
        const block = frontmatterBlock(fs.readFileSync(file, 'utf8'));
        const flow = block !== null && block.match(/^stacks:[ \t]*\{(.*)\}[ \t]*$/m);
        for (const part of flow ? flow[1].split(',') : []) {
          const k = part.match(/^\s*["']?([^"':\s]+)["']?\s*:/);
          if (k) tag(k[1], path.relative(ROOT, file));
        }
        const m = block !== null && block.match(/^stacks:[ \t]*\r?\n((?:[ \t]+.*(?:\r?\n|$))+)/m);
        if (!m) continue;
        for (const line of m[1].split(/\r?\n/)) {
          const k = line.match(/^[ \t]+["']?([^"':\s]+)["']?:/);
          if (k) tag(k[1], path.relative(ROOT, file));
        }
      }
    }

    if (stacks) {
      for (const err of stackMapErrors(map, (name) => tagged.has(name))) fail(err);

      for (const [stack, where] of tagged) {
        if (Object.hasOwn(stacks, stack)) pass(`stack "${stack}" mapped to ${stacks[stack].packages?.npm ?? '(built-in)'}`);
        // The engine auto-detects only mapped stacks; an unmapped one counts only
        // when a project pins a version for it in config `stacks` ("auto" would
        // look up an npm package of the same name). That's deliberate for
        // `skeletor` (authoring the library itself).
        else pass(`stack "${stack}" (${where}) is unmapped — never auto-detected; a project pins its version in config \`stacks\``);
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

// ─── 7. Catalog registry check self-test ─────────────────────────────────────
// generate:catalog drops a pack only when npm says it isn't published. A flaky
// registry once dropped a published pack silently, so pin the contract here with
// a stubbed fetch (no network): a 404 excludes the pack, a transient 5xx or bad
// body is retried and the pack kept, and a persistent failure exits 1 without
// writing anything. Runs the real generator against the real packages/ and
// writes to a temp dir.
async function registrySelfTest() {
  console.log('\n[7] Catalog registry check self-test (stubbed npm, no network)');
  const os = require('os');
  const { pathToFileURL } = require('url');
  const { ATTEMPTS } = require('../../scripts/npm-registry.cjs');
  const { main } = await import(pathToFileURL(path.join(__dirname, '..', '..', 'scripts', 'generate-catalog.js')).href);

  const names = listPackDirs().sort();
  const target = names.includes('bluetemberg-rules-accessibility') ? 'bluetemberg-rules-accessibility' : names[0];
  const published = () => new Response(JSON.stringify({ 'dist-tags': { latest: '1.0.0' } }), { status: 200 });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-selftest-'));

  // `targetResponses` answers the target pack's Nth request; every other pack is published.
  const run = async (label, targetResponses) => {
    let calls = 0;
    const fetchImpl = async (url) => {
      if (decodeURIComponent(url.split('/').pop()) !== target) return published();
      const respond = targetResponses[Math.min(calls, targetResponses.length - 1)];
      calls += 1;
      return respond();
    };
    const catalogPath = path.join(tmp, `${label}.json`);
    const wikiCatalogPath = path.join(tmp, `${label}.md`);
    const output = [];
    const saved = { log: console.log, warn: console.warn, error: console.error };
    console.log = console.warn = console.error = (...args) => output.push(args.join(' '));
    let code;
    try {
      code = await main({ fetchImpl, sleep: async () => {}, catalogPath, wikiCatalogPath, now: () => new Date(0) });
    } finally {
      Object.assign(console, saved);
    }
    const read = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null);
    const catalog = read(catalogPath);
    return { code, calls, output: output.join('\n'), catalog: catalog && JSON.parse(catalog), wiki: read(wikiCatalogPath) };
  };
  const listed = (r) => (r.catalog?.packs || []).some((p) => p.name === target);
  const inWiki = (r) => (r.wiki || '').includes(`### ${target}\n`);

  try {
    const r404 = await run('not-found', [() => new Response('{"error":"Not found"}', { status: 404 })]);
    if (r404.code !== 0) fail(`self-test: a 404 made the generator exit ${r404.code}, want 0`);
    else if (listed(r404) || inWiki(r404)) fail(`self-test: a 404 for ${target} did not exclude it`);
    else if (r404.catalog.packs.length !== names.length - 1) fail(`self-test: a 404 for one pack left ${r404.catalog.packs.length}/${names.length} packs`);
    else if (!r404.output.includes(`excluded ${target}: not published on npm (registry returned 404)`)) fail('self-test: a 404 exclusion was not logged with the pack and reason');
    else pass(`404 → ${target} excluded and logged`);

    const r500 = await run('transient', [() => new Response('upstream error', { status: 500 }), published]);
    if (r500.code !== 0 || !listed(r500) || !inWiki(r500)) fail(`self-test: 500 then 200 did not keep ${target} (exit ${r500.code})`);
    else if (r500.calls !== 2) fail(`self-test: 500 then 200 made ${r500.calls} request(s), want 2`);
    else pass(`500 then 200 → ${target} retried and included`);

    const rBody = await run('malformed', [() => new Response('<html>busy</html>', { status: 200 }), published]);
    if (rBody.code !== 0 || !listed(rBody)) fail(`self-test: malformed body then 200 did not keep ${target} (exit ${rBody.code})`);
    else pass(`malformed body then 200 → ${target} retried and included`);

    const rDown = await run('persistent', [() => Promise.reject(new TypeError('fetch failed'))]);
    if (rDown.code !== 1) fail(`self-test: a persistent network error made the generator exit ${rDown.code}, want 1`);
    else if (rDown.catalog !== null || rDown.wiki !== null) fail('self-test: a persistent network error still wrote catalog.json/Catalog.md');
    else if (rDown.calls !== ATTEMPTS) fail(`self-test: a persistent error made ${rDown.calls} request(s), want ${ATTEMPTS}`);
    else if (!rDown.output.includes(`${target}: network error: fetch failed`)) fail('self-test: the failure message does not name the pack and the cause');
    else pass(`persistent error → exit 1 after ${ATTEMPTS} attempts, nothing written`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

// ─── Result ───────────────────────────────────────────────────────────────────
registrySelfTest()
  .catch((err) => fail(`self-test: registry check self-test crashed: ${err && err.stack ? err.stack : err}`))
  .then(() => {
    console.log(`\n${errors === 0 ? '✅ All checks passed.' : `❌ ${errors} error(s) found.`}\n`);
    process.exit(errors > 0 ? 1 : 0);
  });
