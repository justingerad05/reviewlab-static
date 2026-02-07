import fs from "fs";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";
import { generateOG } from "./generate-og.js";

const SITE_URL =
"https://justingerad05.github.io/reviewlab-static";

const FEED_URL =
"https://honestproductreviewlab.blogspot.com/feeds/posts/default?alt=atom";

fs.rmSync("posts",{recursive:true,force:true});
fs.rmSync("_data",{recursive:true,force:true});

fs.mkdirSync("posts",{recursive:true});
fs.mkdirSync("og-images",{recursive:true});
fs.mkdirSync("_data",{recursive:true});

const parser = new XMLParser({ignoreAttributes:false});
const xml = await (await fetch(FEED_URL)).text();
const data = parser.parse(xml);

let entries = data.feed.entry || [];
if(!Array.isArray(entries)) entries=[entries];

/* BUILD MASTER LIST FIRST */
const posts = [];

for(const entry of entries){

 const html = entry.content?.["#text"] || "";
 const title = entry.title["#text"];

 const slug = title
   .toLowerCase()
   .replace(/[^a-z0-9]+/g,"-")
   .replace(/^-|-$/g,"");

 /* Detect Blogger thumbnail automatically */
 let thumbMatch = html.match(/<img.*?src="(.*?)"/);

 let ogImage;

 if(thumbMatch){
   ogImage = thumbMatch[1];
 }else{
   await generateOG(slug,title);
   ogImage = `${SITE_URL}/og-images/${slug}.png`;
 }

 posts.push({
   title,
   slug,
   html,
   date:entry.published,
   url:`${SITE_URL}/posts/${slug}/`,
   og:ogImage
 });
}

/* CREATE PAGES WITH TRUE RELATED AUTHORITY */

for(const post of posts){

 fs.mkdirSync(`posts/${post.slug}`,{recursive:true});

 const related = posts
   .filter(p=>p.slug!==post.slug)
   .slice(0,4)
   .map(p=>`<li><a href="${p.url}">${p.title}</a></li>`)
   .join("");

 const description =
 post.html.replace(/<[^>]+>/g," ").slice(0,155);

 const page = `<!doctype html>
<html>
<head>

<meta charset="utf-8">
<title>${post.title}</title>

<meta name="description" content="${description}">
<link rel="canonical" href="${post.url}">

<meta property="og:type" content="article">
<meta property="og:title" content="${post.title}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${post.og}">
<meta property="og:url" content="${post.url}">
<meta property="og:site_name" content="ReviewLab">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${post.og}">

</head>
<body>

<h1>${post.title}</h1>

${post.html}

<hr>

<h2>Related Reviews</h2>
<ul>${related}</ul>

</body>
</html>`;

 fs.writeFileSync(`posts/${post.slug}/index.html`,page);
}

fs.writeFileSync("_data/posts.json",JSON.stringify(posts,null,2));

console.log("✅ TOPICAL AUTHORITY ENGINE LIVE");
