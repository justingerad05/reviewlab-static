
import fs from "fs";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";
import { generateOG, upscaleToOG } from "./generate-og.js";

const FEED_URL = "https://honestproductreviewlab.blogspot.com/feeds/posts/default?alt=atom";
const SITE_URL = "https://justingerad05.github.io/reviewlab-static";
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
 const match = html.match(/(?:youtube\.com\/embed\/|watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
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
   try{ const res = await fetch(img,{method:"HEAD"}); if(res.ok) valid.push(img); }catch{}
 }
 if(valid.length===0){
   const upscaled = await upscaleToOG(`https://img.youtube.com/vi/${id}/hqdefault.jpg`,slug);
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
 const slug = title.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
 const url = `${SITE_URL}/posts/${slug}/`;
 const description = html.replace(/<[^>]+>/g," ").slice(0,155);
 let ogImages = await getYouTubeImages(html,slug);
 if(!ogImages) ogImages=[CTA];
 const primaryOG = ogImages[0];
 const thumb = ogImages.find(img => img.includes("hqdefault.jpg")) || primaryOG;
 const textOnly = html.replace(/<[^>]+>/g,"");
 const wordCount = textOnly.split(/\s+/).length;
 const readTime = Math.max(1, Math.ceil(wordCount / 200));
 posts.push({title,slug,html,url,description,og:primaryOG,thumb,readTime,date:entry.published});
}
posts.sort((a,b)=> new Date(b.date)-new Date(a.date));
fs.writeFileSync("_data/posts.json",JSON.stringify(posts,null,2));
console.log("✅ AUTHORITY STACK PHASE 16-20 READY");
