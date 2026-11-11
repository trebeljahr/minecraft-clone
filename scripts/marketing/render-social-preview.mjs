// Renders the GitHub social preview cards from
// docs/marketing/social-preview/template.html into social-preview-{a,b,c}.png
// (1280x640), and the two og:image cards (1200x630) from variant A:
//
//   og-wordmark.png  card A with its wordmark and line (no URL), laid out at 1.91:1
//   og-clean.png     card A without shade or text, the world reframed
//
// Run capture-screenshots.mjs first: the cards use its JPEGs.
//
//   node scripts/marketing/render-social-preview.mjs        # all five
//   node scripts/marketing/render-social-preview.mjs --og   # only the og:image cards
//
// The og:image cards are laid out at 1280x672, the 1.905:1 shape of 1200x630,
// so the 1280-px-wide template still holds; they are shot at 2x and scaled to
// exactly 1200x630 with ImageMagick (`magick` on the PATH).
//
// Playwright is not a project dependency: the script uses PLAYWRIGHT_MODULE, a
// local install, or the global one (`npm i -g playwright`), in that order.

import { execFileSync, execSync } from "node:child_process";
import { statSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(fileURLToPath(import.meta.url), "../../..");
const dir = join(root, "docs/marketing/social-preview");
const template = pathToFileURL(join(dir, "template.html")).href;
const ogOnly = process.argv.includes("--og");

// Override CSS for the og:image cards, added after the template has loaded.
// Every card is 1280x640 in the template; the page and card become 672 tall.
const ogTall = "html, body, .card { height: 672px !important; }";
const ogCards = {
  // Live A: object-fit cover and a flex-centred text column adapt on their own.
  // The URL line is left out; the column re-centres without it.
  "og-wordmark": "#a .url { display: none !important; }",
  // Shade and text gone; reframed so the hotbar is cropped off and the hill
  // sits near the centre. Visible part of the 2000x1250-scale screenshot:
  // x 400..2000, y 250..1090 (the hotbar starts at y 1098).
  "og-clean": `
    #a .shade, #a .text { display: none !important; }
    #a img {
      inset: auto !important;
      left: -320px !important;
      top: -200px !important;
      width: 1600px !important;
      height: 1000px !important;
      object-fit: fill !important;
    }
  `,
};

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
for (const v of ogOnly ? [] : ["a", "b", "c"]) {
  await page.goto(`${template}?v=${v}`, {
    waitUntil: "load",
  });
  await page.evaluate(() => document.fonts.ready);
  const out = join(dir, `social-preview-${v}.png`);
  await page.screenshot({ path: out });
  const kb = Math.round(statSync(out).size / 1024);
  console.log(`wrote ${out} (${kb} KB${kb > 1000 ? ", over GitHub's 1 MB limit" : ""})`);
}
await page.close();

for (const [name, css] of Object.entries(ogCards)) {
  const ogPage = await browser.newPage({
    viewport: { width: 1280, height: 672 },
    deviceScaleFactor: 2,
  });
  await ogPage.goto(`${template}?v=a`, { waitUntil: "networkidle" });
  await ogPage.evaluate(() => document.fonts.ready);
  await ogPage.addStyleTag({ content: ogTall + css });
  await ogPage.evaluate(() =>
    Promise.all([...document.images].map((img) => img.decode().catch(() => {}))),
  );
  await ogPage.waitForTimeout(250);
  const png = await ogPage.screenshot({ clip: { x: 0, y: 0, width: 1280, height: 672 } });
  const out = join(dir, `${name}.png`);
  // Downscale the 2560x1344 shot to exactly 1200x630.
  try {
    execFileSync(
      "magick",
      ["png:-", "-resize", "1200x630!", "-define", "png:exclude-chunks=date,time", out],
      {
        input: png,
      },
    );
  } catch (error) {
    if (error.code === "ENOENT")
      throw new Error("The og:image cards need ImageMagick: `magick` is not on the PATH");
    throw error;
  }
  console.log(`wrote ${out} (${Math.round(statSync(out).size / 1024)} KB)`);
  await ogPage.close();
}
await browser.close();
