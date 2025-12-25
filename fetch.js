import fs from "fs";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";

const FEED_URL =
  "https://honestproductreviewlab.blogspot.com/feeds/posts/default?alt=atom";

const SITE_URL = "https://justingerad05.github.io/reviewlab-static";

/* CTA images with baked-in text (Meta-safe) */
const CTA_IMAGES = [
  `${SITE_URL}/og/og-cta-review.jpg`,
  `${SITE_URL}/og/og-cta-tested.jpg`,
  `${SITE_URL}/og/og-cta-verdict.jpg`,
  `${SITE_URL}/og/og-cta-analysis.jpg`,
  `${SITE_URL}/og/og-cta-features.jpg`,
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

/* ---- PREFIX + EXACT 55 CHAR TITLE (HARD GUARANTEE) ---- */
function buildExact55Title(text, index) {
  let base = strip(text)
    .replace(/[-–|].*$/, "")
    .replace(/\s+/g, " ")
    .trim();

  const prefixes = [
    "Review:",
    "Tested:",
    "Explained:",
    "Analysis:",
    "Hands-On:",
  ];

  if (base.length < 55) {
    const prefix = prefixes[index % prefixes.length];
    base = `${prefix} ${base}`;
  }

  if (base.length > 55) base = base.slice(0, 55);
  while (base.length < 55) base += " ";

  return base;
}

/* ---- TITLE FROM HTML ONLY ---- */
function extractTitle(html, index) {
  const h1 = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
  if (h1) return buildExact55Title(h1[1], index);
  return buildExact55Title(strip(html).split(".")[0], index);
}

/* ---- DESCRIPTION ---- */
function extractDescription(html) {
  return strip(html).slice(0, 160);
}

/* ================= BUILD POSTS ================= */

for (let i = 0; i < entries.length; i++) {
  const entry = entries[i];
  const html = entry.content?.["#text"];
  if (!html) continue;

  const title = extractTitle(html, i);
  const description = extractDescription(html);

  /* IMPORTANT: OG image is ALWAYS CTA */
  const ogImage = CTA_IMAGES[i % CTA_IMAGES.length];

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
<meta property="og:image" content="${ogImage}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${ogImage}">
</head>
<body>
${html}
</body>
</html>`;

  fs.writeFileSync(`${dir}/index.html`, page);
  posts.push({ title, url, description });
}

fs.mkdirSync("_data", { recursive: true });
fs.writeFileSync("_data/posts.json", JSON.stringify(posts, null, 2));
