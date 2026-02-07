import fs from "fs";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";

const FEED_URL =
"https://honestproductreviewlab.blogspot.com/feeds/posts/default?alt=atom";

const SITE_URL =
"https://justingerad05.github.io/reviewlab-static";

const DEFAULT =
`${SITE_URL}/og-default.jpg`;

fs.rmSync("posts",{recursive:true,force:true});
fs.rmSync("_data",{recursive:true,force:true});

fs.mkdirSync("posts",{recursive:true});
fs.mkdirSync("_data",{recursive:true});

const parser = new XMLParser({ignoreAttributes:false});
const xml = await (await fetch(FEED_URL)).text();
const data = parser.parse(xml);

let entries = data.feed.entry || [];
if(!Array.isArray(entries)) entries=[entries];

async function getYouTubeThumb(html){

const match =
html.match(/(?:youtube\.com\/embed\/|watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);

if(!match) return DEFAULT;

const id = match[1];

const candidates = [
`https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
`https://img.youtube.com/vi/${id}/sddefault.jpg`,
`https://img.youtube.com/vi/${id}/hqdefault.jpg`
];

for(const img of candidates){
try{
const res = await fetch(img,{method:"HEAD"});
if(res.ok) return img;
}catch{}
}

return DEFAULT;
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

const url =
`${SITE_URL}/posts/${slug}/`;

const thumb = await getYouTubeThumb(html);

const textOnly = html.replace(/<[^>]+>/g,"");
const wordCount = textOnly.split(/\s+/).length;
const readTime = Math.max(1, Math.ceil(wordCount / 200));

posts.push({
title,
slug,
url,
thumb,
html,
readTime,
date:entry.published
});

fs.mkdirSync(`posts/${slug}`,{recursive:true});

const page = `<!doctype html>
<html>
<head>

<meta charset="utf-8">
<title>${title}</title>

<meta property="og:type" content="article">
<meta property="og:title" content="${title}">
<meta property="og:image" content="${thumb}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${thumb}">

</head>

<body style="max-width:760px;margin:auto;font-family:system-ui;padding:40px;line-height:1.7;">

<a href="${SITE_URL}">← Back Home</a>

<h1>${title}</h1>

${html}

</body>
</html>`;

fs.writeFileSync(`posts/${slug}/index.html`,page);

}

posts.sort((a,b)=> new Date(b.date)-new Date(a.date));

fs.writeFileSync(
"_data/posts.json",
JSON.stringify(posts,null,2)
);

console.log("✅ STABLE ELITE BUILD COMPLETE");
