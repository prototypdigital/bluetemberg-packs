#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = process.cwd();
const PACKAGES_DIR = path.join(ROOT, 'packages');
const CATALOG_PATH = path.join(ROOT, 'catalog.json');

let errors = 0;

function fail(msg) {
  console.error(`  ✗ ${msg}`);
  errors++;
}

function pass(msg) {
  console.log(`  ✓ ${msg}`);
}

function npmFetch(packageName) {
  return new Promise((resolve) => {
    const url = `https://registry.npmjs.org/${encodeURIComponent(packageName)}`;
    https.get(url, { headers: { Accept: 'application/json' } }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode === 404) {
          resolve({ published: false, version: null });
          return;
        }
        try {
          const data = JSON.parse(body);
          const latest = data['dist-tags'] && data['dist-tags'].latest;
          resolve({ published: !!latest, version: latest || null });
        } catch {
          resolve({ published: false, version: null });
        }
      });
    }).on('error', () => resolve({ published: false, version: null }));
  });
}

async function main() {
  // Collect all packages from packages/
  const packageDirs = fs.readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  const packages = [];
  for (const dir of packageDirs) {
    const pkgJsonPath = path.join(PACKAGES_DIR, dir, 'package.json');
    if (!fs.existsSync(pkgJsonPath)) {
      fail(`packages/${dir} has no package.json`);
      continue;
    }
    const { name } = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
    if (!name) {
      fail(`packages/${dir}/package.json has no "name" field`);
      continue;
    }
    packages.push({ dir, name });
  }

  // Check catalog.json for orphan entries (entries with no matching packages/ dir)
  if (fs.existsSync(CATALOG_PATH)) {
    const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
    const packageDirSet = new Set(packageDirs);
    console.log('\nChecking catalog.json for orphan entries...');
    for (const entry of catalog.packs || []) {
      if (!packageDirSet.has(entry.name)) {
        fail(`catalog.json entry "${entry.name}" has no matching packages/ directory`);
      }
    }
    if (errors === 0) {
      pass(`All ${(catalog.packs || []).length} catalog.json entries have a matching packages/ directory`);
    }
  }

  // Check npm publish status for all packages in parallel
  console.log(`\nChecking npm publish status for ${packages.length} packages...`);
  const results = await Promise.all(
    packages.map(async ({ dir, name }) => {
      const result = await npmFetch(name);
      return { dir, name, ...result };
    })
  );

  const unpublished = results.filter((r) => !r.published);
  const published = results.filter((r) => r.published);

  for (const pkg of published) {
    pass(`${pkg.name}@${pkg.version}`);
  }
  for (const pkg of unpublished) {
    fail(`${pkg.name} (packages/${pkg.dir}) is not published on npm`);
  }

  console.log(`\n${published.length}/${results.length} packages published.`);

  if (errors > 0) {
    console.error(`\n${errors} error(s) found. Failing check.`);
    process.exit(1);
  }

  console.log('\nAll packages are published on npm.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
