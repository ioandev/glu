#!/usr/bin/env node
/**
 * Generates GLU's installable icon set from `img/favicon.svg` — the mark's
 * source of truth. Never from `img/favicon.png`: that export is 508×523, and
 * scaling a non-square source into square slots distorts or crops it (ADR 04).
 *
 *   node scripts/generate-icons.mjs
 *
 * Outputs are committed; rerun by hand when the mark changes. Build-time icon
 * generation would be a dependency tax on every build for assets that change
 * roughly never.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "img", "favicon.svg");
/** Manifest icons are fetched by URL, so they are plain public assets. */
const manifestDir = join(root, "public", "icons");
/**
 * Tab and Apple icons ship via the App Router **file convention** instead
 * (`app/icon.png`, `app/apple-icon.png`): the convention emits the link tags
 * with the basePath applied, and a hand-written `metadata.icons` URL silently
 * misses `/glu` (ADR 01's reasoning, relearned the hard way — ADR 04).
 */
const appDir = join(root, "src", "app");

/** Apple composites transparency as black, so its icon gets a solid ground. */
const APPLE_BACKGROUND = "#f5f6f8";
/** The mark's ink, used as the maskable icon's ground so nothing reads as a hole. */
const MASKABLE_BACKGROUND = "#ffffff";

const targets = [
  { dir: manifestDir, file: "icon-192.png", size: 192, scale: 0.86, background: null },
  { dir: manifestDir, file: "icon-512.png", size: 512, scale: 0.86, background: null },
  // Android's round masks eat the edges of a full-bleed glyph: the maskable
  // safe zone is a centred circle of 40% radius, so the mark sits at ~66%.
  {
    dir: manifestDir,
    file: "icon-512-maskable.png",
    size: 512,
    scale: 0.66,
    background: MASKABLE_BACKGROUND,
  },
  { dir: appDir, file: "apple-icon.png", size: 180, scale: 0.8, background: APPLE_BACKGROUND },
  // The PNG tab-icon fallback for browsers that don't take an SVG favicon.
  // 64 px covers a 32 px tab slot on a 2× display; the mark is nearly
  // full-bleed because a favicon has no room to spare. `app/icon.svg` stays a
  // hand-maintained copy — it carries the dark-scheme ink swap (ADR 01).
  { dir: appDir, file: "icon.png", size: 64, scale: 0.94, background: null },
];

const transparent = { r: 0, g: 0, b: 0, alpha: 0 };

async function main() {
  await mkdir(manifestDir, { recursive: true });
  const svg = await readFile(source);

  for (const target of targets) {
    // Render the mark at its scaled size, then centre it on the square canvas —
    // the viewBox is 508×523, so `fit: "contain"` preserves the aspect ratio
    // instead of stretching it.
    const inner = Math.round(target.size * target.scale);
    const mark = await sharp(svg, { density: 512 })
      .resize(inner, inner, { fit: "contain", background: transparent })
      .png()
      .toBuffer();

    const canvas = sharp({
      create: {
        width: target.size,
        height: target.size,
        channels: 4,
        background: target.background ?? transparent,
      },
    });

    const buffer = await canvas
      .composite([{ input: mark, gravity: "centre" }])
      .png({ compressionLevel: 9 })
      .toBuffer();

    await writeFile(join(target.dir, target.file), buffer);
    process.stdout.write(`${target.file}  ${target.size}x${target.size}\n`);
  }
}

await main();
