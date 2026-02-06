import fs from "fs";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";
import { generateOG } from "./generate-og.js";

/* CONFIG */

const FEED_URL =
"https://honestproductreviewlab.blogspot.com/feeds/posts/default?alt=atom";

const SITE_URL="https://justingerad05.github.io/reviewlab-static";

/* SAFE BUILD DIR */

const BUILD_DIR="build-posts";

if(fs.existsSync(BUILD_DIR)){
fs.rmSync(BUILD_DIR,{recursive:true,force:true});
}

fs.mkdirSync(BUILD_DIR,{recursive:true});

/* FETCH */

const parser=new XMLParser({ignoreAttributes:false});
const res=await fetch(FEED_URL);
const xml=await res.text();
const data=parser.parse(xml);

let entries=data.feed?.entry||[];
if(!Array.isArray(entries)) entries=[entries];

const strip=html=>html.replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();

const slugify=str=>
str.toLowerCase()
.replace(/[^a-z0-9]+/g,"-")
.replace(/^-+|-+$/g,"")
.slice(0,70);

const posts=[];

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

/* BUILD */

for(const post of posts){

const {title,slug,html,url,date}=post;

await generateOG(slug,title);

const ogImage=`${SITE_URL}/og-images/${slug}.png`;

const description=strip(html).slice(0,155);

const dir=`${BUILD_DIR}/${slug}`;
fs.mkdirSync(dir,{recursive:true});

const schema={
"@context":"https://schema.org",
"@type":"Review",
itemReviewed:{
"@type":"SoftwareApplication",
name:title
},
author:{
"@type":"Organization",
name:"ReviewLab Editorial"
},
reviewRating:{
"@type":"Rating",
ratingValue:"4.6",
bestRating:"5"
}
};

const page = `---
title: "${title.replace(/"/g, '\\"')}"
date: "${new Date(date).toISOString()}"
layout: false
---

<!DOCTYPE html>
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

<script type="application/ld+json">
${JSON.stringify(schema)}
</script>

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

.hero{
width:100%;
border-radius:14px;
margin-bottom:30px;
}

.slim{
margin:45px 0;
padding:14px;
border:1px solid #1e293b;
border-radius:10px;
display:flex;
gap:10px;
justify-content:center;
flex-wrap:wrap;
}

.slim input{
padding:10px;
border-radius:8px;
border:1px solid #334155;
background:#020617;
color:white;
}

.slim button{
padding:10px 14px;
border:none;
border-radius:8px;
background:#22c55e;
font-weight:700;
}

</style>

</head>
<body>

<img class="hero" src="${ogImage}" alt="${title}">

<h1>${title}</h1>

${html}

<section class="slim">

<form 
action="https://docs.google.com/forms/d/e/1FAIpQLSchzs0bE9se3YCR2TTiFl3Ohi0nbx0XPBjvK_dbANuI_eI1Aw/formResponse"
method="POST"
target="_blank"
>

<input
type="email"
name="entry.364499249"
placeholder="Enter email for elite tools"
required
>

<button>Subscribe</button>

</form>

</section>

</body>
</html>`;

fs.writeFileSync(`${dir}/index.html`,page);
}

/* SAFE SWAP */

if(fs.existsSync("posts")){
fs.rmSync("posts",{recursive:true,force:true});
}

fs.renameSync(BUILD_DIR,"posts");

console.log("✅ AUTHORITY ENGINE STABLE — POSTS GENERATED");
