// fetch.js
import fs from "fs";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";
import { generateOG } from "./generate-og.js";

/* ================= CONFIG ================= */
const FEED_URL =
  "https://honestproductreviewlab.blogspot.com/feeds/posts/default?alt=atom";
const SITE_URL = "https://justingerad05.github.io/reviewlab-static";
const FALLBACK_IMAGE = `${SITE_URL}/og-default.jpg`;

/* ================= CLEAN FOLDERS ================= */
fs.rmSync("posts", { recursive: true, force: true });
fs.rmSync("_data", { recursive: true, force: true });

fs.mkdirSync("posts", { recursive: true });
fs.mkdirSync("_data", { recursive: true });
fs.mkdirSync("og-images", { recursive: true });

/* ================= PARSE FEED ================= */
const parser = new XMLParser({ ignoreAttributes: false });
const xml = await (await fetch(FEED_URL)).text();
const data = parser.parse(xml);

let entries = data.feed.entry || [];
if (!Array.isArray(entries)) entries = [entries];

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

function buildTitle(html) {
  let core = strip(html).replace(/[-–|].*$/, "").trim();
  if (core.length >= 60) return core.slice(0, 60);
  return core;
}

function buildDescription(html) {
  return strip(html).slice(0, 160);
}

function extractYouTubeId(html) {
  const m = html.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
  return m ? m[1] : null;
}

function extractThumbnail(html) {
  // Check YouTube
  const yt = extractYouTubeId(html);
  if (yt) return `https://img.youtube.com/vi/${yt}/hqdefault.jpg`;

  // Check first <img>
  const src =
    html.match(/<img[^>]+src=["']([^"']+)["']/i) ||
    html.match(/<img[^>]+data-src=["']([^"']+)["']/i) ||
    html.match(/<img[^>]+srcset=["']([^"'\s,]+)/i);

  return src ? src[1] : null;
}

function relatedPosts(currentSlug) {
  return posts
    .filter((p) => p.slug !== currentSlug)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 4)
    .map((p) => `<li><a href="${p.url}">${p.title}</a></li>`)
    .join("");
}

/* ================= BUILD POSTS ================= */
for (const entry of entries) {
  const html = entry.content?.["#text"];
  if (!html) continue;

  const title = buildTitle(html);
  const description = buildDescription(html);
  const thumbnail = extractThumbnail(html);

  // Slug for URL & OG
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const dir = `posts/${slug}`;
  fs.mkdirSync(dir, { recursive: true });
  const url = `${SITE_URL}/posts/${slug}/`;

  // Generate OG image using Elite OG system
  const ogImage = await generateOG(slug, title, thumbnail);

  // Related posts HTML
  const relatedHTML = relatedPosts(slug);

  // Schema JSON-LD
  const schema = {
    "@context": "https://schema.org",
    "@type": "Review",
    itemReviewed: {
      "@type": "SoftwareApplication",
      name: title,
    },
    author: {
      "@type": "Organization",
      name: "ReviewLab",
    },
    reviewRating: {
      "@type": "Rating",
      ratingValue: "4.8",
      bestRating: "5",
    },
  };

  // Build HTML page
  const page = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${title}</title>

<meta name="description" content="${description}">
<link rel="canonical" href="${url}">

<!-- Open Graph -->
<meta property="og:type" content="article">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${ogImage}">
<meta property="og:image:secure_url" content="${ogImage}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${ogImage}">

<script type="application/ld+json">
${JSON.stringify(schema)}
</script>

</head>
<body>

<h1>${title}</h1>
${html}

<section>
<h3>Related Posts</h3>
<ul>
${relatedHTML || "<li>No related posts yet</li>"}
</ul>
</section>

</body>
</html>
`;

  fs.writeFileSync(`${dir}/index.html`, page);

  // Save post for later related posts
  posts.push({
    title,
    url,
    date: entry.published || new Date().toISOString(),
    slug,
    thumbnail: thumbnail || FALLBACK_IMAGE,
  });
}

/* ================= SAVE POSTS DATA FOR ELEVENTY ================= */
fs.writeFileSync("_data/posts.json", JSON.stringify(posts, null, 2));

console.log("✅ POSTS BUILT WITH ELITE OG SYSTEM");
