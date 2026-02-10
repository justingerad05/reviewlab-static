import fs from "fs";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";
import { upscaleToOG } from "./generate-og.js";

const FEED_URL =
"https://honestproductreviewlab.blogspot.com/feeds/posts/default?alt=atom";

const SITE_URL =
"https://justingerad05.github.io/reviewlab-static";

const CTA = `${SITE_URL}/og-cta-tested.jpg`;

/* SAFE CLEAN */

fs.rmSync("posts",{recursive:true,force:true});
fs.rmSync("topics",{recursive:true,force:true});
fs.rmSync("author",{recursive:true,force:true});

fs.mkdirSync("posts",{recursive:true});
fs.mkdirSync("topics",{recursive:true});
fs.mkdirSync("author",{recursive:true});
fs.mkdirSync("_data",{recursive:true});

/* FETCH */

const parser = new XMLParser({ignoreAttributes:false});
const xml = await (await fetch(FEED_URL)).text();
const data = parser.parse(xml);

let entries = data.feed.entry;
if(!Array.isArray(entries)) entries=[entries];

/* CATEGORY AUTHORITY NORMALIZER */

function normalizeCategory(text){

text = text.toLowerCase();

if(text.includes("review")) return "reviews";
if(text.includes("ai")) return "ai-tools";
if(text.includes("software")) return "software";
if(text.includes("tool")) return "software";

return "software"; // authority fallback
}

/* YOUTUBE IMAGE */

async function getImage(html,slug){

const match = html.match(/(?:youtube\\.com\\/embed\\/|watch\\?v=|youtu\\.be\\/)([a-zA-Z0-9_-]{11})/);

if(!match) return CTA;

const id = match[1];

const img=`https://img.youtube.com/vi/${id}/hqdefault.jpg`;

try{
const res = await fetch(img,{method:"HEAD"});
if(res.ok) return img;
}catch{}

const upscaled = await upscaleToOG(img,slug);
if(upscaled) return `${SITE_URL}/og-images/${slug}.jpg`;

return CTA;
}

const posts=[];

/* BUILD POSTS DATA */

for(const entry of entries){

const rawHtml = entry.content?.["#text"];
if(!rawHtml) continue;

const title = entry.title["#text"];

const slug = title
.toLowerCase()
.replace(/[^a-z0-9]+/g,"-")
.replace(/^-|-$/g,"");

const url = `${SITE_URL}/posts/${slug}/`;

const textOnly = rawHtml.replace(/<[^>]+>/g,"");

const category = normalizeCategory(textOnly);

const og = await getImage(rawHtml,slug);

posts.push({
title,
slug,
url,
html:rawHtml,
thumb:og,
category,
date:entry.published,
readTime:Math.max(1,Math.ceil(textOnly.split(/\s+/).length/200))
});
}

posts.sort((a,b)=> new Date(b.date)-new Date(a.date));

/* AUTHOR PAGE */

fs.writeFileSync("author/index.html",`
<!doctype html>
<html>
<head>
<title>Justin Gerald — AI Software Analyst</title>
<link rel="canonical" href="${SITE_URL}/author/">
<meta property="og:title" content="Justin Gerald — Trusted AI Reviewer">
<meta property="og:image" content="${CTA}">
</head>
<body style="max-width:820px;margin:auto;font-family:system-ui;padding:40px;">
<h1>Justin Gerald</h1>
<p>Independent analyst publishing deeply tested AI software reviews.</p>

<h2>Latest Reviews</h2>
<ul>
${posts.slice(0,10).map(p=>`<li><a href="${p.url}">${p.title}</a></li>`).join("")}
</ul>
</body>
</html>
`);

/* TOPIC PAGES — NO MORE 404 */

const topicMap={};

posts.forEach(p=>{
if(!topicMap[p.category]) topicMap[p.category]=[];
topicMap[p.category].push(p);
});

Object.keys(topicMap).forEach(topic=>{

fs.writeFileSync(`topics/${topic}.html`,`
<!doctype html>
<html>
<head>
<title>${topic} Reviews — ReviewLab</title>
<link rel="canonical" href="${SITE_URL}/topics/${topic}.html">
<meta property="og:title" content="${topic} Reviews">
<meta property="og:image" content="${CTA}">
</head>
<body style="max-width:760px;margin:auto;font-family:system-ui;padding:40px;">
<h1>${topic} Reviews</h1>
<ul>
${topicMap[topic].map(p=>`<li><a href="${p.url}">${p.title}</a></li>`).join("")}
</ul>
</body>
</html>
`);
});

/* BUILD POST PAGES — HOVER SAFE */

for(const post of posts){

fs.mkdirSync(`posts/${post.slug}`,{recursive:true});

const related = posts
.filter(p=>p.slug!==post.slug)
.slice(0,4)
.map(p=>`
<li>
<a href="${p.url}" class="related-link">
<img data-src="${p.thumb}" class="lazy related-thumb">
<span style="font-weight:600;">${p.title}</span>
</a>
</li>`).join("");

fs.writeFileSync(`posts/${post.slug}/index.html`,`
<!doctype html>
<html>
<head>
<title>${post.title}</title>

<style>

.related-thumb{
width:110px;
height:62px;
object-fit:cover;
border-radius:10px;
}

.lazy{opacity:0;transition:.3s;}
.lazy.loaded{opacity:1;}

.hover-preview{
position:absolute;
display:none;
width:420px;
border-radius:14px;
box-shadow:0 30px 80px rgba(0,0,0,.35);
z-index:9999;
pointer-events:none;
}

</style>
</head>

<body style="max-width:760px;margin:auto;font-family:system-ui;padding:40px;">

<nav>
<a href="${SITE_URL}">Home</a> › 
<a href="${SITE_URL}/topics/${post.category}.html">${post.category}</a>
</nav>

<h1>${post.title}</h1>

${post.html}

<hr>

<h3>Related Reviews</h3>

<ul style="list-style:none;padding:0;">
${related}
</ul>

<img id="hoverPreview" class="hover-preview"/>

<script>

document.addEventListener("DOMContentLoaded",()=>{

const io=new IntersectionObserver(entries=>{
entries.forEach(e=>{
if(e.isIntersecting){
const img=e.target;
img.src=img.dataset.src;
img.onload=()=>img.classList.add("loaded");
}
});
});

document.querySelectorAll(".lazy").forEach(i=>io.observe(i));

const hover=document.getElementById("hoverPreview");

document.querySelectorAll(".related-link").forEach(link=>{

const img=link.querySelector("img");
let timer;

link.addEventListener("mouseenter",()=>{
hover.src=img.dataset.src;
hover.style.display="block";
});

link.addEventListener("mousemove",e=>{
hover.style.top=(e.pageY+20)+"px";
hover.style.left=(e.pageX+20)+"px";
});

link.addEventListener("mouseleave",()=>{
hover.style.display="none";
});

link.addEventListener("touchstart",()=>{
timer=setTimeout(()=>{
hover.src=img.dataset.src;
hover.style.display="block";
hover.style.top="50%";
hover.style.left="50%";
hover.style.transform="translate(-50%,-50%)";
},350);
});

link.addEventListener("touchend",()=>{
clearTimeout(timer);
hover.style.display="none";
hover.style.transform="";
});

});

});

</script>

</body>
</html>
`);
}

/* SAVE JSON */

fs.writeFileSync("_data/posts.json",JSON.stringify(posts,null,2));

console.log("✅ BUILD STABLE — ZERO 404");
