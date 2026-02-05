import fs from "fs";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";
import { generateOG } from "./generate-og.js";

/* ================= CONFIG ================= */

const FEED_URL =
  "https://honestproductreviewlab.blogspot.com/feeds/posts/default?alt=atom";

const SITE_URL = "https://justingerad05.github.io/reviewlab-static";
const SITE_NAME = "ReviewLab";
const AUTHOR_NAME = "ReviewLab Editorial";

const FALLBACK_IMAGES = [
  `${SITE_URL}/og-cta-analysis.jpg`,
  `${SITE_URL}/og-cta-features.jpg`,
  `${SITE_URL}/og-cta-tested.jpg`,
  `${SITE_URL}/og-cta-verdict.jpg`
];

const DEFAULT_IMAGE = `${SITE_URL}/og-default.jpg`;

/* ================= INIT ================= */

fs.rmSync("posts", { recursive: true, force: true });
fs.rmSync("tags", { recursive: true, force: true });
fs.rmSync("_data", { recursive: true, force: true });

fs.mkdirSync("posts", { recursive: true });
fs.mkdirSync("tags", { recursive: true });
fs.mkdirSync("og-images", { recursive: true });
fs.mkdirSync("_data", { recursive: true });

/* ================= FETCH FEED ================= */

const parser = new XMLParser({ ignoreAttributes: false });
const res = await fetch(FEED_URL);
const xml = await res.text();
const data = parser.parse(xml);

let entries = data.feed?.entry || [];
if (!Array.isArray(entries)) entries = [entries];

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

/* ================= IMAGE ENGINE (v4) ================= */

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
  if (yt) return `https://img.youtube.com/vi/${yt}/hqdefault.jpg`;

  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : pickFallback(slug);
}

/* ================= TAG ENGINE (v5) ================= */

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

  return tags.length ? tags.slice(0, 3) : ["ai tools"];
}

/* ================= PASS 1 – COLLECT POSTS ================= */

for (const entry of entries) {

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

/* ================= RELATED ENGINE (v7) ================= */

const related = slug =>
  posts
    .filter(p => p.slug !== slug)
    .slice(0, 4)
    .map(p => `<li><a href="${p.url}">${p.title}</a></li>`)
    .join("");

/* ================= PASS 2 – BUILD POSTS ================= */

for (const post of posts) {

  const { title, slug, html, url, date } = post;

  const description = buildDescription(html);

  /* v8 – Generate Branded OG */
  await generateOG(slug, title);

  /* v9 – Priority OG Stack */
  const ogImage = `${SITE_URL}/og-images/${slug}.png`;

  const dir = `posts/${slug}`;
  fs.mkdirSync(dir, { recursive: true });

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: title,
    description,
    image: [ogImage],
    author: { "@type": "Organization", name: AUTHOR_NAME },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: DEFAULT_IMAGE
      }
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
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${ogImage}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="${url}">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${ogImage}">

<script type="application/ld+json">
${JSON.stringify(articleSchema)}
</script>

</head>
<body>

<img src="${ogImage}" alt="" style="display:none">

<h1>${title}</h1>

${html}

<section>
<h2>Related Reviews</h2>
<ul>${related(slug)}</ul>
</section>

</body>
</html>`;

  fs.writeFileSync(`${dir}/index.html`, page);
}

/* ================= TAG PAGES (v5) ================= */

for (const tag in tagMap) {

  const list = tagMap[tag]
    .map(p => `<li><a href="${p.url}">${p.title}</a></li>`)
    .join("");

  const page = `<!DOCTYPE html>
<html>
<head>
<title>${tag} | ${SITE_NAME}</title>
<meta name="robots" content="index,follow">
<link rel="canonical" href="${SITE_URL}/tags/${tag}/">
</head>
<body>

<h1>${tag}</h1>
<ul>${list}</ul>

</body>
</html>`;

  fs.mkdirSync(`tags/${tag}`, { recursive: true });
  fs.writeFileSync(`tags/${tag}/index.html`, page);
}

/* ================= AUTHORITY SITEMAP (v6 + v9) ================= */

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="https://www.sitemaps.org/schemas/sitemap/0.9">

<url>
  <loc>${SITE_URL}/</loc>
  <changefreq>daily</changefreq>
  <priority>1.0</priority>
</url>

${posts.map(p => `
<url>
  <loc>${p.url}</loc>
  <lastmod>${new Date(p.date).toISOString()}</lastmod>
  <changefreq>weekly</changefreq>
  <priority>0.9</priority>
</url>`).join("")}

</urlset>`;

fs.writeFileSync("sitemap.xml", sitemap);

/* ================= DATA FEED (v9 – TRAFFIC MULTIPLIER) ================= */

fs.writeFileSync(
  "_data/posts.json",
  JSON.stringify(
    posts.map(p => ({
      title: p.title,
      url: p.url,
      date: p.date
    })),
    null,
    2
  )
);

console.log("✅ AUTHORITY ENGINE v9 DEPLOYED");


generate-og.js:

import fs from "fs";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

/* LOAD FONT */
const fontData = fs.readFileSync("./fonts/Inter-Regular.ttf");

/* ENSURE DIR */
if (!fs.existsSync("./og-images")) {
  fs.mkdirSync("./og-images");
}

function cleanTitle(title) {
  return title.replace(/\|.*$/, "").slice(0, 90);
}

export async function generateOG(slug, title) {

  const width = 1200;
  const height = 630;

  const svg = await satori(
    {
      type: "div",
      props: {
        style: {
          width,
          height,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#020617",
          padding: "60px",
          color: "#ffffff"
        },

        children: [

          {
            type: "div",
            props: {
              style: {
                fontSize: 46,
                fontWeight: 700,
                color: "#38bdf8"
              },
              children: "HONEST AI TOOL REVIEW"
            }
          },

          {
            type: "div",
            props: {
              style: {
                fontSize: 72,
                fontWeight: 800,
                lineHeight: 1.1
              },
              children: cleanTitle(title)
            }
          },

          {
            type: "div",
            props: {
              style: {
                fontSize: 32,
                fontWeight: 600,
                color: "#22c55e"
              },
              children: "Features • Pros • Cons • Verdict"
            }
          }

        ]
      }
    },

    {
      width,
      height,

      fonts: [
        {
          name: "Inter",
          data: fontData,
          weight: 400,
          style: "normal"
        }
      ]
    }
  );

  const resvg = new Resvg(svg);
  const png = resvg.render();

  fs.writeFileSync(`./og-images/${slug}.png`, png.asPng());
}
