#!/usr/bin/env node
// @ts-check
// Build the static pack-browser site into _site/.
// Regenerates catalog.json first so the site never ships a stale catalog,
// then copies the catalog + site assets into the GitHub Pages artifact dir.
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const SITE_DIR = join(REPO_ROOT, "site");
const OUT_DIR = join(REPO_ROOT, "_site");
const CATALOG_PATH = join(REPO_ROOT, "catalog.json");
const CATALOG_SCRIPT = join(__dirname, "generate-catalog.js");

function regenerateCatalog() {
  console.log("build:site — regenerating catalog.json…");
  execFileSync(process.execPath, [CATALOG_SCRIPT], {
    stdio: "inherit",
    cwd: REPO_ROOT,
  });
  if (!existsSync(CATALOG_PATH)) {
    console.error("build:site — catalog.json was not produced; aborting.");
    process.exit(1);
  }
}

function assembleSite() {
  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });

  cpSync(SITE_DIR, OUT_DIR, { recursive: true });
  cpSync(CATALOG_PATH, join(OUT_DIR, "catalog.json"));

  // Skip Jekyll processing on Pages so nothing is rewritten.
  writeFileSync(join(OUT_DIR, ".nojekyll"), "");
}

function main() {
  if (!existsSync(SITE_DIR)) {
    console.error(
      `build:site — site/ directory missing at ${SITE_DIR}; aborting.`,
    );
    process.exit(1);
  }
  regenerateCatalog();
  assembleSite();
  console.log(`build:site — wrote _site/ (index.html + catalog.json)`);
}

main();
