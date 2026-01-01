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

const posts = [];

/* ================= UTILITIES ================= */

function strip(html) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function stableHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/* ===== TITLE: ROTATED, NO SUFFIX, 50–60 CHARS ===== */

function buildTitle(html) {
  const base = strip(html);

  const variants = [
    base,
    base.slice(0, 55),
    base.slice(0, 52),
    base.split(".")[0],
    base.split(",")[0],
  ];

  const chosen =
    variants[stableHash(base) % variants.length] || base;

  return chosen.slice(0, 60);
}

function buildTeaser(html) {
  return strip(html).slice(0, 160);
}

function rotateTags(html, index) {
  const tags = [];
  const lower = html.toLowerCase();

  for (const t of TAG_POOL) {
    if (lower.includes(t.toLowerCase().split(" ")[0])) tags.push(t);
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
  const html = entries[i].content?.["#text"];
  if (!html) continue;

  const title = buildTitle(html);
  const description = buildTeaser(html);
  const tags = rotateTags(html, i);
  const image = await extractImage(html);
  const date = entries[i].published || new Date().toISOString();

  const slug = stableHash(html).toString(36);
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

<section class="email-capture">
  <h3>Get Honest AI Tool Reviews</h3>
  <p>No hype. No fluff. Only tools that actually work.</p>

  <form
    action="https://docs.google.com/forms/d/e/1FAIpQLSchzs0bE9se3YCR2TTiFl3Ohi0nbx0XPBjvK_dbANuI_eI1Aw/formResponse"
    method="POST"
    target="_blank"
  >
    <input type="email" name="entry.364499249" placeholder="Enter your email" required>
    <button type="submit">Get Reviews</button>
  </form>
</section>

</body>
</html>`;

  fs.writeFileSync(`${dir}/index.html`, page);
  posts.push({ title, url, date, description, tags });
}

fs.mkdirSync("_data", { recursive: true });
fs.writeFileSync("_data/posts.json", JSON.stringify(posts, null, 2));
