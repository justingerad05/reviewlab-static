import fs from "fs";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";
import { upscaleToOG } from "./generate-og.js";

const FEED_URL =
"https://honestproductreviewlab.blogspot.com/feeds/posts/default?alt=atom";

import site from "./_data/site.json" assert { type: "json" };

const SITE_URL = site.url;

const CTA = `${SITE_URL}/og-cta-tested.jpg`;
const DEFAULT = `${SITE_URL}/assets/og-default.jpg`;

/* CLEAN FULL BUILD */

fs.rmSync("_site", { recursive: true, force: true });
fs.mkdirSync("_site", { recursive: true });

/* RECREATE REQUIRED FOLDERS */

fs.mkdirSync("_site/posts", { recursive: true });
fs.mkdirSync("_site/ai-tools", { recursive: true });
fs.mkdirSync("_site/og-images", { recursive: true });
fs.mkdirSync("_site/author", { recursive: true });

/* FETCH */

const parser = new XMLParser({ignoreAttributes:false});
const xml = await (await fetch(FEED_URL)).text();
const data = parser.parse(xml);

let entries = data.feed.entry || [];
if(!Array.isArray(entries)) entries=[entries];

/* YOUTUBE IMAGE ENGINE */

async function getYouTubeImages(html,slug){

const match = html.match(/(?:youtube\.com\/embed\/|watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
if(!match) return [DEFAULT];

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

/* SEMANTIC INTERNAL LINK GRAPH */

function scoreSimilarity(a,b){
const aw = a.toLowerCase().split(/\W+/);
const bw = b.toLowerCase().split(/\W+/);
return aw.filter(w=>bw.includes(w)).length;
}

function injectInternalLinks(html, posts, current){

const ranked = posts
.filter(p=>p.slug!==current.slug)
.map(p=>({post:p,score:scoreSimilarity(current.title,p.title)}))
.sort((a,b)=>b.score-a.score)
.slice(0,5)
.map(r=>r.post);

let enriched = html;

ranked.forEach(p=>{
const keyword = p.title.split(" ").slice(0,2).join(" ");
const regex = new RegExp(`\\b(${keyword})\\b`,"i");

if(regex.test(enriched)){
enriched = enriched.replace(regex,
`<a href="${p.url}" style="font-weight:600;">$1</a>`
);
}
});

return enriched;
}

/* PROS / CONS */

function extractProsCons(text){

const sentences = text.split(/[.!?]/);

const pros=[];
const cons=[];

sentences.forEach(s=>{
const t=s.toLowerCase();

if(t.includes("easy")||t.includes("fast")||t.includes("powerful")||t.includes("excellent")||t.includes("simple")){
pros.push(s.trim());
}

if(t.includes("expensive")||t.includes("slow")||t.includes("difficult")||t.includes("limited")||t.includes("problem")){
cons.push(s.trim());
}
});

return {
pros:pros.slice(0,3),
cons:cons.slice(0,3)
};
}

const posts=[];

function detectTopic(title){

 const t = title.toLowerCase();

 if(t.includes("writer") || t.includes("copy"))
   return "ai-writing-tools";

 if(t.includes("image") || t.includes("art"))
   return "ai-image-generators";

 if(t.includes("automation"))
   return "automation-tools";

 return "ai-writing-tools";
}

/* BUILD DATA */

for(const entry of entries){

const rawHtml = entry.content?.["#text"];
if(!rawHtml) continue;

const title = entry.title["#text"];

const slug = title.toLowerCase()
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

/* SCHEMA */

const productSchema = {
"@context":"https://schema.org",
"@type":"Product",
"name":title,
"image":primaryOG,
"brand":{"@type":"Brand","name":title.split(" ")[0]},
"review":{
 "@type":"Review",
 "author":{"@type":"Person","name":"Justin Gerald"},
 "reviewBody": description,
 "positiveNotes": pros,
 "negativeNotes": cons
}
};

const articleSchema = {
"@context":"https://schema.org",
"@type":"Article",
"headline":title,
"image":primaryOG,
"datePublished":entry.published,
"dateModified": new Date().toISOString(),
"author":{"@type":"Person","name":"Justin Gerald","url":`${SITE_URL}/author/`},
"publisher":{
"@type":"Organization",
"name":"ReviewLab",
"logo":{"@type":"ImageObject","url":CTA}
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
lastmod: new Date().toISOString(),
category: detectTopic(title),
schemas:JSON.stringify([articleSchema,productSchema])
});
}

/* APPLY LINKS */

posts.forEach(p=>{
p.html = injectInternalLinks(p.html,posts,p);
});

posts.sort((a,b)=> new Date(b.date)-new Date(a.date));

/* AUTO COMPARISON ENGINE */

function generateComparison(postA, postB){

 const slug = `${postA.slug}-vs-${postB.slug}`;

 const html = `
<h1>${postA.title} vs ${postB.title}</h1>

<p>Detailed comparison between these two tools.</p>

<h2>Feature Comparison</h2>

<table border="1" cellpadding="8">
<tr>
<th>Feature</th>
<th>${postA.title}</th>
<th>${postB.title}</th>
</tr>
<tr>
<td>Pricing</td>
<td>${postA.pricing || "See review"}</td>
<td>${postB.pricing || "See review"}</td>
</tr>
</table>
`;

 fs.mkdirSync(`_site/posts/comparisons/${slug}`,{recursive:true});
 fs.writeFileSync(`_site/posts/comparisons/${slug}/index.html`,html);
}

for(let i=0;i<posts.length;i++){
 for(let j=i+1;j<posts.length;j++){
   generateComparison(posts[i],posts[j]);
 }
}

function generateTopList(category, posts){

 const filtered = posts.filter(p=>p.category===category);

 const top = filtered.slice(0,10);

 const list = top.map((p,i)=>`
<li>
${i+1}. <a href="${p.url}">${p.title}</a>
</li>`).join("");

 fs.mkdirSync(`_site/ai-tools/${category}`,{recursive:true});

 fs.writeFileSync(`_site/ai-tools/${category}/top-10.html`, `
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Top 10 ${category.replace(/-/g," ")}</title>
</head>
<body style="max-width:760px;margin:auto;font-family:system-ui;padding:40px;">
<h1>Top 10 ${category.replace(/-/g," ")}</h1>
<ol>${list}</ol>
</body>
</html>
`);
}

generateTopList("ai-writing-tools", posts);
generateTopList("ai-image-generators", posts);
generateTopList("automation-tools", posts);

/* AUTHORITY HUB GENERATOR */

const topics = {};

posts.forEach(p=>{
 if(!topics[p.category]) topics[p.category]=[];
 topics[p.category].push(p);
});
 
/* BUILD POSTS */

for(const post of posts){

fs.mkdirSync(`_site/posts/${post.slug}`,{recursive:true});

/* SAFE RECOMMENDATION ENGINE */

const relatedPosts = posts
.filter(p=>p.slug!==post.slug)
.slice(0,4);

let inlinePosts = posts
.filter(p=>p.slug!==post.slug && !relatedPosts.some(r=>r.slug===p.slug))
.slice(0,3);

/* HARD fallback — guarantees links always render */

if(inlinePosts.length < 3){
inlinePosts = posts
.filter(p=>p.slug!==post.slug)
.slice(0,3);
}

const inlineRecs = inlinePosts
.map(p=>`<li><a href="${p.url}" style="font-weight:600;">${p.title}</a></li>`)
.join("");

const related = relatedPosts
.map(p=>`
<li>
<a href="${p.url}" class="related-link">
<img data-src="${p.thumb}" width="110" class="lazy" alt="${p.title}" />
<span style="font-weight:600;">${p.title} (~${p.readTime} min)</span>
</a>
</li>`).join("");

 const category = post.category || "ai-writing-tools";
const categoryTitle = category.replace(/-/g," ");

const breadcrumbHTML = `
<nav style="font-size:14px;margin-bottom:20px;">
<a href="${SITE_URL}">Home</a> › 
<a href="${SITE_URL}/ai-tools/">AI Tools</a> › 
<a href="${SITE_URL}/ai-tools/${category}/">${categoryTitle}</a> › 
${post.title}
</nav>
`;

const breadcrumbSchema = `
<script type="application/ld+json">
{
"@context":"https://schema.org",
"@type":"BreadcrumbList",
"itemListElement":[
{
"@type":"ListItem",
"position":1,
"name":"Home",
"item":"${SITE_URL}"
},
{
"@type":"ListItem",
"position":2,
"name":"AI Tools",
"item":"${SITE_URL}/ai-tools/"
},
{
"@type":"ListItem",
"position":3,
"name":"${categoryTitle}",
"item":"${SITE_URL}/ai-tools/${category}/"
},
{
"@type":"ListItem",
"position":4,
"name":"${post.title}",
"item":"${post.url}"
}
]
}
</script>
`;

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
<meta property="og:image" content="${SITE_URL}/assets/og-default.jpg">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${post.og}">

<script type="application/ld+json">
${post.schemas}
</script>

<style>
.lazy{opacity:0;transition:.3s;border-radius:10px;}
.lazy.loaded{opacity:1;}
.related-link{display:flex;align-items:center;gap:14px;text-decoration:none;color:inherit;padding:12px 0;}
.hover-preview{position:absolute;display:none;max-width:420px;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.25);z-index:9999;pointer-events:none;}
</style>

</head>
<body style="max-width:760px;margin:auto;font-family:system-ui;padding:40px;line-height:1.7;">

${breadcrumbHTML}
${breadcrumbSchema}
 
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
let touchTimer;

link.addEventListener("mouseover",()=>{
hover.src=img.dataset.src;
hover.style.display="block";
});

link.addEventListener("mousemove",e=>{
hover.style.top=(e.pageY+20)+"px";
hover.style.left=(e.pageX+20)+"px";
});

link.addEventListener("mouseout",()=>hover.style.display="none");

link.addEventListener("touchstart",()=>{
touchTimer=setTimeout(()=>{
hover.src=img.dataset.src;
hover.style.display="block";
hover.style.top="40%";
hover.style.left="50%";
hover.style.transform="translate(-50%,-50%)";
},350);
});

link.addEventListener("touchend",()=>{
clearTimeout(touchTimer);
hover.style.display="none";
});

});

});
</script>

