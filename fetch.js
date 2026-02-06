import fs from "fs";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";

/* ================= CONFIG ================= */

const FEED_URL =
  "https://honestproductreviewlab.blogspot.com/feeds/posts/default?alt=atom";

const SITE_URL = "https://justingerad05.github.io/reviewlab-static";

const FALLBACK_IMAGES = [
  `${SITE_URL}/og-cta-analysis.jpg?v=4`,
  `${SITE_URL}/og-cta-features.jpg?v=4`,
  `${SITE_URL}/og-cta-tested.jpg?v=4`,
  `${SITE_URL}/og-cta-verdict.jpg?v=4`
];

const DEFAULT_IMAGE = `${SITE_URL}/og-default.jpg?v=4`;

const SITE_NAME = "ReviewLab";
const AUTHOR_NAME = "ReviewLab Editorial";
const TWITTER = "@ReviewLab";

/* ================= FETCH ================= */

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

const strip = html =>
  html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const slugify = str =>
  str.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);

const extractTitle = entry =>
  entry.title?.["#text"]?.trim() || "Untitled Review";

const buildDescription = html =>
  strip(html).slice(0, 155);

/* ---------- TAGS (FIXED) ---------- */

function buildTags(html) {

  const pool = [
    "ai tools",
    "software review",
    "automation",
    "digital marketing",
    "online business"
  ];

  const lower = html.toLowerCase();

  const tags = pool.filter(t => lower.includes(t));

  return tags.length
    ? tags.slice(0, 4)
    : ["software reviews", "ai tools"];
}

/* ---------- IMAGE ENGINE ---------- */

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

function pickFallback(slug) {

  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = slug.charCodeAt(i) + ((hash << 5) - hash);
  }

  return FALLBACK_IMAGES[Math.abs(hash) % FALLBACK_IMAGES.length]
    || DEFAULT_IMAGE;
}

function extractImage(html, slug) {

  const yt = extractYouTubeId(html);

  if (yt)
    return `https://img.youtube.com/vi/${yt}/hqdefault.jpg`;

  const matches = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)];

  for (const m of matches) {

    const url = m[1].toLowerCase();

    if (!/(emoji|icon|logo|avatar|pixel|1x1|spacer|blank)/.test(url))
      return m[1];
  }

  return pickFallback(slug);
}

/* ================= PASS 1 ================= */

for (let entry of entries) {

  const html = entry.content?.["#text"];
  if (!html) continue;

  const title = extractTitle(entry);
  const slug = slugify(title);
  const url = `${SITE_URL}/posts/${slug}/`;

  posts.push({
    title,
    slug,
    url,
    html,
    date: entry.published || new Date().toISOString()
  });
}

/* ================= RELATED ================= */

const buildRelated = slug =>
  posts
    .filter(p => p.slug !== slug)
    .slice(0, 4)
    .map(p => `<li><a href="${p.url}">${p.title}</a></li>`)
    .join("");

/* ================= PASS 2 ================= */

for (let post of posts) {

  const { title, slug, html, url, date } = post;

  const description = buildDescription(html);
  const image = extractImage(html, slug);
  const tags = buildTags(html);

  const dir = `posts/${slug}`;
  fs.mkdirSync(dir, { recursive: true });

  /* 🔥 SITEMAP COLLECTOR */
  post.priority = "0.80";
  post.changefreq = "weekly";

  const schema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: title,
    description,
    image: [image],
    author: { "@type": "Organization", name: AUTHOR_NAME },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: DEFAULT_IMAGE }
    },
    datePublished: date,
    mainEntityOfPage: url
  };

  const page = `<!DOCTYPE html>
<html lang="en">
<head>

<meta charset="UTF-8">
<title>${title}</title>

<meta name="description" content="${description}">
<meta name="robots" content="index,follow,max-image-preview:large">

<link rel="canonical" href="${url}">

<meta property="og:type" content="article">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${image}">

<script type="application/ld+json">
${JSON.stringify(schema)}
</script>

</head>
<body>

<!-- Hidden crawler image -->
<img src="${image}" style="display:none;" alt="">

${html}

<section>
<h2>Related Reviews</h2>
<ul>${buildRelated(slug)}</ul>
</section>

</body>
</html>`;

  fs.writeFileSync(`${dir}/index.html`, page);
}

/* ================= SITEMAP ================= */

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="https://www.sitemaps.org/schemas/sitemap/0.9">

${posts.map(p => `
<url>
<loc>${p.url}</loc>
<changefreq>${p.changefreq}</changefreq>
<priority>${p.priority}</priority>
</url>`).join("")}

</urlset>`;

fs.writeFileSync("sitemap.xml", sitemap);

/* ================= POSTS DATA ================= */

fs.mkdirSync("_data", { recursive: true });

fs.writeFileSync(
  "_data/posts.json",
  JSON.stringify(posts.map(p => ({
    title: p.title,
    url: p.url,
    date: p.date
  })), null, 2)
);
