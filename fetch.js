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

 if(upscaled)
   return [`${SITE_URL}/og-images/${slug}.jpg`];

 return null;
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
 if(!ogImages){
   await generateOG(slug,title);
   ogImages=[`${SITE_URL}/og-images/${slug}.jpg`];
 }

 const primaryOG = ogImages[0];
 const thumb = primaryOG;

 const textOnly = html.replace(/<[^>]+>/g,"");
const wordCount = textOnly.split(/\s+/).length;
const readTime = Math.max(1, Math.ceil(wordCount / 200));

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
<a href="${p.url}">
<img data-src="${p.thumb}" width="100" class="lazy">
${p.title}
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
<meta property="og:image" content="${post.og}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${post.og}">

</head>

<body style="max-width:760px;margin:auto;font-family:system-ui;padding:40px;line-height:1.7;">

<a href="${SITE_URL}">← Back Home</a>

<h1>${post.title}</h1>

${post.html}

<hr>

<h3>Related Reviews</h3>
<ul>${related}</ul>

<script>
document.addEventListener("DOMContentLoaded", function(){
  const lazyImgs = document.querySelectorAll(".lazy");
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        const img = entry.target;
        img.src = img.dataset.src;
        io.unobserve(img);
      }
    });
  });
  lazyImgs.forEach(img => io.observe(img));
});
</script>

</body>
</html>`;

 fs.writeFileSync(`posts/${post.slug}/index.html`,page);
}

fs.writeFileSync(
"_data/posts.json",
JSON.stringify(posts,null,2)
);

console.log("PHASE 19 & 20 COMPLETE — CLEAN INDEX + FIXED RELATED + NO LABEL");