</body>
</html>`;

fs.writeFileSync(`_site/posts/${post.slug}/index.html`,page);
}

/* BUILD CATEGORY (AI TOOLS) PAGES — RUN ONCE */

for (const topic in topics) {

  const list = topics[topic]
    .map(p => `<li><a href="${p.url}">${p.title}</a></li>`)
    .join("");

  const topicTitle = topic.replace(/-/g, " ");
  const topicURL = `${SITE_URL}/ai-tools/${topic}/`;

  const html = `
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${topicTitle}</title>
<link rel="canonical" href="${topicURL}">
<meta name="description" content="Expert reviews and comparisons for ${topicTitle}.">
</head>

<body style="max-width:760px;margin:auto;font-family:system-ui;padding:40px;line-height:1.7;">

<nav>
<a href="${SITE_URL}/">Home</a> › 
<a href="${SITE_URL}/ai-tools/">AI Tools</a> › 
${topicTitle}
</nav>

<h1>${topicTitle}</h1>

<ul>
${list}
</ul>

</body>
</html>
`;

  const outputDir = `_site/ai-tools/${topic}`;
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(`${outputDir}/index.html`, html);
}

/* FULL AUTHORITY AUTHOR PAGE RESTORED */

const authorPosts = posts.map(p=>`
<li style="margin-bottom:18px;">
<a href="${p.url}" style="font-weight:700;font-size:18px;">${p.title}</a>
<div style="opacity:.6;font-size:13px;">${p.readTime} min read</div>
</li>`).join("");

fs.mkdirSync(`_site/author`,{recursive:true});
 
fs.writeFileSync(`_site/author/index.html`,`
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Justin Gerald — Product Review Analyst</title>
<link rel="canonical" href="${SITE_URL}/author/">
<script type="application/ld+json">
{
 "@context":"https://schema.org",
 "@type":"Person",
 "name":"Justin Gerald",
 "url":"${SITE_URL}/author/",
 "jobTitle":"Product Review Analyst",
 "worksFor":{
   "@type":"Organization",
   "name":"ReviewLab"
 }
}
</script>
</head>
<body style="max-width:760px;margin:auto;font-family:system-ui;padding:40px;line-height:1.7;">

