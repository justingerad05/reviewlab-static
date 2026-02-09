import fs from "fs";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";
import { upscaleToOG } from "./generate-og.js";

const FEED_URL="https://honestproductreviewlab.blogspot.com/feeds/posts/default?alt=atom";
const SITE_URL="https://justingerad05.github.io/reviewlab-static";

const CTA=`${SITE_URL}/og-cta-tested.jpg`;
const DEFAULT=`${SITE_URL}/og-default.jpg`;

/* CLEAN BUILD */
["posts","_data","author","topics","comparisons"]
.forEach(dir=>fs.rmSync(dir,{recursive:true,force:true}));

["posts","_data","og-images","author","topics","comparisons"]
.forEach(dir=>fs.mkdirSync(dir,{recursive:true}));

/* FETCH */
const parser=new XMLParser({ignoreAttributes:false});
const xml=await (await fetch(FEED_URL)).text();
const data=parser.parse(xml);

let entries=data.feed.entry||[];
if(!Array.isArray(entries)) entries=[entries];

/* YOUTUBE */
async function getYouTubeImages(html,slug){
 const match=html.match(/(?:youtube\.com\/embed\/|watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
 if(!match) return null;

 const id=match[1];

 const candidates=[
   `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
   `https://img.youtube.com/vi/${id}/sddefault.jpg`,
   `https://img.youtube.com/vi/${id}/hqdefault.jpg`
 ];

 const valid=[];
 for(const img of candidates){
   try{
     const res=await fetch(img,{method:"HEAD"});
     if(res.ok) valid.push(img);
   }catch{}
 }

 if(valid.length===0){
   const upscaled=await upscaleToOG(`https://img.youtube.com/vi/${id}/hqdefault.jpg`,slug);
   if(upscaled) return [`${SITE_URL}/og-images/${slug}.jpg`];
   return null;
 }

 return valid;
}

/* CATEGORY */
function extractCategories(text){
 const words=text.toLowerCase().match(/\b[a-z]{4,}\b/g)||[];
 const freq={};
 words.forEach(w=>freq[w]=(freq[w]||0)+1);

 return Object.entries(freq)
   .sort((a,b)=>b[1]-a[1])
   .slice(0,3)
   .map(e=>e[0]);
}

/* INTERNAL LINK GRAPH */
function injectInternalLinks(html,posts,currentSlug){
 let enriched=html;

 posts.filter(p=>p.slug!==currentSlug).slice(0,5).forEach(p=>{
   const keyword=p.title.split(" ")[0];
   const regex=new RegExp(`\\b(${keyword})\\b`,"i");

   if(regex.test(enriched)){
     enriched=enriched.replace(regex,
       `<a href="${p.url}" style="font-weight:600;">$1</a>`
     );
   }
 });

 return enriched;
}

const posts=[];

/* BUILD DATA */
for(const entry of entries){

 const rawHtml=entry.content?.["#text"];
 if(!rawHtml) continue;

 const title=entry.title["#text"];

 const slug=title
   .toLowerCase()
   .replace(/[^a-z0-9]+/g,"-")
   .replace(/^-|-$/g,"");

 const url=`${SITE_URL}/posts/${slug}/`;

 const description=rawHtml.replace(/<[^>]+>/g," ").slice(0,155);

 let ogImages=await getYouTubeImages(rawHtml,slug);
 if(!ogImages) ogImages=[CTA]; // correct fallback

 const primaryOG=ogImages[0] || DEFAULT;
 const thumb=ogImages.find(img=>img.includes("hqdefault")) || primaryOG;

 const textOnly=rawHtml.replace(/<[^>]+>/g,"");
 const readTime=Math.max(1,Math.ceil(textOnly.split(/\s+/).length/200));

 const categories=extractCategories(textOnly);
 const primaryCategory=categories[0] || "reviews";

 /* SCHEMA */
 const schemas=JSON.stringify([
 {
   "@context":"https://schema.org",
   "@type":"Article",
   headline:title,
   image:ogImages,
   datePublished:entry.published,
   dateModified:new Date().toISOString(),
   author:{"@type":"Person","name":"Justin Gerald","url":`${SITE_URL}/author/`},
   publisher:{"@type":"Organization","name":"ReviewLab","logo":{"@type":"ImageObject","url":CTA}},
   description,
   keywords:categories.join(", "),
   mainEntityOfPage:{"@id":url}
 }
 ]);

 posts.push({
   title,slug,html:rawHtml,url,description,
   og:primaryOG,thumb,readTime,
   date:entry.published,
   category:primaryCategory,
   schemas
 });
}

/* APPLY LINKS */
posts.forEach(p=>p.html=injectInternalLinks(p.html,posts,p.slug));
posts.sort((a,b)=>new Date(b.date)-new Date(a.date));

/* BUILD POSTS */
for(const post of posts){

 fs.mkdirSync(`posts/${post.slug}`,{recursive:true});

 const inlineRecs=posts
   .filter(p=>p.slug!==post.slug)
   .slice(0,3)
   .map(p=>`<li><a href="${p.url}" style="font-weight:600;">${p.title}</a></li>`)
   .join("");

 const related=posts
   .filter(p=>p.slug!==post.slug)
   .slice(0,4)
   .map(p=>`
<li>
<a href="${p.url}" class="related-link">
<img data-src="${p.thumb}" class="lazy related-thumb" alt="${p.title}">
<span class="related-title">${p.title} (~${p.readTime} min)</span>
</a>
</li>`).join("");

 const page=`<!doctype html>
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

<script type="application/ld+json">${post.schemas}</script>

<style>

.lazy{
 opacity:0;
 transition:opacity .35s ease;
}

.lazy.loaded{
 opacity:1;
}

.related-link{
 display:flex;
 align-items:center;
 gap:14px;
 text-decoration:none;
 color:inherit;
 padding:14px 0;
 position:relative;
}

.related-thumb{
 width:110px;
 height:68px;
 object-fit:cover;
 border-radius:10px;
 flex-shrink:0;
 background:#eee;
}

.related-title{
 font-weight:600;
}

.hover-preview{
 position:absolute;
 display:none;
 width:420px;
 border-radius:14px;
 box-shadow:0 30px 80px rgba(0,0,0,.28);
 z-index:9999;
 pointer-events:none;
}

</style>
</head>

<body style="max-width:760px;margin:auto;font-family:system-ui;padding:40px;line-height:1.7;">

<nav style="font-size:14px;margin-bottom:20px;">
<a href="${SITE_URL}">Home</a> › 
<a href="${SITE_URL}/topics/${post.category}.html">${post.category}</a> › 
${post.title}
</nav>

<h1>${post.title}</h1>

<p style="opacity:.7;font-size:14px;">
By <a href="${SITE_URL}/author/">Justin Gerald</a> • ${post.readTime} min read
</p>

${post.html}

<div style="margin:40px 0;padding:20px;border-radius:14px;background:#fafafa;">
<strong>You may also like:</strong>
<ul>${inlineRecs}</ul>
</div>

<hr>

<h3>Related Reviews</h3>
<ul style="list-style:none;padding:0;">${related}</ul>

<img id="hoverPreview" class="hover-preview"/>

<script>
document.addEventListener("DOMContentLoaded",()=>{

/* LAZY */
const imgs=document.querySelectorAll(".lazy");

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

imgs.forEach(img=>io.observe(img));

/* HOVER ENGINE */
const hover=document.getElementById("hoverPreview");

document.querySelectorAll(".related-link").forEach(link=>{

 const img=link.querySelector("img");

 link.addEventListener("mousemove",e=>{
   hover.style.display="block";
   hover.src=img.dataset.src;
   hover.style.top=(e.pageY+20)+"px";
   hover.style.left=(e.pageX+20)+"px";
 });

 link.addEventListener("mouseleave",()=>{
   hover.style.display="none";
 });

});
});
</script>

</body>
</html>`;

 fs.writeFileSync(`posts/${post.slug}/index.html`,page);
}

/* SAVE JSON */
fs.writeFileSync("_data/posts.json",JSON.stringify(posts,null,2));

console.log("✅ MASTER BUILD STABLE — ARCHITECTURE PRESERVED");
