import fs from "fs";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";

/* ================= CONFIG ================= */

const FEED_URL =
  "https://honestproductreviewlab.blogspot.com/feeds/posts/default?alt=atom";

const SITE_URL = "https://justingerad05.github.io/reviewlab-static";
const FALLBACK_IMAGE = `${SITE_URL}/og-default.jpg`;

const TITLE_SUFFIXES = [
  " – In-Depth Review and Final Verdict",
  " – Complete Features Analysis and Verdict",
  " – Full Breakdown, Pros, Cons, and Verdict",
  " – Detailed Review With Honest Final Verdict",
  " – Complete Product Analysis and Verdict",
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

const parser = new XMLParser({ ignoreAttributes: false });
const res = await fetch(FEED_URL);
const xml = await res.text();
const data = parser.parse(xml);

let entries = data.feed?.entry || [];
if (!Array.isArray(entries)) entries = [entries];

fs.rmSync("posts", { recursive: true, force: true });
fs.mkdirSync("posts", { recursive: true });

function strip(html) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function stableHash(str) {
  let h = 0;
  for (let c of str) h = (h << 5) - h + c.charCodeAt(0);
  return Math.abs(h);
}

function buildTitle(html) {
  const core = strip(html).replace(/[-–|].*$/, "").trim();
  const suffix = TITLE_SUFFIXES[stableHash(core) % TITLE_SUFFIXES.length];
  return (core + suffix).slice(0, 60);
}

function rotateTags(html, i) {
  return TAG_POOL.slice(i, i + 4);
}

function extractImage(html) {
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : FALLBACK_IMAGE;
}

for (let i = 0; i < entries.length; i++) {
  const html = entries[i].content?.["#text"];
  if (!html) continue;

  const title = buildTitle(html);
  const desc = strip(html).slice(0, 160);
  const tags = rotateTags(html, i);
  const image = extractImage(html);

  const slug = `post-${i + 1}`;
  const dir = `posts/${slug}`;
  fs.mkdirSync(dir, { recursive: true });

  const url = `${SITE_URL}/posts/${slug}/`;

  const page = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<meta name="description" content="${desc}">
<link rel="canonical" href="${url}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:image" content="${image}">
</head>
<body>

${html}

<section>
  <h3>Get Honest AI Tool Reviews</h3>
  <form action="https://honest-product-review-lab.justingerad05.workers.dev/api/subscribe" method="POST">
    <input type="email" name="email" required>
    <button type="submit">Subscribe</button>
  </form>
</section>

</body>
</html>`;

  fs.writeFileSync(`${dir}/index.html`, page);
}