<h1 style="font-size:42px;margin-bottom:6px;">Justin Gerald</h1>
<p style="font-size:18px;opacity:.75;margin-top:0;">
Independent product review analyst focused on deep research,
real-world testing signals, and buyer-intent software evaluation.
</p>

<div style="background:#fafafa;padding:20px;border-radius:14px;margin:26px 0;">
<strong>Editorial Integrity:</strong>
<p style="margin-top:8px;">
Every review published on ReviewLab is created through structured analysis,
feature verification, market comparison, and user-benefit evaluation.
No automated ratings. No anonymous authorship.
</p>
</div>

<h2>Latest Reviews</h2>

<ul style="list-style:none;padding:0;">
${authorPosts}
</ul>

</body>
</html>
`);

fs.writeFileSync("_data/posts.json",JSON.stringify(posts,null,2));

/* =========================
   HOMEPAGE — YOUR ORIGINAL DESIGN (STATIC BUILD)
========================= */

const homepagePosts = posts.map(post => `
<li class="post-card">

<a href="${post.url}" style="display:flex;align-items:center;gap:16px;text-decoration:none;color:inherit;">

<img data-src="${post.thumb}"
alt="${post.title}"
class="thumb lazy">

<div>
<div class="post-title">
${post.title} (~${post.readTime} min)
</div>

