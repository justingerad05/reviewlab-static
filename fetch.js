import fs from "fs";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";

/* ================= CONFIG ================= */

const FEED_URL =
  "https://honestproductreviewlab.blogspot.com/feeds/posts/default?alt=atom";

const SITE_URL = "https://justingerad05.github.io/reviewlab-static";

const FALLBACK_IMAGES = [
  `${SITE_URL}/og-cta-analysis.jpg`,
  `${SITE_URL}/og-cta-features.jpg`,
  `${SITE_URL}/og-cta-tested.jpg`,
  `${SITE_URL}/og-cta-verdict.jpg`
];

const DEFAULT_IMAGE = `${SITE_URL}/og-default.jpg`;

const SITE_NAME = "ReviewLab";
const AUTHOR_NAME = "ReviewLab Editorial";

/* ================= FETCH ================= */

const parser = new XMLParser({ ignoreAttributes: false });
const res = await fetch(FEED_URL);
const xml = await res.text();
const data = parser.parse(xml);

let entries = data.feed?.entry || [];
if (!Array.isArray(entries)) entries = [entries];

/* CLEAN BUILD */

fs.rmSync("posts", { recursive: true, force: true });
fs.rmSync("tags", { recursive: true, force: true });

fs.mkdirSync("posts", { recursive: true });
fs.mkdirSync("tags", { recursive: true });

const posts = [];
const tagMap = {};

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

/* IMAGE ENGINE */

function extractYouTubeId(html) {
  const m = html.match(/(?:v=|youtu\.be\/)([0-9A-Za-z_-]{11})/);
  return m ? m[1] : null;
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
  if (yt) return `https://img.youtube.com/vi/${yt}/maxresdefault.jpg`;

  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);

  return match ? match[1] : pickFallback(slug);
}

/* TAG ENGINE */

function buildTags(html) {

  const pool = [
    "ai tools",
    "automation",
    "software review",
    "digital marketing",
    "online business"
  ];

  const lower = html.toLowerCase();

  const tags = pool.filter(t => lower.includes(t));

  return tags.length ? tags : ["ai tools"];
}

/* ================= PASS 1 ================= */

for (let entry of entries) {

  const html = entry.content?.["#text"];
  if (!html) continue;

  const title = extractTitle(entry);
  const slug = slugify(title);
  const url = `${SITE_URL}/posts/${slug}/`;
  const tags = buildTags(html);

  tags.forEach(tag => {
    const t = slugify(tag);
    if (!tagMap[t]) tagMap[t] = [];
    tagMap[t].push({ title, url });
  });

  posts.push({
    title,
    slug,
    url,
    html,
    tags,
    date: entry.published || new Date().toISOString()
  });
}

/* RELATED ENGINE */

const related = slug =>
  posts
    .filter(p => p.slug !== slug)
    .slice(0, 4)
    .map(p => `<li><a href="${p.url}">${p.title}</a></li>`)
    .join("");

/* ================= PASS 2 ================= */

for (let post of posts) {

  const { title, slug, html, url, date, tags } = post;

  const description = buildDescription(html);
  const image = extractImage(html, slug);

  const dir = `posts/${slug}`;
  fs.mkdirSync(dir, { recursive: true });

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: title, item: url }
    ]
  };

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: title,
    image: [image],
    datePublished: date,
    author: { "@type": "Organization", name: AUTHOR_NAME }
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
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="${url}">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${image}">

<script type="application/ld+json">
${JSON.stringify(articleSchema)}
</script>

<script type="application/ld+json">
${JSON.stringify(breadcrumbSchema)}
</script>

</head>
<body>

<img src="${image}" style="display:none;" alt="">

<h1>${title}</h1>

${html}

<h2>Related Articles</h2>
<ul>${related(slug)}</ul>

</body>
</html>`;

  fs.writeFileSync(`${dir}/index.html`, page);
}

/* ================= TAG PAGES (Authority v5) ================= */

for (const tag in tagMap) {

  const postsHtml = tagMap[tag]
    .map(p => `<li><a href="${p.url}">${p.title}</a></li>`)
    .join("");

  const tagPage = `
<!DOCTYPE html>
<html>
<head>
<title>${tag} | ${SITE_NAME}</title>
<meta name="robots" content="index,follow">
<link rel="canonical" href="${SITE_URL}/tags/${tag}/">
</head>
<body>

<h1>${tag}</h1>
<ul>${postsHtml}</ul>

</body>
</html>`;

  fs.mkdirSync(`tags/${tag}`, { recursive: true });
  fs.writeFileSync(`tags/${tag}/index.html`, tagPage);
}

/* ================= ELITE SITEMAP (Authority v6) ================= */

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="https://www.sitemaps.org/schemas/sitemap/0.9">

${posts.map(p => `
<url>
<loc>${p.url}</loc>
<lastmod>${new Date(p.date).toISOString()}</lastmod>
<changefreq>weekly</changefreq>
<priority>0.85</priority>
</url>`).join("")}

</urlset>`;

fs.writeFileSync("sitemap.xml", sitemap);

console.log("AUTHORITY ENGINE v6 DEPLOYED SUCCESSFULLY");
