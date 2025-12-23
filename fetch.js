import fs from "fs";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";

const FEED_URL =
  "https://honestproductreviewlab.blogspot.com/feeds/posts/default?alt=atom";

const SITE_URL = "https://justingerad05.github.io/reviewlab-static";
const FALLBACK_IMAGE = `${SITE_URL}/og-default.jpg`;

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

function normalizeTitle(title) {
  if (title.length >= 50) return title.slice(0, 70);
  return `${title} – Full Review, Features, Pros & Verdict`.slice(0, 70);
}

function extractTitle(html) {
  const h1 = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
  if (h1) return normalizeTitle(strip(h1[1]));

  const strong = html.match(/<strong[^>]*>(.*?)<\/strong>/i);
  if (strong) return normalizeTitle(strip(strong[1]));

  const text = strip(html);
  const sentence = text.split(".")[0];
  return normalizeTitle(sentence);
}

function extractDescription(html) {
  return strip(html).slice(0, 160);
}

function extractYouTubeId(html) {
  const m = html.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

function extractImage(html) {
  const ytId = extractYouTubeId(html);
  if (ytId) {
    return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
  }

  const img = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return img ? img[1] : FALLBACK_IMAGE;
}

/* ================= BUILD POSTS ================= */

entries.forEach((entry, i) => {
  const html = entry.content?.["#text"];
  if (!html) return;

  const title = extractTitle(html);
  const description = extractDescription(html);
  const ytId = extractYouTubeId(html);
  const image = extractImage(html);
  const date = entry.published || new Date().toISOString();

  const slug = `post-${i + 1}`;
  const dir = `posts/${slug}`;
  fs.mkdirSync(dir, { recursive: true });

  const url = `${SITE_URL}/posts/${slug}/`;

  const videoMeta = ytId
    ? `
<meta property="og:video" content="https://www.youtube.com/embed/${ytId}">
<meta property="og:video:type" content="text/html">
<meta property="og:video:width" content="1280">
<meta property="og:video:height" content="720">
`
    : "";

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
${videoMeta}

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
  posts.push({ title, url, date, description });
});

fs.mkdirSync("_data", { recursive: true });
fs.writeFileSync("_data/posts.json", JSON.stringify(posts, null, 2));
