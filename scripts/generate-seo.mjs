import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const seo = {
  siteUrl: "https://mc.trebeljahr.com",
  outputDir: path.resolve(__dirname, "../public"),
  routes: [
    { path: "/", changefreq: "monthly", priority: "1.0" },
    { path: "/imprint", changefreq: "yearly", priority: "0.3" },
    { path: "/privacy", changefreq: "yearly", priority: "0.3" },
  ],
  lastmod: (process.env.SITEMAP_LASTMOD || new Date().toISOString()).slice(0, 10),
  description:
    "Explore, mine, and build in a browser-based voxel sandbox with procedural terrain, block placement, inventory, and Three.js rendering.",
};

const escapeXml = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const joinUrl = (base, urlPath) => {
  const cleanBase = base.replace(/\/$/, "");
  const cleanPath = urlPath === "/" ? "/" : `/${urlPath.replace(/^\/+/, "")}`;
  return `${cleanBase}${cleanPath}`;
};

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${seo.routes
  .map(
    (route) => `  <url>
    <loc>${escapeXml(joinUrl(seo.siteUrl, route.path))}</loc>
    <lastmod>${seo.lastmod}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>
`;

const robots = `User-agent: *
Allow: /

Sitemap: ${joinUrl(seo.siteUrl, "/sitemap.xml")}
`;

await mkdir(seo.outputDir, { recursive: true });
await Promise.all([
  writeFile(path.join(seo.outputDir, "sitemap.xml"), sitemap),
  writeFile(path.join(seo.outputDir, "robots.txt"), robots),
]);