<div class="meta">
Published ${new Date(post.date).toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})}
</div>
</div>

</a>

</li>
`).join("");

const homepage = `
---
layout: null
---

<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">

<title>ReviewLab – Honest AI Tool Reviews</title>

<meta name="description"
content="ReviewLab publishes deeply tested AI software reviews, real verdicts, and zero-hype product analysis.">

<meta name="viewport"
content="width=device-width, initial-scale=1">

<link rel="canonical"
href="https://justingerad05.github.io/reviewlab-static/">

<meta property="og:type" content="website">
<meta property="og:title" content="ReviewLab – Honest AI Tool Reviews">
<meta property="og:description"
content="Real testing. No hype. Just software that actually delivers.">

<meta property="og:url"
content="https://justingerad05.github.io/reviewlab-static/">

<meta property="og:image"
content="https://justingerad05.github.io/reviewlab-static/og-default.jpg">

<meta property="og:image:secure_url"
content="https://justingerad05.github.io/reviewlab-static/og-default.jpg">

<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image"
content="https://justingerad05.github.io/reviewlab-static/og-default.jpg">

<script type="application/ld+json">
{
"@context":"https://schema.org",
"@type":"Organization",
"name":"ReviewLab",
"url":"https://justingerad05.github.io/reviewlab-static/",
"logo":"https://justingerad05.github.io/reviewlab-static/og-default.jpg"
}
</script>

<script type="application/ld+json">
{
"@context":"https://schema.org",
"@type":"WebSite",
"url":"https://justingerad05.github.io/reviewlab-static/",
"name":"ReviewLab",
"potentialAction":{
 "@type":"SearchAction",
 "target":"https://justingerad05.github.io/reviewlab-static/?q={search_term_string}",
 "query-input":"required name=search_term_string"
}
}
</script>

