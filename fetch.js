import fs from "fs";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";
import { upscaleToOG } from "./generate-og.js";

const FEED_URL =
"https://honestproductreviewlab.blogspot.com/feeds/posts/default?alt=atom";

const SITE_URL =
"https://justingerad05.github.io/reviewlab-static";

const CTA = `${SITE_URL}/og-cta-tested.jpg`;
const DEFAULT = `${SITE_URL}/og-default.jpg`;

/* CLEAN BUILD */

fs.rmSync("posts",{recursive:true,force:true});
fs.rmSync("_data",{recursive:true,force:true});
fs.rmSync("author",{recursive:true,force:true});
fs.rmSync("editorial-policy",{recursive:true,force:true});
fs.rmSync("review-methodology",{recursive:true,force:true});

fs.mkdirSync("posts",{recursive:true});
fs.mkdirSync("_data",{recursive:true});
fs.mkdirSync("og-images",{recursive:true});
fs.mkdirSync("author",{recursive:true});
fs.mkdirSync("editorial-policy",{recursive:true});
fs.mkdirSync("review-methodology",{recursive:true});

/* FETCH */

const parser = new XMLParser({ignoreAttributes:false});
const xml = await (await fetch(FEED_URL)).text();
const data = parser.parse(xml);

let entries = data.feed.entry || [];
if(!Array.isArray(entries)) entries=[entries];

/* YOUTUBE */

