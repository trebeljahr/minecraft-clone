// Captures the README / marketing screenshots from a real production build.
//
//   pnpm build
//   node scripts/marketing/capture-screenshots.mjs
//
// Serves public/ on a random free high port, drives the game in headless
// Chromium and writes JPEGs to docs/marketing/screenshots/. Playwright is not a
// project dependency: the script uses a local install if there is one, else the
// global one (`npm i -g playwright && npx playwright install chromium`).
//
// Headless Chromium cannot take a real pointer lock, so the script stands in
// for the Pointer Lock API (the game itself is unchanged). The stats.js FPS
// overlay is hidden in the shots. On macOS the GPU renders through ANGLE/Metal.
// Elsewhere set GL=swiftshader (slow but works without a GPU).

import { execSync } from "node:child_process";
import { createReadStream, existsSync, mkdirSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(import.meta.url), "../../..");
const publicDir = join(root, "public");
const outDir = join(root, "docs/marketing/screenshots");
mkdirSync(outDir, { recursive: true });

if (!existsSync(join(publicDir, "dist"))) {
  console.error("public/dist is missing. Run `pnpm build` first.");
  process.exit(1);
}

// PLAYWRIGHT_MODULE may point at a playwright package directory.
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

const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".ico": "image/x-icon",
};

const server = createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = normalize(join(publicDir, urlPath));
  if (!file.startsWith(publicDir)) return res.writeHead(403).end();
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!existsSync(file)) return res.writeHead(404).end();
  res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(res);
});

async function listenOnFreePort() {
  for (let attempt = 0; attempt < 3; attempt++) {
    const port = 49152 + Math.floor(Math.random() * 16000);
    const ok = await new Promise((done) => {
      server.once("error", () => done(false));
      server.listen(port, "127.0.0.1", () => done(true));
    });
    if (ok) return port;
  }
  throw new Error("No free port after three tries");
}

const port = await listenOnFreePort();
const { chromium } = await loadPlaywright();
const gl = process.env.GL ?? (process.platform === "darwin" ? "metal" : "swiftshader");
const glArgs =
  gl === "metal"
    ? ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"]
    : ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"];
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: [...glArgs, "--mute-audio"],
});

const page = await browser.newPage({
  viewport: { width: 1600, height: 1000 },
  deviceScaleFactor: 2,
});

// Stand-in for the Pointer Lock API, which headless Chromium refuses.
await page.addInitScript(() => {
  let locked = null;
  const notify = () => setTimeout(() => document.dispatchEvent(new Event("pointerlockchange")), 0);
  Object.defineProperty(Document.prototype, "pointerLockElement", {
    configurable: true,
    get: () => locked,
  });
  Element.prototype.requestPointerLock = function () {
    locked = this;
    notify();
    return Promise.resolve();
  };
  Document.prototype.exitPointerLock = () => {
    locked = null;
    notify();
  };
  window.__look = (dx, dy) =>
    document.dispatchEvent(new MouseEvent("mousemove", { movementX: dx, movementY: dy }));
});

const look = async (dx, dy, steps = 10) => {
  for (let i = 0; i < steps; i++)
    await page.evaluate(([x, y]) => window.__look(x, y), [dx / steps, dy / steps]);
};
const shot = async (name) => {
  const path = join(outDir, `${name}.jpg`);
  await page.screenshot({ path, type: "jpeg", quality: 80 });
  console.log("wrote", path);
};

await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "load" });
await page.waitForFunction(() => !document.getElementById("playButton").disabled, null, {
  timeout: 120_000,
});
await page.waitForTimeout(1000);
await shot("menu");

await page.click("#playButton");
// The stats.js FPS meter is a fixed-position canvas wrapper appended to <body>.
await page.addStyleTag({
  content:
    'body > div[style*="position: fixed"][style*="cursor: pointer"] { display: none !important; }',
});
await page.waitForTimeout(3000);

// 1. The world from the spawn point (gravity is off at spawn, so the player hovers).
await look(400, 120);
await page.waitForTimeout(2000);
await shot("world");

// 2. The same spot, turned towards the hills.
await look(1200, 0);
await page.waitForTimeout(2000);
await shot("hills");

// 3. Mining: J turns gravity on, the player lands, then four left clicks
//    break the blocks under the crosshair.
await page.keyboard.press("j");
await page.waitForTimeout(6000);
await look(0, 200);
await page.waitForTimeout(1000);
await shot("mining-before");
for (let i = 0; i < 4; i++) {
  await page.mouse.click(800, 500);
  await page.waitForTimeout(600);
}
await page.waitForTimeout(1000);
await shot("mining");

await browser.close();
server.close();
