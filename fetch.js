import fs from "fs";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";

/* ================= CONFIG ================= */

const FEED_URL =
  "https://honestproductreviewlab.blogspot.com/feeds/posts/default?alt=atom";

const SITE_URL = "https://justingerad05.github.io/reviewlab-static";
const FALLBACK_IMAGE = `${SITE_URL}/og-default.jpg`;

const TAG_POOL = [
  "AI Tools",
  "Online Income",
  "Product Review",
  "Digital Business",
  "Software Review",
  "Passive Income",
  "Make Money Online",
  "Automation Tools",
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

/* ---- TEASER ---- */
function extractDescription(html) {
  return strip(html).slice(0, 160);
}

/* ---- TAG ROTATION (3–4 TAGS, STABLE) ---- */
function extractTags(text, index) {
  const tags = [];
  const lower = text.toLowerCase();

  for (const tag of TAG_POOL) {
    if (lower.includes(tag.toLowerCase().split(" ")[0])) {
      tags.push(tag);
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
  const tags = extractTags(html, i);

  const slug = `post-${i + 1}`;
  const dir = `posts/${slug}`;
  fs.mkdirSync(dir, { recursive: true });

  const url = `${SITE_URL}/posts/${slug}/`;

  const ogTags = tags
    .map((t) => `<meta property="article:tag" content="${t}">`)
    .join("\n");

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
${ogTags}

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

  posts.push({
    title,
    url,
    date,
    description,
    tags,
  });
}

fs.mkdirSync("_data", { recursive: true });
fs.writeFileSync("_data/posts.json", JSON.stringify(posts, null, 2));
