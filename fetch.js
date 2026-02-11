import fs from "fs";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";
import { generateOG, upscaleToOG } from "./generate-og.js";

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
fs.rmSync("topics",{recursive:true,force:true}); // 🔥 FULLY REMOVED

fs.mkdirSync("posts",{recursive:true});
fs.mkdirSync("_data",{recursive:true});
fs.mkdirSync("og-images",{recursive:true});
fs.mkdirSync("author",{recursive:true});
fs.mkdirSync("comparisons",{recursive:true});

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

const valid=[];

for(const img of candidates){
try{
const res = await fetch(img,{method:"HEAD"});
if(res.ok) valid.push(img);
}catch{}
}

if(valid.length===0){
const upscaled = await upscaleToOG(
`https://img.youtube.com/vi/${id}/hqdefault.jpg`,
slug
);
if(upscaled) return [`${SITE_URL}/og-images/${slug}.jpg`];
return null;
}

return valid;
}

/* INTERNAL LINKS */

function injectInternalLinks(html, posts, currentSlug){

const candidates = posts
.filter(p=>p.slug!==currentSlug)
.slice(0,5);

let enriched = html;

candidates.forEach(p=>{
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

const description = rawHtml.replace(/<[^>]+>/g," ").slice(0,155);

let ogImages = await getYouTubeImages(rawHtml,slug);
if(!ogImages) ogImages=[CTA];
if(!ogImages) ogImages=[DEFAULT];

const primaryOG = ogImages[0];
const thumb = ogImages.find(img=>img.includes("hqdefault")) || primaryOG;

const textOnly = rawHtml.replace(/<[^>]+>/g,"");

const readTime = Math.max(1,
Math.ceil(textOnly.split(/\s+/).length / 200)
);

/* AUTHORITY SCHEMAS */

const reviewSchema = {
"@context":"https://schema.org",
"@type":"Review",
"itemReviewed":{
"@type":"Product",
"name":title,
"image":primaryOG
},
"author":{
"@type":"Person",
"name":"Justin Gerald",
"url":`${SITE_URL}/author/`
},
"reviewRating":{
"@type":"Rating",
"ratingValue":"4.7",
"bestRating":"5"
},
"publisher":{
"@type":"Organization",
"name":"ReviewLab"
}
};

const articleSchema = {
"@context":"https://schema.org",
"@type":"Article",
"headline":title,
"image":ogImages,
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
"mainEntityOfPage":{
"@type":"WebPage",
"@id":url
}
};

const breadcrumbSchema = {
"@context":"https://schema.org",
"@type":"BreadcrumbList",
"itemListElement":[
{
"@type":"ListItem",
"position":1,
"name":"Home",
"item":SITE_URL
},
{
"@type":"ListItem",
"position":2,
"name":title,
"item":url
}
]
};

const personSchema = {
"@context":"https://schema.org",
"@type":"Person",
"name":"Justin Gerald",
"url":`${SITE_URL}/author/`,
"jobTitle":"Product Review Analyst",
"worksFor":{
"@type":"Organization",
"name":"ReviewLab"
}
};

posts.push({
title,
slug,
html:rawHtml,
url,
description,
og:primaryOG,
thumb,
readTime,
date:entry.published,
schemas:JSON.stringify([
articleSchema,
breadcrumbSchema,
reviewSchema,
personSchema
])
});
}

/* APPLY LINKS */

posts.forEach(p=>{
p.html = injectInternalLinks(p.html,posts,p.slug);
});

posts.sort((a,b)=> new Date(b.date)-new Date(a.date));

/* BUILD POSTS — UNTOUCHED LAYOUT */

for(const post of posts){

fs.mkdirSync(`posts/${post.slug}`,{recursive:true});

const inlineRecs = posts
.filter(p=>p.slug!==post.slug)
.slice(0,3)
.map(p=>`<li><a href="${p.url}" style="font-weight:600;">${p.title}</a></li>`)
.join("");

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
<meta name="robots" content="index,follow">

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
.lazy{opacity:0;transition:opacity .3s;border-radius:10px;}
.lazy.loaded{opacity:1;}
.related-link{display:flex;align-items:center;gap:14px;text-decoration:none;color:inherit;padding:12px 0;}
.hover-preview{position:absolute;display:none;max-width:420px;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.25);z-index:9999;pointer-events:none;}
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

<div style="margin:40px 0;padding:20px;border-radius:14px;background:#fafafa;">
<strong>You may also like:</strong>
<ul style="margin-top:10px;">
${inlineRecs}
</ul>
</div>

<hr>

<h3>Related Reviews</h3>

<ul style="list-style:none;padding:0;">
${related}
</ul>

<img id="hoverPreview" class="hover-preview"/>

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

const hover=document.getElementById("hoverPreview");

document.querySelectorAll(".related-link").forEach(link=>{
const img=link.querySelector("img");

link.addEventListener("mouseover",()=>{
hover.src=img.dataset.src;
hover.style.display="block";
});

link.addEventListener("mousemove",e=>{
hover.style.top=(e.pageY+20)+"px";
hover.style.left=(e.pageX+20)+"px";
});

link.addEventListener("mouseout",()=>hover.style.display="none");
});
});
</script>

