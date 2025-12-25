import fs from "fs";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";

/* ================= CONFIG ================= */

const FEED_URL =
  "https://honestproductreviewlab.blogspot.com/feeds/posts/default?alt=atom";

const SITE_URL = "https://justingerad05.github.io/reviewlab-static";

/* CTA images MUST already exist publicly */
const CTA_IMAGES = [
  `${SITE_URL}/cta-affiliate-1.jpeg`,
  `${SITE_URL}/cta-affiliate-2.jpeg`,
  `${SITE_URL}/cta-lead-1.jpeg`,
  `${SITE_URL}/cta-lead-2.jpeg`,
];

const FALLBACK_IMAGE = `${SITE_URL}/og-default.jpg`;

/* Affiliate + Lead */
const AFFILIATE_LINK = "https://example.com/affiliate-offer";
const LEAD_LINK = "https://example.com/free-guide";

/* ================= INIT ================= */

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

/* ---- EXACT 55 CHAR TITLE (LOCKED) ---- */
function buildExact55Title(text) {
  let clean = strip(text)
    .replace(/\s+/g, " ")
    .replace(/[-–|].*$/, "")
    .trim();

  const suffix = " – Full Review & Verdict";
  let base = clean + suffix;

  if (base.length > 55) base = base.slice(0, 55);
  if (base.length < 55) base = base.padEnd(55, " ");

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

/* ---- YOUTUBE ID ---- */
function extractYouTubeId(html) {
  const m = html.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
  return m ? m[1] : null;
}

/* ---- OG IMAGE PICKER (SAFE) ---- */
function pickOgImage(html, index) {
  const cta = CTA_IMAGES[index % CTA_IMAGES.length];
  const yt = extractYouTubeId(html);

  if (yt) {
    return {
      primary: cta,
      fallback: `https://img.youtube.com/vi/${yt}/hqdefault.jpg`,
    };
  }

  return {
    primary: cta,
    fallback: FALLBACK_IMAGE,
  };
}

/* ---- CTA BLOCK (AFFILIATE + LEAD) ---- */
function buildCTA() {
  return `
<hr>
<div style="padding:16px;border:1px solid #ddd;text-align:center">
  <p><strong>Recommended Action</strong></p>
  <p>
    <a href="${AFFILIATE_LINK}" target="_blank" rel="nofollow sponsored">
      👉 Check Best Price / Full Features
    </a>
  </p>
  <p>
    <a href="${LEAD_LINK}" target="_blank" rel="nofollow">
      📩 Get Free Bonus Guide
    </a>
  </p>
</div>
<hr>
`;
}

/* ================= BUILD POSTS ================= */

for (let i = 0; i < entries.length; i++) {
  const entry = entries[i];
  const html = entry.content?.["#text"];
  if (!html) continue;

  const title = extractTitle(html);
  const description = extractDescription(html);
  const images = pickOgImage(html, i);
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
<meta property="og:image" content="${images.primary}">
<meta property="og:image:secure_url" content="${images.primary}">
<meta property="og:image:alt" content="${title}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">

<link rel="preload" as="image" href="${images.fallback}">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${images.primary}">
</head>
<body>

${html}

${buildCTA()}

</body>
</html>`;

  fs.writeFileSync(`${dir}/index.html`, page);
  posts.push({ title, url, date, description });
}

/* ================= POSTS INDEX ================= */

fs.mkdirSync("_data", { recursive: true });
fs.writeFileSync("_data/posts.json", JSON.stringify(posts, null, 2));
