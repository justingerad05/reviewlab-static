import fs from "fs";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";
import crypto from "crypto";
import { upscaleToOG } from "./generate-og.js";

const FEED_URL="https://honestproductreviewlab.blogspot.com/feeds/posts/default?alt=atom";
const SITE_URL="https://justingerad05.github.io/reviewlab-static";

const CTA=`${SITE_URL}/og-cta-tested.jpg`;
const DEFAULT=`${SITE_URL}/og-default.jpg`;

/* FORCE GITHUB PAGES */
fs.writeFileSync(".nojekyll","");

/* CLEAN BUILD */
["posts","_data","author","topics","comparisons"]
.forEach(d=>fs.rmSync(d,{recursive:true,force:true}));

["posts","_data","og-images","author","topics","comparisons"]
.forEach(d=>fs.mkdirSync(d,{recursive:true}));

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
   const hash=crypto.createHash("md5").update(slug).digest("hex").slice(0,10);
   const upscaled=await upscaleToOG(
     `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
     hash
   );
   if(upscaled) return [`${SITE_URL}/og-images/${hash}.jpg`];
 }

 return valid.length?valid:[DEFAULT];
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

/* INTERNAL GRAPH */
function injectInternalLinks(html,posts,currentSlug){
 let enriched=html;

 posts.filter(p=>p.slug!==currentSlug).slice(0,5).forEach(p=>{
   const keyword=p.title.split(" ")[0];
   const regex=new RegExp(`\\b(${keyword})`,"i");

   enriched=enriched.replace(regex,
     `<a href="${p.url}" style="font-weight:600;">$1</a>`
   );
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

 const ogImages=await getYouTubeImages(rawHtml,slug);

 const primaryOG=ogImages[0]||DEFAULT;
 const thumb=ogImages.find(i=>i.includes("hqdefault"))||primaryOG;

 const readTime=Math.max(
   1,
   Math.ceil(rawHtml.replace(/<[^>]+>/g,"").split(/\s+/).length/200)
 );

 const categories=extractCategories(rawHtml);
 const primaryCategory=categories[0]||"reviews";

 const schemas=JSON.stringify([{
   "@context":"https://schema.org",
   "@type":"Article",
   headline:title,
   image:ogImages,
   datePublished:entry.published,
   dateModified:new Date().toISOString(),
   author:{ "@type":"Person","name":"Justin Gerald","url":`${SITE_URL}/author/`},
   publisher:{ "@type":"Organization","name":"ReviewLab","logo":{"@type":"ImageObject","url":CTA}},
   description
 }]);

 posts.push({
   title,slug,
   html:injectInternalLinks(rawHtml,posts,slug),
   url,description,
   og:primaryOG,
   thumb,
   readTime,
   date:entry.published,
   category:primaryCategory,
   schemas
 });
}

/* SORT */
posts.sort((a,b)=>new Date(b.date)-new Date(a.date));

/* AUTHOR */
fs.writeFileSync("author/index.html",
`<html><head><title>Justin Gerald</title></head>
<body style="max-width:760px;margin:auto;font-family:system-ui;padding:40px;">
<h1>Justin Gerald</h1>
<p>Independent AI & software reviewer.</p>
</body></html>`);

/* TOPICS */
const grouped={};
posts.forEach(p=>{
 if(!grouped[p.category]) grouped[p.category]=[];
 grouped[p.category].push(p);
});

for(const topic in grouped){

 const list=grouped[topic]
   .map(p=>`<li><a href="${p.url}">${p.title}</a></li>`)
   .join("");

 fs.writeFileSync(`topics/${topic}.html`,
 `<html><head><title>${topic}</title></head>
 <body style="max-width:760px;margin:auto;font-family:system-ui;padding:40px;">
 <h1>${topic}</h1>
 <ul>${list}</ul>
 </body></html>`);
}

/* SAVE JSON */
fs.writeFileSync("_data/posts.json",JSON.stringify(posts,null,2));

console.log("✅ PHASE 1–31 LOCKED. Architecture Stable.");
