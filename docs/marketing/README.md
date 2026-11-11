# Marketing assets

Screenshots and GitHub social preview cards. Every screenshot is a capture of the real production build; nothing is mocked or painted over. [`manifest.json`](manifest.json) lists sizes and SHA-256 hashes.

Regenerate everything with:

```sh
pnpm build
pnpm marketing:screenshots
```

`scripts/marketing/capture-screenshots.mjs` serves `public/` on a random free port, plays the game in headless Chromium and writes the JPEGs. Headless Chromium refuses a real pointer lock, so the script stands in for the Pointer Lock API; the game code is unchanged. The stats.js FPS meter is hidden in the shots. The terrain is the same on every run, but trees and ores are random, so new captures differ in detail. `scripts/marketing/render-social-preview.mjs` then renders the cards from `social-preview/template.html`. Playwright is not a project dependency; see the comment at the top of each script.

The two og:image cards (1200×630, the Open Graph size) come from the same script and also need ImageMagick (`magick`). To rebuild only them, without touching the GitHub cards:

```sh
node scripts/marketing/render-social-preview.mjs --og
```

| File | Purpose | Pixels | How it was made | Date |
| --- | --- | --- | --- | --- |
| [`screenshots/world.jpg`](screenshots/world.jpg) | README hero | 3200×2000 | The world from the spawn point | 2026-11-06 |
| [`screenshots/hills.jpg`](screenshots/hills.jpg) | Second world view | 3200×2000 | Same spot, turned towards the hills | 2026-11-06 |
| [`screenshots/mining-before.jpg`](screenshots/mining-before.jpg) | Mining pair, before | 3200×2000 | Gravity on, landed, looking down a slope | 2026-11-06 |
| [`screenshots/mining.jpg`](screenshots/mining.jpg) | Mining pair, after | 3200×2000 | Four left clicks later | 2026-11-06 |
| [`screenshots/menu.jpg`](screenshots/menu.jpg) | Start menu | 3200×2000 | The menu once the world is ready | 2026-11-06 |
| [`social-preview/social-preview-a.png`](social-preview/social-preview-a.png) | Social preview A, screenshot-led | 1280×640 | `template.html?v=a` with `world.jpg` | 2026-11-06 |
| [`social-preview/social-preview-b.png`](social-preview/social-preview-b.png) | Social preview B, typographic | 1280×640 | `template.html?v=b` with the game's block icons from `public/assets/` | 2026-11-06 |
| [`social-preview/social-preview-c.png`](social-preview/social-preview-c.png) | Social preview C, dark, mining pair | 1280×640 | `template.html?v=c` | 2026-11-06 |
| [`social-preview/og-wordmark.png`](social-preview/og-wordmark.png) | og:image, with wordmark; served as `public/og-card.jpg` | 1200×630 | `template.html?v=a` without the URL line, laid out at 1280×672, shot at 2×, scaled with ImageMagick | 2026-11-12 |
| [`social-preview/og-clean.png`](social-preview/og-clean.png) | og:image, no text | 1200×630 | `template.html?v=a` without shade or text, `world.jpg` reframed so the hotbar is cropped off | 2026-11-11 |
| [`social-preview/template.html`](social-preview/template.html) | Source of the cards | – | HTML/CSS, Helvetica Neue / Arial, colours from the earlier drawn og:image and the page's theme colour | 2026-11-06 |

The social preview is uploaded by hand in the repository settings (Settings → Social preview).

The site's og:image, `public/og-card.jpg`, is `og-wordmark.png` as JPEG: `magick docs/marketing/social-preview/og-wordmark.png -strip -sampling-factor 4:4:4 -interlace JPEG -quality 88 public/og-card.jpg`.
