import fs from "fs";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";

const FEED_URL =
  "https://honestproductreviewlab.blogspot.com/feeds/posts/default?alt=atom";

const SITE_URL = "https://justingerad05.github.io/reviewlab-static";
const OG_IMAGE =
  "https://raw.githubusercontent.com/justingerad05/reviewlab-static/main/og-default.jpg";

const res = await fetch(FEED_URL);
const xml = await res.text();

const parser = new XMLParser({ ignoreAttributes: false });
const data = parser.parse(xml);

let entries = data.feed?.entry || [];
if (!Array.isArray(entries)) entries = [entries];

fs.rmSync("posts", { recursive: true, force: true });
fs.mkdirSync("posts", { recursive: true });

const posts = [];

function extractCleanTitle(html) {
  const text = html.replace(/<[^>]+>/g, "").trim();
  let line = text.split("\n")[0].trim();
  return line.split("🔥")[0].split("📺")[0].split("🎁")[0].trim();
}

function extractDescription(html) {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

// New function to create teaser for social platforms
function createTeaser(title, description, url) {
  // Use title + first 2 lines of description as teaser
  const teaserDescription = description.length > 150 ? description.slice(0, 150) + "…" : description;
  return `🔥 ${title}\n\n${teaserDescription}\n\nRead more: ${url}`;
}

entries.forEach((entry, i) => {
  const html = entry.content?.["#text"];
  if (!html) return;

  const title = extractCleanTitle(html);
  const description = extractDescription(html);
  const teaser = createTeaser(title, description, `${SITE_URL}/posts/post-${i + 1}/`);
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
<meta property="og:image" content="${OG_IMAGE}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${OG_IMAGE}">

<!-- Custom meta for social automation -->
<meta name="teaser" content="${teaser}">
</head>
<body>
${html}
</body>
</html>`;

  fs.writeFileSync(`${dir}/index.html`, page);
  posts.push({ title, url, date, teaser });
});

// Save posts JSON for Cloudflare Worker or other automation
fs.mkdirSync("_data", { recursive: true });
fs.writeFileSync("_data/posts.json", JSON.stringify(posts, null, 2));
