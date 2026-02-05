import fs from "fs";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";

/* ================= CONFIG ================= */

const SITE_URL = "https://justingerad05.github.io/reviewlab-static";

const FEED_URL =
"https://honestproductreviewlab.blogspot.com/feeds/posts/default?alt=atom";

const FALLBACK_IMAGES = [
`${SITE_URL}/og-cta-analysis.jpg?v=5`,
`${SITE_URL}/og-cta-features.jpg?v=5`,
`${SITE_URL}/og-cta-tested.jpg?v=5`,
`${SITE_URL}/og-cta-verdict.jpg?v=5`
];

const DEFAULT_IMAGE = `${SITE_URL}/og-default.jpg?v=5`;

const SITE_NAME = "ReviewLab";
const AUTHOR_NAME = "ReviewLab Editorial";

/* ================= SAFE FETCH ================= */

async function fetchFeed(){

try{

const parser = new XMLParser({ ignoreAttributes:false });

const res = await fetch(FEED_URL);

if(!res.ok)
throw new Error("Feed fetch failed");

const xml = await res.text();
const data = parser.parse(xml);

let entries = data.feed?.entry || [];

if(!Array.isArray(entries))
entries=[entries];

return entries;

}catch(err){

console.error("🚨 FEED FAILED — BUILD ABORTED");
process.exit(1);
}
}

/* ================= HELPERS ================= */

const strip = html =>
html.replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();

const slugify = str =>
str.toLowerCase()
.replace(/[^a-z0-9]+/g,"-")
.replace(/^-+|-+$/g,"")
.slice(0,70);

function pickFallback(slug){

let hash=0;

for(let i=0;i<slug.length;i++)
hash = slug.charCodeAt(i)+((hash<<5)-hash);

return FALLBACK_IMAGES[Math.abs(hash)%FALLBACK_IMAGES.length]
|| DEFAULT_IMAGE;
}

function extractImage(html,slug){

const yt = html.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([0-9A-Za-z_-]{11})/);

if(yt)
return `https://img.youtube.com/vi/${yt[1]}/hqdefault.jpg`;

const imgs=[...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)];

for(const m of imgs){

const url=m[1].toLowerCase();

if(!/(emoji|icon|logo|avatar|pixel|1x1|spacer|blank)/.test(url))
return m[1];
}

return pickFallback(slug);
}

/* ================= BUILD ================= */

const entries = await fetchFeed();

/* DO NOT DELETE POSTS UNTIL FEED SUCCEEDS */
fs.rmSync("posts",{recursive:true,force:true});
fs.mkdirSync("posts",{recursive:true});

const posts=[];

/* PASS 1 — COLLECT */

for(const entry of entries){

const html = entry.content?.["#text"];
if(!html) continue;

const title = entry.title?.["#text"] || "Review";
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

/* PASS 2 — BUILD ARTICLES */

for(const post of posts){

const {title,slug,html,url,date}=post;

const desc = strip(html).slice(0,155);
const image = extractImage(html,slug);

post.image=image;

/* related */

const related = posts
.filter(p=>p.slug!==slug)
.slice(0,4)
.map(p=>`<li><a href="${p.url}">${p.title}</a></li>`)
.join("");

const schema={
"@context":"https://schema.org",
"@type":"TechArticle",
headline:title,
description:desc,
image:[image],
author:{ "@type":"Organization", name:AUTHOR_NAME },
publisher:{
"@type":"Organization",
name:SITE_NAME,
logo:{ "@type":"ImageObject", url:DEFAULT_IMAGE }
},
datePublished:date,
mainEntityOfPage:url
};

const page=`<!DOCTYPE html>
<html lang="en">
<head>

<meta charset="UTF-8">
<title>${title}</title>

<meta name="description" content="${desc}">
<meta name="robots" content="index,follow,max-image-preview:large">

<link rel="canonical" href="${url}">

<meta property="og:type" content="article">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:image" content="${image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="${url}">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${image}">

<script type="application/ld+json">
${JSON.stringify(schema)}
</script>

</head>
<body>

<!-- crawler-visible fallback -->
<img src="${image}" width="1200" height="630"
style="position:absolute;left:-9999px;" alt="">

${html}

<h2>Related Reviews</h2>
<ul>${related}</ul>

</body>
</html>`;

fs.mkdirSync(`posts/${slug}`,{recursive:true});
fs.writeFileSync(`posts/${slug}/index.html`,page);
}

/* ================= HOMEPAGE AUTHORITY ================= */

const homepage = `<!DOCTYPE html>
<html>
<head>

<title>ReviewLab | AI Tool Reviews That Actually Matter</title>

<meta name="description"
content="Discover the best AI tools, automation software, and digital products tested and reviewed by experts.">

<meta name="robots" content="index,follow">

<link rel="canonical" href="${SITE_URL}/">

</head>
<body>

<h1>Latest AI Tool Reviews</h1>

<ul>

${posts
.sort((a,b)=> new Date(b.date)-new Date(a.date))
.slice(0,25)
.map(p=>`<li><a href="${p.url}">${p.title}</a></li>`)
.join("")}

</ul>

</body>
</html>`;

fs.writeFileSync("index.html",homepage);

/* ================= SITEMAP ================= */

const sitemap=`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="https://www.sitemaps.org/schemas/sitemap/0.9">

<url>
<loc>${SITE_URL}/</loc>
<priority>1.0</priority>
</url>

${posts.map(p=>`
<url>
<loc>${p.url}</loc>
<priority>0.8</priority>
</url>`).join("")}

</urlset>`;

fs.writeFileSync("sitemap.xml",sitemap);

/* ================= ROBOTS ================= */

fs.writeFileSync("robots.txt",

`User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml`
);

console.log("✅ Authority V5 build completed successfully.");
