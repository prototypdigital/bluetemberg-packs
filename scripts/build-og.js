#!/usr/bin/env node
// @ts-check
// Rasterize the Open Graph share card (scripts/og-card.svg -> site/og.png).
//
// Run after the pack count changes:  npm run build:og
//
// Requires `rsvg-convert` (brew install librsvg). The brand fonts (Newsreader,
// JetBrains Mono) are fetched to a temp dir so the headline renders correctly
// even when they aren't installed system-wide; if the fetch or the tool is
// unavailable the script exits non-zero with guidance rather than shipping a
// fallback-font card silently.
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  rmSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const SVG_TEMPLATE = join(__dirname, "og-card.svg");
const CATALOG_PATH = join(REPO_ROOT, "catalog.json");
const OUT_PNG = join(REPO_ROOT, "site", "og.png");

const FONTS = [
  {
    file: "Newsreader-300.ttf",
    url: "https://cdn.jsdelivr.net/fontsource/fonts/newsreader@latest/latin-300-normal.ttf",
  },
  {
    file: "Newsreader-400i.ttf",
    url: "https://cdn.jsdelivr.net/fontsource/fonts/newsreader@latest/latin-400-italic.ttf",
  },
  {
    file: "JetBrainsMono-400.ttf",
    url: "https://cdn.jsdelivr.net/fontsource/fonts/jetbrains-mono@latest/latin-400-normal.ttf",
  },
];

function ensureRsvg() {
  try {
    execFileSync("rsvg-convert", ["--version"], { stdio: "ignore" });
  } catch {
    console.error(
      "build:og — rsvg-convert not found. Install it: brew install librsvg",
    );
    process.exit(1);
  }
}

function packCount() {
  if (!existsSync(CATALOG_PATH)) return "";
  try {
    const catalog = JSON.parse(readFileSync(CATALOG_PATH, "utf8"));
    return String((catalog.packs ?? []).length);
  } catch {
    return "";
  }
}

async function fetchFonts(dir) {
  if (typeof fetch !== "function") {
    console.error("build:og — global fetch unavailable; cannot fetch fonts.");
    process.exit(1);
  }
  for (const font of FONTS) {
    const res = await fetch(font.url);
    if (!res.ok) {
      console.error(`build:og — failed to fetch ${font.file} (${res.status})`);
      process.exit(1);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(join(dir, font.file), buf);
  }
  const conf = `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig><dir>${dir}</dir><cachedir>${join(dir, "cache")}</cachedir></fontconfig>`;
  const confPath = join(dir, "fonts.conf");
  writeFileSync(confPath, conf);
  return confPath;
}

async function main() {
  ensureRsvg();

  const count = packCount();
  const svg = readFileSync(SVG_TEMPLATE, "utf8").replace(
    /\{\{COUNT\}\}/g,
    count,
  );

  const dir = mkdtempSync(join(tmpdir(), "og-fonts-"));
  try {
    const confPath = await fetchFonts(dir);
    const svgPath = join(dir, "og-card.svg");
    writeFileSync(svgPath, svg);

    execFileSync(
      "rsvg-convert",
      ["-w", "1200", "-h", "630", svgPath, "-o", OUT_PNG],
      { stdio: "inherit", env: { ...process.env, FONTCONFIG_FILE: confPath } },
    );
    console.log(`build:og — wrote site/og.png (${count} packs)`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error("build:og — failed:", err);
  process.exit(1);
});