</body>
</html>`;

fs.writeFileSync(`posts/${post.slug}/index.html`,page);
}

/* AUTHOR — AUTHORITY PAGE */

const authorSchema = {
"@context":"https://schema.org",
"@type":"Person",
"name":"Justin Gerald",
"url":`${SITE_URL}/author/`,
"jobTitle":"Senior Product Analyst",
"knowsAbout":[
"Product Reviews",
"Affiliate Marketing",
"Consumer Technology"
],
"worksFor":{
"@type":"Organization",
"name":"ReviewLab"
}
};

const authorPosts = posts.map(p=>`
<li style="margin-bottom:14px;">
<a href="${p.url}" style="font-weight:600;">${p.title}</a>
</li>
`).join("");

fs.writeFileSync("author/index.html",`
<!doctype html>
<html>
<head>
<title>Justin Gerald — Product Review Expert</title>
<link rel="canonical" href="${SITE_URL}/author/">
<meta property="og:title" content="Justin Gerald — Product Review Expert">
<meta property="og:type" content="profile">
<meta property="og:url" content="${SITE_URL}/author/">
<meta property="og:image" content="${CTA}">
<script type="application/ld+json">${JSON.stringify(authorSchema)}</script>
</head>
<body style="max-width:760px;margin:auto;font-family:system-ui;padding:40px;line-height:1.7;">
<h1>Justin Gerald</h1>

<p><strong>Senior Product Analyst at ReviewLab.</strong></p>

<p>
Justin specializes in hands-on product testing, real-world evaluation,
and evidence-based recommendations designed to help consumers make confident buying decisions.
</p>

<h2>Published Reviews</h2>

<ul style="list-style:none;padding:0;">
${authorPosts}
</ul>

</body>
</html>
`);

/* COMPARISONS — UNTOUCHED */

const comparisonUrls=[];

for(let i=0;i<posts.length;i++){
for(let j=i+1;j<posts.length;j++){

const A=posts[i];
const B=posts[j];

const slug=`${A.slug}-vs-${B.slug}`;
const url=`${SITE_URL}/comparisons/${slug}.html`;

const schema={
"@context":"https://schema.org",
"@type":"Article",
"headline":`${A.title} vs ${B.title}`,
"author":{"@type":"Person","name":"Justin Gerald"},
"datePublished":new Date().toISOString()
};

const html=`
<!doctype html>
<html>
<head>
<title>${A.title} vs ${B.title}</title>
<link rel="canonical" href="${url}">
<meta property="og:title" content="${A.title} vs ${B.title}">
<meta property="og:type" content="article">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${A.og}">
<script type="application/ld+json">${JSON.stringify(schema)}</script>
</head>
<body style="max-width:760px;margin:auto;font-family:system-ui;padding:40px;">
<h1>${A.title} vs ${B.title}</h1>
<p><a href="${A.url}">${A.title}</a> compared with <a href="${B.url}">${B.title}</a>.</p>
</body>
</html>
`;

fs.writeFileSync(`comparisons/${slug}.html`,html);
comparisonUrls.push(url);

}
}

/* SAVE */

fs.writeFileSync("_data/posts.json",JSON.stringify(posts,null,2));

console.log("✅ BUILD COMPLETE — TOPICS REMOVED, AUTHORITY BOOSTED");
