import fs from "fs";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";

/* ================= CONFIG ================= */

const FEED_URL =
  "https://honestproductreviewlab.blogspot.com/feeds/posts/default?alt=atom";

const SITE_URL = "https://justingerad05.github.io/reviewlab-static";

/* 🔒 PERMANENT CTA OG IMAGES (ROOT LEVEL) */
const CTA_IMAGES = [
  "https://raw.githubusercontent.com/justingerad05/reviewlab-static/main/cta-1.jpg",
  "https://raw.githubusercontent.com/justingerad05/reviewlab-static/main/cta-2.jpg",
  "https://raw.githubusercontent.com/justingerad05/reviewlab-static/main/cta-3.jpg",
  "https://raw.githubusercontent.com/justingerad05/reviewlab-static/main/cta-4.jpg",
  "https://raw.githubusercontent.com/justingerad05/reviewlab-static/main/cta-5.jpg"
];

/* ========================================== */

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

/* ---- EXACT 55 CHARACTER TITLE ---- */
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

  if (base.length > 55) base = base.slice(0, 55);
  if (base.length < 55) base = base.padEnd(55, " ");

  return base.trim();
}

/* ---- TITLE FROM HTML ---- */
function extractTitle(html) {
  const h1 = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
  if (h1) return buildExact55Title(h1[1]);
  return buildExact55Title(strip(html).split(".")[0]);
}

/* ---- DESCRIPTION ---- */
function extractDescription(html) {
  return strip(html).slice(0, 160);
}

/* ---- PERMANENT CTA IMAGE SELECTION ---- */
function selectCtaImage(index) {
  return CTA_IMAGES[index % CTA_IMAGES.length];
}

/* ================= BUILD POSTS ================= */

for (let i = 0; i < entries.length; i++) {
  const entry = entries[i];
  const html = entry.content?.["#text"];
  if (!html) continue;

  const title = extractTitle(html);
  const description = extractDescription(html);
  const image = selectCtaImage(i);
  const date = entry.published || new Date().toISOString();

  const slug = `post-${i + 1}`;
  const dir = `posts/${slug}`;
  fs.mkdirSync(dir, { recursive: true });

  const url = `${SITE_URL}/posts/${slug}/`;

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
<meta property="og:image:secure_url" content="${image}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Read the full review and verdict">

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
    description
  });
}

/* ================= INDEX DATA ================= */

fs.mkdirSync("_data", { recursive: true });
fs.writeFileSync("_data/posts.json", JSON.stringify(posts, null, 2));
