import fs from "fs";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";
import { generateOG } from "./generate-og.js";

const SITE_URL =
"https://justingerad05.github.io/reviewlab-static";

const FEED_URL =
"https://honestproductreviewlab.blogspot.com/feeds/posts/default?alt=atom";

/* CLEAN BUILD */

fs.rmSync("_site",{recursive:true,force:true});
fs.mkdirSync("_site",{recursive:true});
fs.mkdirSync("_site/posts",{recursive:true});
fs.mkdirSync("_data",{recursive:true});

/* FETCH BLOGGER */

const parser = new XMLParser({ignoreAttributes:false});
const xml = await (await fetch(FEED_URL)).text();
const data = parser.parse(xml);

let entries = data.feed.entry || [];
if(!Array.isArray(entries)) entries=[entries];

const posts=[];

/* BUILD POSTS */

for(const entry of entries){

 const html = entry.content?.["#text"] || "";
 const title = entry.title["#text"];

 const slug = title
   .toLowerCase()
   .replace(/[^a-z0-9]+/g,"-")
   .replace(/^-|-$/g,"");

 const ogImage = await generateOG(slug,title);

 const url = `${SITE_URL}/posts/${slug}/`;

 posts.push({
   title,
   slug,
   html,
   date:entry.published,
   url,
   og:ogImage
 });

 fs.mkdirSync(`_site/posts/${slug}`,{recursive:true});

 const description =
 html.replace(/<[^>]+>/g," ").slice(0,155);

 const page = `<!doctype html>
<html>
<head>

<meta charset="utf-8">
<title>${title}</title>

<meta name="description" content="${description}">
<link rel="canonical" href="${url}">

<meta property="og:type" content="article">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${ogImage}">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="ReviewLab">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${ogImage}">

</head>
<body>

<a href="${SITE_URL}" 
style="display:inline-block;margin-bottom:40px;font-weight:700;">
← Back To Homepage
</a>

<h1>${title}</h1>

${html}

</body>
</html>`;

 fs.writeFileSync(`_site/posts/${slug}/index.html`,page);
}

fs.writeFileSync("_data/posts.json",JSON.stringify(posts,null,2));

console.log("SITE + OG READY");
