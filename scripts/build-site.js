#!/usr/bin/env node
// @ts-check
// Build the static pack-browser site into _site/.
//
// 1. Regenerate catalog.json (so the site never ships a stale catalog).
// 2. Copy the catalog + site assets into the Pages artifact dir.
//    site/og.png is a committed static asset — the OG card carries no
//    catalog-derived data (no pack count, no version), so it never goes stale
//    and does NOT need regenerating here. Re-run `npm run build:og` only when
//    the card DESIGN changes (requires rsvg-convert; not available in CI).
// 3. Enrich _site/catalog.json with npm publish dates (best-effort, network).
//    The committed catalog.json stays pure/offline/deterministic — only the
//    deployed copy carries publish dates.
// 4. Inject a crawlable no-JS pack list so link unfurlers and search engines
//    that don't run JS still see every pack.
import { execFileSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const SITE_DIR = join(REPO_ROOT, "site");
const OUT_DIR = join(REPO_ROOT, "_site");
const CATALOG_PATH = join(REPO_ROOT, "catalog.json");
const OUT_CATALOG = join(OUT_DIR, "catalog.json");
const OUT_INDEX = join(OUT_DIR, "index.html");
const CATALOG_SCRIPT = join(__dirname, "generate-catalog.js");

const REGISTRY = "https://registry.npmjs.org";
const FETCH_TIMEOUT_MS = 8000;
const FETCH_CONCURRENCY = 8;

// Mirrors generate-catalog.js — kept local so this script has no import coupling.
const KIND_ORDER = ["rules", "agents", "skills", "guardrails"];
const KIND_HEADING = {
  rules: "Rules",
  agents: "Agents",
  skills: "Skills",
  guardrails: "Guardrails",
};

const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c],
  );

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
  cpSync(CATALOG_PATH, OUT_CATALOG);

  // Skip Jekyll processing on Pages so nothing is rewritten.
  writeFileSync(join(OUT_DIR, ".nojekyll"), "");
}

/**
 * Resolve a package's latest publish date from the npm registry.
 * Returns { status: 'published', published } | { status: 'absent' } | { status: 'error' }.
 * Distinguishing a 404 (definitively not on npm) from a network error matters:
 * the site treats `published: null` as "not on npm" but leaves an absent field
 * installable, so a flaky network must NOT mark a real package as missing.
 */
async function fetchPublished(name) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${REGISTRY}/${name}`, {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    if (res.status === 404) return { status: "absent" };
    if (!res.ok) return { status: "error" };
    const doc = await res.json();
    const latest = doc["dist-tags"]?.latest;
    const published =
      (latest && doc.time?.[latest]) || doc.time?.modified || null;
    return published ? { status: "published", published } : { status: "error" };
  } catch {
    return { status: "error" };
  } finally {
    clearTimeout(timer);
  }
}

/** Stamp publish dates onto _site/catalog.json. Best-effort; never throws. */
async function enrichCatalog() {
  if (typeof fetch !== "function") {
    console.warn("build:site — global fetch unavailable; skipping npm dates.");
    return JSON.parse(readFileSync(OUT_CATALOG, "utf8"));
  }

  const catalog = JSON.parse(readFileSync(OUT_CATALOG, "utf8"));
  const packs = catalog.packs ?? [];
  let published = 0;
  let absent = 0;
  let unknown = 0;

  for (let i = 0; i < packs.length; i += FETCH_CONCURRENCY) {
    const batch = packs.slice(i, i + FETCH_CONCURRENCY);
    await Promise.all(
      batch.map(async (pack) => {
        const result = await fetchPublished(pack.name);
        if (result.status === "published") {
          pack.published = result.published;
          published += 1;
          return;
        }
        if (result.status === "absent") {
          pack.published = null;
          absent += 1;
          return;
        }
        unknown += 1; // leave the field absent → still installable
      }),
    );
  }

  writeFileSync(OUT_CATALOG, JSON.stringify(catalog, null, 2) + "\n");
  console.log(
    `build:site — npm freshness: ${published} published, ${absent} not on npm, ${unknown} unknown`,
  );
  return catalog;
}

/** Render the crawlable, no-JS pack list. */
function seoListHtml(catalog) {
  const packs = catalog.packs ?? [];
  const byKind = {};
  for (const kind of KIND_ORDER) byKind[kind] = [];
  for (const pack of packs) if (byKind[pack.kind]) byKind[pack.kind].push(pack);

  let html = "<h2>Bluetemberg pack catalog</h2>";
  for (const kind of KIND_ORDER) {
    const group = byKind[kind].sort((a, b) => a.name.localeCompare(b.name));
    if (!group.length) continue;
    html += `<h3>${KIND_HEADING[kind]}</h3><dl>`;
    for (const pack of group) {
      const npm = `https://www.npmjs.com/package/${pack.name}`;
      html += `<dt><a href="${esc(npm)}">${esc(pack.name)}</a> v${esc(pack.version)}</dt><dd>${esc(pack.description)}</dd>`;
    }
    html += "</dl>";
  }
  return html;
}

function injectSeo(catalog) {
  let html = readFileSync(OUT_INDEX, "utf8");
  if (!html.includes("<!--PACKS-->")) {
    console.warn("build:site — SEO marker not found; skipping no-JS list.");
    return;
  }
  html = html.replace("<!--PACKS-->", seoListHtml(catalog));
  writeFileSync(OUT_INDEX, html);
}

async function main() {
  if (!existsSync(SITE_DIR)) {
    console.error(
      `build:site — site/ directory missing at ${SITE_DIR}; aborting.`,
    );
    process.exit(1);
  }
  regenerateCatalog();
  assembleSite();
  const catalog = await enrichCatalog();
  injectSeo(catalog);
  console.log(`build:site — wrote _site/ (index.html + catalog.json)`);
}

main().catch((err) => {
  console.error("build:site — failed:", err);
  process.exit(1);
});
