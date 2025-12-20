import fs from "fs";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";

const FEED_URL =
  "https://honestproductreviewlab.blogspot.com/feeds/posts/default?alt=atom";

const SITE_URL = "https://justingerad05.github.io/reviewlab-static";
const DEFAULT_OG_IMAGE =
  "https://justingerad05.github.io/reviewlab-static/assets/og-default.jpg";

/* ---------------------------
   FETCH BLOGGER FEED
---------------------------- */
const res = await fetch(FEED_URL);
const xml = await res.text();

const parser = new XMLParser({ ignoreAttributes: false });
const data = parser.parse(xml);

let entries = data.feed?.entry || [];
if (!Array.isArray(entries)) entries = [entries];

/* ---------------------------
   CLEAN BUILD
---------------------------- */
fs.rmSync("posts", { recursive: true, force: true });
fs.mkdirSync("posts", { recursive: true });

const posts = [];

/* ---------------------------
   HELPERS
---------------------------- */
function extractCleanTitle(html) {
  const text = html.replace(/<[^>]+>/g, "").trim();
  let line = text.split("\n")[0].trim();

  const stops = ["🔥", "📺", "🎁", "👉", "Welcome"];
  for (const s of stops) {
    if (line.includes(s)) {
      line = line.split(s)[0].trim();
    }
  }

  return line.length > 10 ? line : "ReviewLab Article";
}

function extractDescription(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

/* ---------------------------
   PROCESS POSTS
---------------------------- */
entries.forEach((entry, i) => {
  const html = entry.content?.["#text"];
  if (!html) return;

  const title = extractCleanTitle(html);
  const description = extractDescription(html);
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

<!-- OpenGraph -->
<meta property="og:type" content="article">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${DEFAULT_OG_IMAGE}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${DEFAULT_OG_IMAGE}">

<!-- Schema -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "${title}",
  "datePublished": "${date}",
  "mainEntityOfPage": {
    "@id": "${url}"
  },
  "image": "${DEFAULT_OG_IMAGE}",
  "publisher": {
    "@type": "Organization",
    "name": "ReviewLab"
  }
}
</script>

</head>
<body>
${html}
</body>
</html>`;

  fs.writeFileSync(`${dir}/index.html`, page);

  posts.push({ title, url, date });
});

/* ---------------------------
   WRITE DATA FOR ELEVENTY
---------------------------- */
fs.mkdirSync("_data", { recursive: true });
fs.writeFileSync("_data/posts.json", JSON.stringify(posts, null, 2));
