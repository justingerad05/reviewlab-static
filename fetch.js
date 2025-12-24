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

/* ---- EXACT 55 CHAR TITLE (FROM CONTENT ONLY) ---- */
function buildExactTitle(html) {
  const clean = strip(html);
  const words = clean.split(" ");

  let title = "";
  for (let w of words) {
    if ((title + " " + w).trim().length > 55) break;
    title = (title + " " + w).trim();
  }

  // pad using remaining description words if short
  let i = words.length;
  while (title.length < 55 && i < clean.split(" ").length) {
    title += " " + clean.split(" ")[i++];
    title = title.trim();
  }

  // final hard trim to EXACT 55
  if (title.length > 55) {
    title = title.slice(0, 55).replace(/\s+\S*$/, "").trim();
  }

  // enforce exact length by padding with next words
  let cursor = title.length;
  let descWords = clean.split(" ");
  let idx = 0;
  while (title.length < 55 && idx < descWords.length) {
    if (!title.includes(descWords[idx])) {
      title += " " + descWords[idx];
      title = title.trim();
    }
    idx++;
  }

  return title.slice(0, 55);
}

function extractTitle(html) {
  const h1 = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
  if (h1) return buildExactTitle(h1[1] + " " + html);

  const strong = html.match(/<strong[^>]*>(.*?)<\/strong>/i);
  if (strong) return buildExactTitle(strong[1] + " " + html);

  return buildExactTitle(html);
}

function extractDescription(html) {
  return strip(html).slice(0, 160);
}

/* --------- YOUTUBE EXTRACTION --------- */
function extractYouTubeId(html) {
  const patterns = [
    /youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})/,
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) return m[1];
  }
  return null;
}

async function resolveYouTubeThumbnail(id) {
  const max = `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
  const test = await fetch(max, { method: "HEAD" });
  return test.ok
    ? max
    : `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

async function extractImage(html) {
  const ytId = extractYouTubeId(html);
  if (ytId) return await resolveYouTubeThumbnail(ytId);

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
${html}
</body>
</html>`;

  fs.writeFileSync(`${dir}/index.html`, page);
  posts.push({ title, url, date, description });
}

fs.mkdirSync("_data", { recursive: true });
fs.writeFileSync("_data/posts.json", JSON.stringify(posts, null, 2));
