import fs from "fs";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";
import crypto from "crypto";
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

/* INTERNAL LINK GRAPH */

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
"logo":{"@type":"ImageObject","url":CTA}
},
"description":description,
"mainEntityOfPage":{"@type":"WebPage","@id":url}
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
schemas:JSON.stringify([articleSchema,reviewSchema])
});
}

/* APPLY INTERNAL LINKS */

posts.forEach(p=>{
p.html = injectInternalLinks(p.html,posts,p.slug);
});

posts.sort((a,b)=> new Date(b.date)-new Date(a.date));

/* BUILD POSTS */

for(const post of posts){

fs.mkdirSync(`posts/${post.slug}`,{recursive:true});

const inlineRecs = posts
.filter(p=>p.slug!==post.slug)
.slice(0,3)
.map(p=>`<li><a href="${p.url}" style="font-weight:600;">${p.title}</a></li>`)
.join("");

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
<meta property="og:image" content="${post.og}">

<script type="application/ld+json">
${post.schemas}
</script>

</head>
<body style="max-width:760px;margin:auto;font-family:system-ui;padding:40px;line-height:1.7;">

<h1>${post.title}</h1>

<p style="opacity:.7;font-size:14px;">
By <a href="${SITE_URL}/author/">Justin Gerald</a> • ${post.readTime} min read
</p>

${post.html}

<div style="margin:40px 0;padding:20px;border-radius:14px;background:#fafafa;">
<strong>You may also like:</strong>
<ul>${inlineRecs}</ul>
</div>

</body>
</html>`;

fs.writeFileSync(`posts/${post.slug}/index.html`,page);
}

/* ELITE AUTHOR PAGE */

const authorPosts = posts
.map(p=>`<li><a href="${p.url}" style="font-weight:600;">${p.title}</a></li>`)
.join("");

const authorSchema = {
"@context":"https://schema.org",
"@type":"Person",
"name":"Justin Gerald",
"url":`${SITE_URL}/author/`,
"jobTitle":"Product Review Specialist",
"worksFor":{"@type":"Organization","name":"ReviewLab"}
};

const authorHTML = `
<!doctype html>
<html>
<head>
<title>Justin Gerald — Product Review Specialist</title>
<link rel="canonical" href="${SITE_URL}/author/">
<meta name="description" content="Justin Gerald is a product review specialist publishing data-driven software reviews and comparisons.">
<script type="application/ld+json">
${JSON.stringify(authorSchema)}
</script>
</head>
<body style="max-width:760px;margin:auto;font-family:system-ui;padding:40px;line-height:1.7;">

<h1>Justin Gerald</h1>

<p><strong>Product Review Specialist</strong></p>

<p>
Justin Gerald publishes independent software reviews, product breakdowns,
and comparison guides designed to help readers make confident buying decisions.
</p>

<h2>Latest Reviews</h2>

<ul>
${authorPosts}
</ul>

<p style="opacity:.6;margin-top:40px;">
${posts.length}+ published reviews
</p>

</body>
</html>
`;

fs.writeFileSync("author/index.html",authorHTML);

/* SAVE JSON */

fs.writeFileSync("_data/posts.json",JSON.stringify(posts,null,2));

console.log("✅ TOPIC SYSTEM REMOVED — AUTHOR PAGE UPGRADED");
