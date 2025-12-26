import fs from "fs";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";

/* ================= CONFIG ================= */

const FEED_URL =
  "https://honestproductreviewlab.blogspot.com/feeds/posts/default?alt=atom";

const SITE_URL = "https://justingerad05.github.io/reviewlab-static";
const FALLBACK_IMAGE = `${SITE_URL}/og-default.jpg`;

const TITLE_SUFFIXES = [
  "– Honest Review",
  "– Full Review & Verdict",
  "– Features, Pros & Cons",
  "– Is It Worth It?",
  "– Complete Breakdown",
];

const TAG_POOL = [
  "AI Tools",
  "Online Income",
  "Product Review",
  "Digital Business",
  "Software Review",
  "Automation Tools",
  "Make Money Online",
];

/* ================= SETUP ================= */

const parser = new XMLParser({ ignoreAttributes: false });
const res = await fetch(FEED_URL);
const xml = await res.text();
const data = parser.parse(xml);

let entries = data.feed?.entry || [];
if (!Array.isArray(entries)) entries = [entries];

fs.rmSync("posts", { recursive: true, force: true });
fs.mkdirSync("posts", { recursive: true });

/* ================= UTILITIES ================= */

function strip(html) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/* ---------- TITLE (NO PREFIX, ROTATING SUFFIX) ---------- */
function buildTitle(html, index) {
  const core = strip(html)
    .replace(/[-–|].*$/, "")
    .slice(0, 55)
    .trim();

  const suffix = TITLE_SUFFIXES[index % TITLE_SUFFIXES.length];
  return `${core} ${suffix}`.slice(0, 70).trim();
}

/* ---------- TEASER ---------- */
function buildTeaser(html) {
  return strip(html).slice(0, 160);
}

/* ---------- TAG ROTATION ---------- */
function rotateTags(html, index) {
  const tags = [];
  const lower = html.toLowerCase();

  for (const t of TAG_POOL) {
    if (lower.includes(t.toLowerCase().split(" ")[0])) {
      tags.push(t);
    }
  }

  if (tags.length < 3) {
    const start = index % TAG_POOL.length;
    for (let i = 0; i < TAG_POOL.length && tags.length < 4; i++) {
      const t = TAG_POOL[(start + i) % TAG_POOL.length];
      if (!tags.includes(t)) tags.push(t);
    }
  }

  return tags.slice(0, 4);
}

/* ---------- IMAGE EXTRACTION (SAFE & PRIORITIZED) ---------- */

function extractYouTubeId(html) {
  const match = html.match(
    /(?:youtube\.com\/.*v=|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

function extractFirstImage(html) {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

function extractOgImage(html) {
  const ytId = extractYouTubeId(html);
  if (ytId) {
    return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
  }

  const firstImg = extractFirstImage(html);
  if (firstImg) return firstImg;

  return FALLBACK_IMAGE;
}

/* ================= BUILD POSTS ================= */

for (let i = 0; i < entries.length; i++) {
  const html = entries[i].content?.["#text"];
  if (!html) continue;

  const title = buildTitle(html, i);
  const description = buildTeaser(html);
  const tags = rotateTags(html, i);
  const image = extractOgImage(html);

  const slug = `post-${i + 1}`;
  const dir = `posts/${slug}`;
  fs.mkdirSync(dir, { recursive: true });

  const url = `${SITE_URL}/posts/${slug}/`;

  const ogTags = tags
    .map(t => `<meta property="article:tag" content="${t}">`)
    .join("\n");

  const page = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">

<title>${title}</title>
<meta name="description" content="${description}">
<link rel="canonical" href="${url}">
<meta name="viewport" content="width=device-width, initial-scale=1">

<!-- OPEN GRAPH -->
<meta property="og:type" content="article">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">

${ogTags}

<!-- TWITTER -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${image}">
</head>

<body>
${html}
</body>
</html>`;

  fs.writeFileSync(`${dir}/index.html`, page);
}
