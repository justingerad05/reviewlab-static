import fs from "fs";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";

/* ================= CONFIG ================= */

const SITE_URL = "https://justingerad05.github.io/reviewlab-static";

const FEED_URL =
"https://honestproductreviewlab.blogspot.com/feeds/posts/default?alt=atom";

const IMAGES = [
`${SITE_URL}/og-cta-analysis.jpg`,
`${SITE_URL}/og-cta-features.jpg`,
`${SITE_URL}/og-cta-tested.jpg`,
`${SITE_URL}/og-cta-verdict.jpg`
];

const DEFAULT_IMAGE = `${SITE_URL}/og-default.jpg`;

const SITE_NAME = "ReviewLab";

/* ================= FETCH ================= */

const parser = new XMLParser({ ignoreAttributes:false });

const xml = await (await fetch(FEED_URL)).text();
const data = parser.parse(xml);

let entries = data.feed?.entry || [];
if(!Array.isArray(entries)) entries=[entries];

fs.rmSync("posts",{recursive:true,force:true});
fs.mkdirSync("posts",{recursive:true});

/* ================= HELPERS ================= */

const strip = html =>
html.replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();

const slugify = s =>
s.toLowerCase()
.replace(/[^a-z0-9]+/g,"-")
.replace(/^-+|-+$/g,"")
.slice(0,70);

function fallback(slug){

let h=0;
for(let i=0;i<slug.length;i++)
h = slug.charCodeAt(i)+((h<<5)-h);

return IMAGES[Math.abs(h)%IMAGES.length] || DEFAULT_IMAGE;
}

function extractImage(html,slug){

const yt = html.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([0-9A-Za-z_-]{11})/);

if(yt)
return `https://img.youtube.com/vi/${yt[1]}/hqdefault.jpg`;

const img = html.match(/<img[^>]+src=["']([^"']+)["']/i);

return img ? img[1] : fallback(slug);
}

/* ================= BUILD ================= */

const posts=[];

for(const entry of entries){

const html = entry.content?.["#text"];
if(!html) continue;

const title = entry.title?.["#text"] || "Review";
const slug = slugify(title);
const url = `${SITE_URL}/posts/${slug}/`;

const image = extractImage(html,slug);
const desc = strip(html).slice(0,155);

posts.push({title,slug,url,image,date:entry.published});

/* ===== PAGE ===== */

const related = posts
.filter(p=>p.slug!==slug)
.slice(0,4)
.map(p=>`<li><a href="${p.url}">${p.title}</a></li>`)
.join("");

const page = `<!DOCTYPE html>
<html>
<head>

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

</head>

<body>

<!-- crawler-visible fallback -->
<img src="${image}" width="1200" height="630" alt="" style="position:absolute;left:-9999px;">

${html}

<h2>Related Reviews</h2>
<ul>${related}</ul>

</body>
</html>`;

fs.mkdirSync(`posts/${slug}`,{recursive:true});
fs.writeFileSync(`posts/${slug}/index.html`,page);
}

/* ================= SITEMAP ================= */

const sitemap=`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="https://www.sitemaps.org/schemas/sitemap/0.9">

<url>
<loc>${SITE_URL}</loc>
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
