import fs from "fs";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";
import { generateOG, upscaleToOG } from "./generate-og.js";

const FEED_URL =
"https://honestproductreviewlab.blogspot.com/feeds/posts/default?alt=atom";

const SITE_URL =
"https://justingerad05.github.io/reviewlab-static";

const CTA =
`${SITE_URL}/og-cta-tested.jpg`;

const DEFAULT =
`${SITE_URL}/og-default.jpg`;

/* CLEAN */

fs.rmSync("posts",{recursive:true,force:true});
fs.rmSync("_data",{recursive:true,force:true});

fs.mkdirSync("posts",{recursive:true});
fs.mkdirSync("_data",{recursive:true});
fs.mkdirSync("og-images",{recursive:true});

/* FETCH */

const parser = new XMLParser({ignoreAttributes:false});
const xml = await (await fetch(FEED_URL)).text();
const data = parser.parse(xml);

let entries = data.feed.entry || [];
if(!Array.isArray(entries)) entries=[entries];

/* =====================
   ELITE YOUTUBE ENGINE
===================== */

async function getYouTubeImages(html,slug){

 const match =
 html.match(/(?:youtube\.com\/embed\/|watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);

 if(!match) return null;

 const id = match[1];

 const candidates = [
   `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
   `https://img.youtube.com/vi/${id}/sddefault.jpg`,
   `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
   `https://img.youtube.com/vi/${id}/mqdefault.jpg`
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

/* =====================
   BUILD POSTS
===================== */

const posts=[];

for(const entry of entries){

 const html = entry.content?.["#text"];
 if(!html) continue;

 const title = entry.title["#text"];

 const slug = title
   .toLowerCase()
   .replace(/[^a-z0-9]+/g,"-")
   .replace(/^-|-$/g,"");

 const url =
 `${SITE_URL}/posts/${slug}/`;

 const description =
 html.replace(/<[^>]+>/g," ").slice(0,155);

/* IMAGE PRIORITY */

 let ogImages = await getYouTubeImages(html,slug);
 if(!ogImages) ogImages=[CTA];
 if(!ogImages) ogImages=[DEFAULT];
 if(!ogImages){
   await generateOG(slug,title);
   ogImages=[`${SITE_URL}/og-images/${slug}.jpg`];
 }

 const primaryOG = ogImages[0];

/* HOMEPAGE THUMBNAIL (small) */
const thumb = ogImages.find(img => img.includes("hqdefault.jpg")) || primaryOG;

/* CALCULATE READ TIME (words / 200 wpm) */
const textOnly = html.replace(/<[^>]+>/g,"");
const wordCount = textOnly.split(/\s+/).length;
const readTime = Math.max(1, Math.ceil(wordCount / 200));

/* BUILD MULTI OG TAGS */

 const ogMeta = ogImages.map(img=>`
<meta property="og:image" content="${img}">
<meta property="og:image:secure_url" content="${img}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
`).join("");

/* SCHEMA FOR GOOGLE DISCOVER */

 const schema = {
   "@context": "https://schema.org",
   "@type": "Article",
   "mainEntityOfPage": {
     "@type": "WebPage",
     "@id": url
   },
   "headline": title,
   "image": ogImages,
   "datePublished": entry.published,
   "author": {
     "@type": "Organization",
     "name": "ReviewLab"
   },
   "publisher": {
     "@type": "Organization",
     "name": "ReviewLab",
     "logo": {
       "@type": "ImageObject",
       "url": CTA
     }
   },
   "description": description
 };

 function detectTopic(title){

 title = title.toLowerCase();

 if(title.includes("website"))
   return "AI Website Builders";

 if(title.includes("copy") || title.includes("writer"))
   return "AI Copywriting";

 if(title.includes("video"))
   return "AI Video Tools";

 if(title.includes("image") || title.includes("art"))
   return "AI Image Generators";

 return "AI Tools";
}

const topic = detectTopic(title);

posts.push({
   title,
   slug,
   html,
   url,
   description,
   og:primaryOG,
   ogMeta,
   topic,
   date:entry.published
});
}

/* SORT */

posts.sort((a,b)=> new Date(b.date)-new Date(a.date));

/* BUILD PAGES */

for(const post of posts){

 fs.mkdirSync(`posts/${post.slug}`,{recursive:true});

 const related = posts
.filter(p=>p.slug!==post.slug && p.topic===post.topic)
.slice(0,4)
   .map(p=>`
<li>
<a href="${p.url}" title="Read for ~${p.readTime} min">
<img data-src="${p.thumb}" alt="${p.title}" width="100" class="lazy" style="vertical-align:middle;margin-right:10px;">
${post.title} (~${p.readTime} min)
</a>
</li>`).join("");

 const page = `<!doctype html>
<html>
<head>

<meta charset="utf-8">
<title>${post.title}</title>

<meta name="description" content="${post.description}">
<link rel="canonical" href="${post.url}">

<meta property="og:type" content="article">
<meta property="og:title" content="${post.title}">
<meta property="og:description" content="${post.description}">

${post.ogMeta}

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${post.og}">

<script type="application/ld+json">
${post.schema}
</script>

<style>
.lazy { opacity:0; transition: opacity 0.3s; }
.lazy.loaded { opacity:1; }
.hover-preview {
  position:absolute;
  display:none;
  max-width:300px;
  border:2px solid #ccc;
  z-index:1000;
}
</style>

</head>

<body style="max-width:760px;margin:auto;font-family:system-ui;padding:40px;line-height:1.7;">

<a href="${SITE_URL}">← Home</a>

<h1>${post.title}</h1>

${post.html}

<hr>

<h3>Related Reviews</h3>
<ul>${related}</ul>

<img id="hoverPreview" class="hover-preview" />

<script>
// Lazy-load images
document.addEventListener("DOMContentLoaded", function(){
  const lazyImgs = document.querySelectorAll(".lazy");
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        const img = entry.target;
        img.src = img.dataset.src;
        img.onload = ()=>img.classList.add("loaded");
        io.unobserve(img);
      }
    });
  });
  lazyImgs.forEach(img => io.observe(img));
});

// Hover preview
const hoverImg = document.getElementById("hoverPreview");
document.querySelectorAll("ul li a").forEach(a => {
  a.addEventListener("mouseover", e=>{
    const img = a.querySelector("img");
    if(img){
      hoverImg.src = img.dataset.src;
      hoverImg.style.display = "block";
      hoverImg.style.top = e.pageY + "px";
      hoverImg.style.left = e.pageX + "px";
    }
  });
  a.addEventListener("mousemove", e=>{
    hoverImg.style.top = e.pageY + "px";
    hoverImg.style.left = e.pageX + "px";
  });
  a.addEventListener("mouseout", ()=>{
    hoverImg.style.display = "none";
  });
});
</script>

</body>
</html>`;

 fs.writeFileSync(`posts/${post.slug}/index.html`,page);
}

/* SAVE POSTS JSON FOR HOMEPAGE */

fs.writeFileSync(
"_data/posts.json",
JSON.stringify(posts,null,2)
);

console.log("✅ AUTHORITY STACK PHASE 14 — LAZY-LOAD + HOVER PREVIEW + READ TIME ACTIVE");
