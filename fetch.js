import fs from "fs";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";
import { generateOG } from "./generate-og.js";

/* CONFIG */

const FEED_URL =
"https://honestproductreviewlab.blogspot.com/feeds/posts/default?alt=atom";

const SITE_URL="https://justingerad05.github.io/reviewlab-static";
const SITE_NAME="ReviewLab";
const AUTHOR_NAME="ReviewLab Editorial";

/* INIT */

fs.rmSync("posts",{recursive:true,force:true});
fs.rmSync("tags",{recursive:true,force:true});
fs.rmSync("_data",{recursive:true,force:true});

fs.mkdirSync("posts",{recursive:true});
fs.mkdirSync("tags",{recursive:true});
fs.mkdirSync("og-images",{recursive:true});
fs.mkdirSync("_data",{recursive:true});

/* FETCH */

const parser=new XMLParser({ignoreAttributes:false});
const res=await fetch(FEED_URL);
const xml=await res.text();
const data=parser.parse(xml);

let entries=data.feed?.entry||[];
if(!Array.isArray(entries)) entries=[entries];

const posts=[];
const tagMap={};

/* UTIL */

const strip=html=>html.replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();

const slugify=str=>
str.toLowerCase()
.replace(/[^a-z0-9]+/g,"-")
.replace(/^-+|-+$/g,"")
.slice(0,70);

const buildDescription=html=>strip(html).slice(0,155);

/* COLLECT */

for(const entry of entries){

const html=entry.content?.["#text"];
if(!html) continue;

const title=entry.title?.["#text"]||"Untitled Review";
const slug=slugify(title);
const url=`${SITE_URL}/posts/${slug}/`;

posts.push({
title,
slug,
url,
html,
date:entry.published||new Date().toISOString()
});
}

/* RELATED */

const related=slug=>
posts
.filter(p=>p.slug!==slug)
.slice(0,4)
.map(p=>`<li><a href="${p.url}">${p.title}</a></li>`)
.join("");

/* BUILD POSTS */

for(const post of posts){

const {title,slug,html,url,date}=post;

await generateOG(slug,title);

const ogImage=`${SITE_URL}/og-images/${slug}.png`;
const description=buildDescription(html);

const dir=`posts/${slug}`;
fs.mkdirSync(dir,{recursive:true});

const page=`<!DOCTYPE html>
<html>
<head>

<meta charset="UTF-8">
<title>${title}</title>

<meta name="description" content="${description}">
<link rel="canonical" href="${url}">

<meta property="og:type" content="article">
<meta property="og:title" content="${title}">
<meta property="og:image" content="${ogImage}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${url}">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${ogImage}">

<style>

body{
max-width:760px;
margin:auto;
padding:40px 20px;
font-family:Inter,system-ui;
background:#020617;
color:#e5e7eb;
line-height:1.75;
}

h1{
font-size:42px;
margin-bottom:30px;
}

.hero{
width:100%;
border-radius:14px;
margin-bottom:30px;
}

/* SLIM EMAIL */

.slim-email{
margin:45px 0;
padding:16px;
border-radius:12px;
border:1px solid #1e293b;
display:flex;
gap:10px;
justify-content:center;
flex-wrap:wrap;
}

.slim-email input{
padding:10px;
border-radius:8px;
border:1px solid #334155;
background:#020617;
color:white;
}

.slim-email button{
padding:10px 14px;
border:none;
border-radius:8px;
background:#22c55e;
font-weight:700;
}

/* AUTHORITY BOX */

.authority{
margin-top:70px;
padding:24px;
border-radius:14px;
background:#07122a;
border:1px solid #1e293b;
}

a{color:#38bdf8}

</style>

</head>
<body>

<img class="hero" src="${ogImage}" alt="${title}">

<h1>${title}</h1>

${html}

/* SLIM CAPTURE */

<section class="slim-email">

<form 
action="https://docs.google.com/forms/d/e/1FAIpQLSchzs0bE9se3YCR2TTiFl3Ohi0nbx0XPBjvK_dbANuI_eI1Aw/formResponse"
method="POST"
target="_blank"
>

<input
type="email"
name="entry.364499249"
placeholder="Enter email for winning tools"
required
>

<button>Subscribe</button>

</form>

</section>

<section class="authority">

<strong>ReviewLab Editorial</strong>

<p>
Every tool reviewed on ReviewLab undergoes structured analysis,
feature breakdown, and real-world positioning — so readers can make
confident software decisions.
</p>

</section>

<h2>Related Reviews</h2>
<ul>${related(slug)}</ul>

</body>
</html>`;

fs.writeFileSync(`${dir}/index.html`,page);
}

/* SITEMAP */

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

console.log("✅ AUTHORITY ENGINE v14 LIVE");
