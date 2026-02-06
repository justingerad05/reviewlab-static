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

const DEFAULT_IMAGE = `${SITE_URL}/og-default.jpg`;

/* ================= CLEAN BUILD ================= */

["posts","tags","_data","og-images"].forEach(dir=>{
  fs.rmSync(dir,{recursive:true,force:true});
  fs.mkdirSync(dir,{recursive:true});
});

/* ================= FETCH ================= */

const parser = new XMLParser({ ignoreAttributes:false });
const res = await fetch(FEED_URL);
const xml = await res.text();
const data = parser.parse(xml);

let entries = data.feed?.entry || [];
if(!Array.isArray(entries)) entries=[entries];

const posts=[];
const tagMap={};

/* ================= UTIL ================= */

const strip = html =>
  html.replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();

const slugify=str =>
  str.toLowerCase()
    .replace(/[^a-z0-9]+/g,"-")
    .replace(/^-+|-+$/g,"")
    .slice(0,70);

/* ⭐ v14 — AI Meta Excerpt */
const excerpt = html =>
  strip(html).slice(0,140) + "...";

/* ⭐ v15 — Image Extraction Priority */
function extractImage(html){
  const yt=html.match(/(?:v=|youtu\.be\/)([0-9A-Za-z_-]{11})/);
  if(yt) return `https://img.youtube.com/vi/${yt[1]}/hqdefault.jpg`;

  const img=html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return img ? img[1] : DEFAULT_IMAGE;
}

/* ⭐ v16 — Tag Intelligence */
function buildTags(html){
  const pool=[
    "ai tools",
    "automation",
    "software review",
    "online business",
    "digital marketing"
  ];

  const lower=html.toLowerCase();
  return pool.filter(t=>lower.includes(t)).slice(0,3) || ["ai tools"];
}

/* PASS 1 */

for(const entry of entries){

  const html=entry.content?.["#text"];
  if(!html) continue;

  const title=entry.title?.["#text"] || "Untitled Review";
  const slug=slugify(title);
  const url=`${SITE_URL}/posts/${slug}/`;

  const tags=buildTags(html);

  tags.forEach(tag=>{
    const t=slugify(tag);
    if(!tagMap[t]) tagMap[t]=[];
    tagMap[t].push({title,url});
  });

  posts.push({
    title,
    slug,
    url,
    html,
    tags,
    date: entry.published || new Date().toISOString(),
    description: excerpt(html),
    image: extractImage(html)
  });
}

/* ⭐ v17 — Internal Link Graph */
const related = slug =>
  posts
    .filter(p=>p.slug!==slug)
    .sort(()=>0.5-Math.random())
    .slice(0,4)
    .map(p=>`<li><a href="${p.url}">${p.title}</a></li>`)
    .join("");

/* PASS 2 — BUILD */

for(const post of posts){

  const {title,slug,html,url,date,description,image}=post;

  await generateOG(slug,title);
  const ogImage=`${SITE_URL}/og-images/${slug}.png`;

  fs.mkdirSync(`posts/${slug}`,{recursive:true});

  const schema={
    "@context":"https://schema.org",
    "@type":"TechArticle",
    headline:title,
    description,
    image:[ogImage],
    datePublished:date,
    author:{ "@type":"Organization", name:AUTHOR_NAME }
  };

  const page=`<!DOCTYPE html>
<html lang="en">
<head>

<meta charset="UTF-8">
<title>${title}</title>

<meta name="description" content="${description}">
<link rel="canonical" href="${url}">
<meta name="robots" content="index,follow,max-image-preview:large">

<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${ogImage}">
<meta property="og:type" content="article">
<meta property="og:url" content="${url}">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${ogImage}">

<script type="application/ld+json">
${JSON.stringify(schema)}
</script>

</head>
<body>

<h1>${title}</h1>

<img src="${image}" style="max-width:100%;border-radius:12px">

${html}

<section>
<h2>Related Reviews</h2>
<ul>${related(slug)}</ul>
</section>

</body>
</html>`;

  fs.writeFileSync(`posts/${slug}/index.html`,page);
}

/* ⭐ v18 — Tag Authority Pages */

for(const tag in tagMap){

  const list=tagMap[tag]
    .map(p=>`<li><a href="${p.url}">${p.title}</a></li>`)
    .join("");

  fs.mkdirSync(`tags/${tag}`,{recursive:true});

  fs.writeFileSync(`tags/${tag}/index.html`,
`<h1>${tag}</h1><ul>${list}</ul>`);
}

/* ⭐ v19 — Crawl Priority Sitemap */

const sitemap=`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="https://www.sitemaps.org/schemas/sitemap/0.9">

<url>
<loc>${SITE_URL}/</loc>
<priority>1.0</priority>
</url>

${posts.map(p=>`
<url>
<loc>${p.url}</loc>
<lastmod>${new Date(p.date).toISOString()}</lastmod>
<priority>0.9</priority>
</url>`).join("")}

</urlset>`;

fs.writeFileSync("sitemap.xml",sitemap);

/* ⭐ v20 — AI Search Feed */

fs.writeFileSync("_data/ai-feed.json",
JSON.stringify(posts,null,2));

console.log("✅ AUTHORITY ENGINE v20 LIVE");
