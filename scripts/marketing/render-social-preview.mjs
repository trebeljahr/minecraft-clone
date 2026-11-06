// Renders the GitHub social preview cards from
// docs/marketing/social-preview/template.html into social-preview-{a,b,c}.png
// (1280x640). Run capture-screenshots.mjs first: the cards use its JPEGs.
//
//   node scripts/marketing/render-social-preview.mjs
//
// Playwright is not a project dependency: the script uses PLAYWRIGHT_MODULE, a
// local install, or the global one (`npm i -g playwright`), in that order.

import { execSync } from "node:child_process";
import { statSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(fileURLToPath(import.meta.url), "../../..");
const dir = join(root, "docs/marketing/social-preview");

async function loadPlaywright() {
  if (process.env.PLAYWRIGHT_MODULE)
    return createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE);
  try {
    return await import("playwright");
  } catch {
    const globalRoot = execSync("npm root -g").toString().trim();
    return createRequire(join(globalRoot, "noop.js"))("playwright");
  }
}

const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({
  viewport: { width: 1280, height: 640 },
  deviceScaleFactor: 1,
});
for (const v of ["a", "b", "c"]) {
  await page.goto(`${pathToFileURL(join(dir, "template.html")).href}?v=${v}`, {
    waitUntil: "load",
  });
  await page.evaluate(() => document.fonts.ready);
  const out = join(dir, `social-preview-${v}.png`);
  await page.screenshot({ path: out });
  const kb = Math.round(statSync(out).size / 1024);
  console.log(`wrote ${out} (${kb} KB${kb > 1000 ? ", over GitHub's 1 MB limit" : ""})`);
}
await browser.close();