<style>
/* YOUR CSS IS 100% UNCHANGED */
body{
  margin:0;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Inter,sans-serif;
  background:#020617;
  color:#e5e7eb;
}
.container{max-width:900px;margin:auto;padding:40px 20px;}
h1{font-size:42px;margin-bottom:10px;}
.sub{color:#94a3b8;margin-bottom:40px;}
.post-list{list-style:none;padding:0;}
.post-card{display:flex;align-items:center;gap:16px;padding:14px;border-radius:14px;transition:.25s;}
.post-card:hover{background:#07122a;}
.thumb{width:120px;height:68px;object-fit:cover;border-radius:10px;flex-shrink:0;}
.lazy{opacity:0;transition:opacity .35s;}
.lazy.loaded{opacity:1;}
.post-title{color:#38bdf8;text-decoration:none;font-weight:700;font-size:20px;}
.post-title:hover{text-decoration:underline;}
.meta{font-size:13px;color:#94a3b8;margin-top:4px;}
.hover-preview{position:absolute;display:none;width:340px;border-radius:14px;box-shadow:0 25px 70px rgba(0,0,0,.55);z-index:9999;pointer-events:none;}
.email-capture{margin:70px 0;padding:38px;border-radius:18px;background:linear-gradient(145deg,#020617,#07122a);border:1px solid #1e293b;box-shadow:0 10px 40px rgba(0,0,0,.45);text-align:center;}
.email-capture h3{font-size:28px;margin-bottom:10px;}
.email-capture p{color:#94a3b8;margin-bottom:22px;}
.form-row{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;}
.email-capture input{padding:14px;border-radius:10px;border:1px solid #334155;background:#020617;color:white;min-width:260px;font-size:16px;}
.email-capture button{padding:14px 20px;border-radius:10px;border:none;font-weight:700;cursor:pointer;background:#22c55e;color:#020617;}
.trust{margin-top:12px;font-size:13px;color:#64748b;}
</style>
</head>

<body>

<div class="container">

<h1>Latest AI Tool Reviews & Honest Software Analysis</h1>
<p class="sub">Real testing. No hype. Just software that actually delivers.</p>

<section class="email-capture">
<h3>Get Honest AI Tool Reviews</h3>
<p>No fluff. No sponsored bias. Only tools worth your time.</p>

<form 
action="https://docs.google.com/forms/d/e/1FAIpQLSchzs0bE9se3YCR2TTiFl3Ohi0nbx0XPBjvK_dbANuI_eI1Aw/formResponse"
method="POST"
target="_blank"
>
<div class="form-row">
<input type="email" name="entry.364499249" placeholder="Enter your email address" required>
<button type="submit">Get Free Reviews</button>
</div>
<div class="trust">Join smart readers staying ahead of AI.</div>
</form>
</section>

<ul class="post-list">
{% for post in site.data.posts %}
<li class="post-card">
<a href="{{ post.url }}" style="display:flex;align-items:center;gap:16px;text-decoration:none;color:inherit;">
<img data-src="{{ post.thumb }}" alt="{{ post.title }}" class="thumb lazy">
<div>
<div class="post-title">
{{ post.title }} (~{{ post.readTime }} min)
</div>
<div class="meta">
Published {{ post.date }}
</div>
</div>
</a>
</li>
{% endfor %}
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
document.querySelectorAll(".post-card a").forEach(link=>{
const img=link.querySelector("img");
let touchTimer;
link.addEventListener("mouseover",()=>{hover.src=img.dataset.src;hover.style.display="block";});
link.addEventListener("mousemove",e=>{hover.style.top=(e.pageY+20)+"px";hover.style.left=(e.pageX+20)+"px";});
link.addEventListener("mouseout",()=>{hover.style.display="none";});
link.addEventListener("touchstart",()=>{touchTimer=setTimeout(()=>{hover.src=img.dataset.src;hover.style.display="block";hover.style.top="50%";hover.style.left="50%";hover.style.transform="translate(-50%,-50%)";},350);});
link.addEventListener("touchend",()=>{clearTimeout(touchTimer);hover.style.display="none";hover.style.transform="";});
});
});
</script>

</div>
</body>
</html>
`;

fs.writeFileSync("_site/index.html", homepage);

console.log("✅ MASTER BUILD — STABLE, SAFE, AND FUTURE-PROOF");