async function getYouTubeImages(html,slug){

const match = html.match(/(?:youtube\.com\/embed\/|watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
if(!match) return null;

const id = match[1];

const candidates = [
`https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
`https://img.youtube.com/vi/${id}/sddefault.jpg`,
`https://img.youtube.com/vi/${id}/hqdefault.jpg`
];

for(const img of candidates){
try{
const res = await fetch(img,{method:"HEAD"});
if(res.ok) return [img];
}catch{}
}

const upscaled = await upscaleToOG(
`https://img.youtube.com/vi/${id}/hqdefault.jpg`,
slug
);

if(upscaled) return [`${SITE_URL}/og-images/${slug}.jpg`];

return [DEFAULT];
}

/* BUYER-INTENT SEMANTIC LINK GRAPH */

function scoreSimilarity(a,b){

const aw = a.toLowerCase().split(/\W+/);
const bw = b.toLowerCase().split(/\W+/);

const overlap = aw.filter(w=>bw.includes(w)).length;

return overlap;
}

function injectInternalLinks(html, posts, current){

const ranked = posts
.filter(p=>p.slug!==current.slug)
.map(p=>({
post:p,
score:scoreSimilarity(current.title,p.title)
}))
.sort((a,b)=>b.score-a.score)
.slice(0,5)
.map(r=>r.post);

let enriched = html;

ranked.forEach(p=>{
const keyword = p.title.split(" ")[0];
const regex = new RegExp(`\\b(${keyword})\\b`,"i");

if(regex.test(enriched)){
enriched = enriched.replace(regex,
`<a href="${p.url}" style="font-weight:600;">$1</a>`
);
}
});

return enriched;
}

/* PROS / CONS AUTO EXTRACTION */

function extractProsCons(text){

const sentences = text.split(/[.!?]/);

const pros=[];
const cons=[];

sentences.forEach(s=>{
const t=s.toLowerCase();

if(t.includes("easy") ||
t.includes("fast") ||
t.includes("powerful") ||
t.includes("excellent") ||
t.includes("simple")){
pros.push(s.trim());
}

if(t.includes("expensive") ||
t.includes("slow") ||
t.includes("difficult") ||
t.includes("limited") ||
t.includes("problem")){
cons.push(s.trim());
}
});

return {
pros:pros.slice(0,3),
cons:cons.slice(0,3)
};
}

const posts=[];

/* BUILD DATA */

for(const entry of entries){

const rawHtml = entry.content?.["#text"];
if(!rawHtml) continue;

const title = entry.title["#text"];

const slug = title
.toLowerCase()
.replace(/[^a-z0-9]+/g,"-")
.replace(/^-|-$/g,"");

const url = `${SITE_URL}/posts/${slug}/`;

const textOnly = rawHtml.replace(/<[^>]+>/g," ");

const description = textOnly.slice(0,155);

const ogImages = await getYouTubeImages(rawHtml,slug);

const primaryOG = ogImages[0];

const readTime = Math.max(1,
Math.ceil(textOnly.split(/\s+/).length / 200)
);

const {pros,cons} = extractProsCons(textOnly);

/* AUTHORITY SCHEMA STACK */

const productSchema = {
"@context":"https://schema.org",
"@type":"Product",
"name":title,
"image":primaryOG,
"brand":{
"@type":"Brand",
"name":title.split(" ")[0]
},
"review":{
"@type":"Review",
"author":{
"@type":"Person",
"name":"Justin Gerald"
},
"reviewRating":{
"@type":"Rating",
"ratingValue":"4.7",
"bestRating":"5"
},
"positiveNotes":pros,
"negativeNotes":cons
}
};

const articleSchema = {
"@context":"https://schema.org",
"@type":"Article",
"headline":title,
"image":primaryOG,
"datePublished":entry.published,
"dateModified": new Date().toISOString(),
"author":{
"@type":"Person",
"name":"Justin Gerald",
"url":`${SITE_URL}/author/`
},
"publisher":{
"@type":"Organization",
"name":"ReviewLab",
"logo":{
"@type":"ImageObject",
"url":CTA
}
},
"description":description,
"mainEntityOfPage":url
};

posts.push({
title,
slug,
html:rawHtml,
url,
description,
og:primaryOG,
thumb:primaryOG,
readTime,
date:entry.published,
schemas:JSON.stringify([articleSchema,productSchema])
});
}

/* APPLY SEMANTIC LINKS */

posts.forEach(p=>{
p.html = injectInternalLinks(p.html,posts,p);
});

posts.sort((a,b)=> new Date(b.date)-new Date(a.date));

/* BUILD POSTS (UNCHANGED UI) */

for(const post of posts){

fs.mkdirSync(`posts/${post.slug}`,{recursive:true});

const related = posts
.filter(p=>p.slug!==post.slug)
.slice(0,4)
.map(p=>`
<li>
<a href="${p.url}" class="related-link">
<img data-src="${p.thumb}" width="110" class="lazy" alt="${p.title}" />
<span style="font-weight:600;">${p.title} (~${p.readTime} min)</span>
</a>
</li>`).join("");

const page = `<!doctype html>
<html lang="en">
<head>

<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">

<title>${post.title}</title>

<link rel="canonical" href="${post.url}">

<meta name="description" content="${post.description}">
<meta property="og:title" content="${post.title}">
<meta property="og:description" content="${post.description}">
<meta property="og:type" content="article">
<meta property="og:url" content="${post.url}">
<meta property="og:image" content="${post.og}">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${post.og}">

<script type="application/ld+json">
${post.schemas}
</script>

<style>
.lazy{opacity:0;transition:.3s;border-radius:10px;}
.lazy.loaded{opacity:1;}
.related-link{display:flex;align-items:center;gap:14px;text-decoration:none;color:inherit;padding:12px 0;}
</style>

</head>
<body style="max-width:760px;margin:auto;font-family:system-ui;padding:40px;line-height:1.7;">

<nav style="font-size:14px;margin-bottom:20px;">
<a href="${SITE_URL}">Home</a> › ${post.title}
</nav>

<h1>${post.title}</h1>

<p style="opacity:.7;font-size:14px;">
By <a href="${SITE_URL}/author/">Justin Gerald</a> • ${post.readTime} min read
</p>

${post.html}

<hr>

<h3>Related Reviews</h3>

<ul style="list-style:none;padding:0;">
${related}
</ul>

<script>
document.addEventListener("DOMContentLoaded",()=>{
const lazyImgs=document.querySelectorAll(".lazy");
const io=new IntersectionObserver(entries=>{
entries.forEach(e=>{
if(e.isIntersecting){
const img=e.target;
img.src=img.dataset.src;
img.onload=()=>img.classList.add("loaded");
io.unobserve(img);
}
});
});
lazyImgs.forEach(img=>io.observe(img));
});
</script>

</body>
</html>`;

fs.writeFileSync(`posts/${post.slug}/index.html`,page);
}

/* AUTHOR PAGE */

fs.writeFileSync(`author/index.html`,`
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Justin Gerald — Product Review Analyst</title>
<link rel="canonical" href="${SITE_URL}/author/">
</head>
<body style="max-width:760px;margin:auto;font-family:system-ui;padding:40px;line-height:1.7;">

<h1>Justin Gerald</h1>

<p>
Independent product review analyst specializing in deep software evaluation,
market comparison, and buyer-intent testing.
</p>

<h2>Latest Reviews</h2>

<ul>
${posts.map(p=>`<li><a href="${p.url}">${p.title}</a></li>`).join("")}
</ul>

</body>
</html>
`);

/* EDITORIAL POLICY */

fs.writeFileSync(`editorial-policy/index.html`,`
<!doctype html>
<html>
<head>
<title>Editorial Policy — ReviewLab</title>
<link rel="canonical" href="${SITE_URL}/editorial-policy/">
</head>
<body style="max-width:760px;margin:auto;font-family:system-ui;padding:40px;">

<h1>Editorial Policy</h1>

<p>
ReviewLab maintains strict editorial independence.
Reviews are based on structured research, product analysis,
market positioning, and real-world utility.
</p>

<p>
Affiliate partnerships never influence verdicts.
Reader trust is prioritized above commissions.
</p>

</body>
</html>
`);

/* REVIEW METHODOLOGY */

fs.writeFileSync(`review-methodology/index.html`,`
<!doctype html>
<html>
<head>
<title>Review Methodology — ReviewLab</title>
<link rel="canonical" href="${SITE_URL}/review-methodology/">
</head>
<body style="max-width:760px;margin:auto;font-family:system-ui;padding:40px;">

<h1>Review Methodology</h1>

<p>
Each product is evaluated across usability, feature depth,
automation capability, support quality, pricing logic,
and competitive alternatives.
</p>

<p>
Only tools demonstrating real user benefit are recommended.
</p>

</body>
</html>
`);

/* ROBOTS */

fs.writeFileSync("robots.txt",`
User-agent: *
Allow: /

Disallow: /_data/
Disallow: /og-images/

Sitemap: ${SITE_URL}/sitemap.xml
`);

/* DATA */

fs.writeFileSync("_data/posts.json",JSON.stringify(posts,null,2));

/* SITEMAP */

const urls = posts.map(u=>`
<url>
<loc>${u.url}</loc>
<lastmod>${new Date().toISOString()}</lastmod>
<changefreq>weekly</changefreq>
<priority>0.8</priority>
</url>`).join("");

fs.writeFileSync("sitemap.xml",`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url>
<loc>${SITE_URL}</loc>
<priority>1.0</priority>
</url>
<url>
<loc>${SITE_URL}/author/</loc>
<priority>0.9</priority>
</url>
${urls}
</urlset>`);

console.log("✅ AUTHORITY BUILD COMPLETE");
