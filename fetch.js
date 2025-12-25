import fs from "fs";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";

const FEED_URL =
  "https://honestproductreviewlab.blogspot.com/feeds/posts/default?alt=atom";

const SITE_URL = "https://justingerad05.github.io/reviewlab-static";
const FALLBACK_IMAGE = `${SITE_URL}/og-default.jpg`;

/* CTA images (already uploaded by you) */
const CTA_IMAGES = [
  "/og-cta-review.jpg",
  "/og-cta-tested.jpg",
  "/og-cta-verdict.jpg",
  "/og-cta-analysis.jpg",
  "/og-cta-features.jpg",
];

const parser = new XMLParser({ ignoreAttributes: false });

const res = await fetch(FEED_URL);
const xml = await res.text();
const data = parser.parse(xml);

let entries = data.feed?.entry || [];
if (!Array.isArray(entries)) entries = [entries];

fs.rmSync("posts", { recursive: true, force: true });
fs.mkdirSync("posts", { recursive: true });

const posts = [];

/* ================= UTILITIES ================= */

function strip(html) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/* ---- EXACT 55 CHAR TITLE (HARD GUARANTEE) ---- */
function buildExact55Title(text) {
  let clean = strip(text)
    .replace(/\s+/g, " ")
    .replace(/[-–|].*$/, "")
    .trim();

  const suffix = " – Full Review & Verdict";
  let base = clean;

  if ((base + suffix).length < 55) {
    base = (base + suffix).slice(0, 55);
  }

  if (base.length > 55) {
    base = base.slice(0, 55);
  }

  if (base.length < 55) {
    base = base.padEnd(55, " ");
  }

  return base.trim();
}

/* ---- TITLE FROM HTML ONLY ---- */
function extractTitle(html) {
  const h1 = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
  if (h1) return buildExact55Title(h1[1]);
  return buildExact55Title(strip(html).split(".")[0]);
}

/* ---- DESCRIPTION ---- */
function extractDescription(html) {
  return strip(html).slice(0, 160);
}

/* ---- IMAGE ---- */
function extractYouTubeId(html) {
  const m = html.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
  return m ? m[1] : null;
}

async function extractImage(html) {
  const id = extractYouTubeId(html);
  if (id) return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;

  const img = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return img ? img[1] : FALLBACK_IMAGE;
}

/* ================= BUILD POSTS ================= */

for (let i = 0; i < entries.length; i++) {
  const entry = entries[i];
  const html = entry.content?.["#text"];
  if (!html) continue;

  const title = extractTitle(html);
  const description = extractDescription(html);
  const image = await extractImage(html);
  const date = entry.published || new Date().toISOString();

  const slug = `post-${i + 1}`;
  const dir = `posts/${slug}`;
  fs.mkdirSync(dir, { recursive: true });

  const url = `${SITE_URL}/posts/${slug}/`;

  /* Per-post CTA rotation index */
  const startIndex = i % CTA_IMAGES.length;

  const ctaHtml = `
<style>
.cta-rotator {
  position: relative;
  width: 100%;
  aspect-ratio: 1200 / 630;
  overflow: hidden;
  margin-bottom: 20px;
}
.cta-rotator img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  animation: ctaRotate 25s infinite;
}
${CTA_IMAGES.map(
  (_, idx) =>
    `.cta-rotator img:nth-child(${idx + 1}){animation-delay:${idx * 5}s}`
).join("\n")}
@keyframes ctaRotate {
  0%{opacity:0}
  5%{opacity:1}
  20%{opacity:1}
  25%{opacity:0}
}
</style>

<div class="cta-rotator">
${CTA_IMAGES.map(
  (img, idx) =>
    `<img src="${img}" alt="CTA ${idx + 1}">`
).join("\n")}
</div>
`;

  const page = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${title}</title>

<meta name="description" content="${description}">
<link rel="canonical" href="${url}">
<meta name="viewport" content="width=device-width, initial-scale=1">

<meta property="og:type" content="article">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${image}">
</head>
<body>

${ctaHtml}
${html}

</body>
</html>`;

  fs.writeFileSync(`${dir}/index.html`, page);
  posts.push({ title, url, date, description });
}

fs.mkdirSync("_data", { recursive: true });
fs.writeFileSync("_data/posts.json", JSON.stringify(posts, null, 2));
