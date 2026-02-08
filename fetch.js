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

fs.rmSync("posts",{recursive:true,force:true});
fs.rmSync("_data",{recursive:true,force:true});

fs.mkdirSync("posts",{recursive:true});
fs.mkdirSync("_data",{recursive:true});
fs.mkdirSync("og-images",{recursive:true});

const parser = new XMLParser({ignoreAttributes:false});
const xml = await (await fetch(FEED_URL)).text();
const data = parser.parse(xml);

let entries = data.feed.entry || [];
if(!Array.isArray(entries)) entries=[entries];

async function getYouTubeImages(html,slug){

 const match =
 html.match(/(?:youtube\.com\/embed\/|watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);

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

const posts=[];

for(const entry of entries){

 const html = entry.content?.["#text"];
 if(!html) continue;

 const title = entry.title["#text"];

 const slug = title
   .toLowerCase()
   .replace(/[^a-z0-9]+/g,"-")
   .replace(/^-|-$/g,"");

 const url = `${SITE_URL}/posts/${slug}/`;

 const description =
 html.replace(/<[^>]+>/g," ").slice(0,155);

 let ogImages = await getYouTubeImages(html,slug);
 if(!ogImages) ogImages=[CTA];
 if(!ogImages) ogImages=[DEFAULT];

 const primaryOG = ogImages[0];
 const thumb = ogImages.find(img=>img.includes("hqdefault")) || primaryOG;

 const textOnly = html.replace(/<[^>]+>/g,"");
 const readTime = Math.max(1, Math.ceil(textOnly.split(/\s+/).length / 200));

 posts.push({
   title,
   slug,
   html,
   url,
   description,
   og:primaryOG,
   thumb,
   readTime,
   date:entry.published
 });
}

posts.sort((a,b)=> new Date(b.date)-new Date(a.date));

for(const post of posts){

 fs.mkdirSync(`posts/${post.slug}`,{recursive:true});

 const related = posts
   .filter(p=>p.slug!==post.slug)
   .slice(0,4)
   .map(p=>`
<li>
<a href="${p.url}" class="related-link">
<img data-src="${p.thumb}" width="100" class="lazy">
${p.title} (~${p.readTime} min)
</a>
</li>`).join("");

 const page = `<!doctype html>
<html>
<head>

<meta charset="utf-8">
<title>${post.title}</title>

<meta name="viewport" content="width=device-width, initial-scale=1">

<style>

.lazy{opacity:0;transition:.3s;}
.lazy.loaded{opacity:1;}

.hover-preview{
position:absolute;
display:none;
max-width:260px;
border:2px solid #ccc;
z-index:9999;
pointer-events:none;
}

.related-link{
display:block;
padding:10px 0;
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

<img id="hoverPreview" class="hover-preview"/>

<script>

document.addEventListener("DOMContentLoaded",()=>{

const lazy=document.querySelectorAll(".lazy");

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

lazy.forEach(img=>io.observe(img));

});

const hover=document.getElementById("hoverPreview");

document.querySelectorAll(".related-link").forEach(link=>{

link.addEventListener("mouseover",e=>{
const img=link.querySelector("img");
if(!img) return;

hover.src=img.dataset.src;
hover.style.display="block";
hover.style.top=e.pageY+"px";
hover.style.left=e.pageX+"px";
});

link.addEventListener("mousemove",e=>{
hover.style.top=e.pageY+"px";
hover.style.left=e.pageX+"px";
});

link.addEventListener("mouseout",()=>{
hover.style.display="none";
});

/* TOUCH SUPPORT */

link.addEventListener("touchstart",()=>{
window.location.href = link.href;
});

});

</script>

</body>
</html>`;

 fs.writeFileSync(`posts/${post.slug}/index.html`,page);
}

fs.writeFileSync("_data/posts.json",JSON.stringify(posts,null,2));

console.log("✅ PHASE 16 COMPLETE — RELATED POSTS FULLY FIXED");
