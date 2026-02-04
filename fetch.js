import fs from "fs";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";

/* ================= CONFIG ================= */

const FEED_URL =
  "https://honestproductreviewlab.blogspot.com/feeds/posts/default?alt=atom";

const SITE_URL = "https://justingerad05.github.io/reviewlab-static";
const FALLBACK_IMAGE = `${SITE_URL}/og-default.jpg`;

const SITE_NAME = "ReviewLab";
const AUTHOR_NAME = "ReviewLab Editorial";
const TWITTER = "@ReviewLab";

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

/* ---------- USE BLOGGER TITLE (CRITICAL FIX) ---------- */

function extractTitle(entry) {
  return entry.title?.["#text"]?.trim() || "Untitled Review";
}

/* ---------- SEO SLUG ---------- */

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

/* ---------- DESCRIPTION ---------- */

function buildDescription(html) {
  return strip(html).slice(0, 155);
}

/* ---------- TAGS ---------- */

function buildTags(html) {
  const pool = [
    "AI Tools",
    "Software Reviews",
    "Automation",
    "Online Business",
    "Digital Marketing",
  ];

  const lower = html.toLowerCase();
  return pool.filter(t =>
    lower.includes(t.toLowerCase().split(" ")[0])
  ).slice(0, 4);
}

/* ---------- YOUTUBE EXTRACTION (HARDENED) ---------- */

function extractYouTubeId(html) {
  const patterns = [
    /youtube\.com\/watch\?v=([0-9A-Za-z_-]{11})/,
    /youtu\.be\/([0-9A-Za-z_-]{11})/,
    /youtube\.com\/embed\/([0-9A-Za-z_-]{11})/
  ];

  for (const p of patterns) {
    const m = html.match(p);
    if (m) return m[1];
  }
  return null;
}

/* ---------- IMAGE ---------- */

function extractImage(html) {
  const yt = extractYouTubeId(html);
  if (yt) return `https://img.youtube.com/vi/${yt}/maxresdefault.jpg`;

  const img =
    html.match(/<img[^>]+src=["']([^"']+)["']/i);

  return img ? img[1] : FALLBACK_IMAGE;
}

/* ================= BUILD ================= */

for (let entry of entries) {

  const html = entry.content?.["#text"];
  if (!html) continue;

  const rawTitle = extractTitle(entry);
  const slug = slugify(rawTitle);

  const url = `${SITE_URL}/posts/${slug}/`;

  const description = buildDescription(html);
  const image = extractImage(html);
  const tags = buildTags(html);
  const date = entry.published || new Date().toISOString();

  const dir = `posts/${slug}`;
  fs.mkdirSync(dir, { recursive: true });

  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: rawTitle,
    description,
    image,
    author: {
      "@type": "Organization",
      name: AUTHOR_NAME
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: FALLBACK_IMAGE
      }
    },
    datePublished: date,
    mainEntityOfPage: url
  };

  const ogTags = tags
    .map(t => `<meta property="article:tag" content="${t}">`)
    .join("\n");

  const page = `<!DOCTYPE html>
<html lang="en">
<head>

<meta charset="UTF-8">
<title>${rawTitle}</title>

<meta name="description" content="${description}">
<meta name="viewport" content="width=device-width, initial-scale=1">

<link rel="canonical" href="${url}">

<meta property="og:type" content="article">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${rawTitle}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
${ogTags}

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="${TWITTER}">
<meta name="twitter:title" content="${rawTitle}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${image}">

<script type="application/ld+json">
${JSON.stringify(schema)}
</script>

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
<input
type="email"
name="entry.364499249"
placeholder="Enter your email"
required
>
<button type="submit">Get Reviews</button>
</form>
</section>

</body>
</html>`;

  fs.writeFileSync(`${dir}/index.html`, page);

  posts.push({
    title: rawTitle,
    url,
    date,
    description
  });
}

/* ---------- POSTS DATA ---------- */

fs.mkdirSync("_data", { recursive: true });
fs.writeFileSync("_data/posts.json", JSON.stringify(posts, null, 2));
