import fs from "fs";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import fetch from "node-fetch";

/* Ensure folder */

if(!fs.existsSync("./_site/og-images")){
 fs.mkdirSync("./_site/og-images",{recursive:true});
}

/* FONT SAFE LOAD */

let fontData=null;

try{
 fontData=fs.readFileSync("./fonts/Inter-Regular.ttf");
}catch{}


/* =============================
UPSCALE ENGINE
============================= */

export async function upscaleToOG(url,slug){

 try{

   const res = await fetch(url);
   const buffer = await res.arrayBuffer();

   const svg = await satori({
     type:"div",
     props:{
       style:{
         width:1200,
         height:630,
         display:"flex"
       },
       children:[
         {
           type:"img",
           props:{
             src:Buffer.from(buffer),
             style:{
               width:"1200px",
               height:"630px",
               objectFit:"cover"
             }
           }
         }
       ]
     }
   },{
     width:1200,
     height:630,
     fonts:[]
   });

   const resvg = new Resvg(svg);
   const image = resvg.render();

   fs.writeFileSync(`./_site/og-images/${slug}.jpg`,
     image.asJpeg(100)
   );

   return true;

 }catch{
   return false;
 }
}



/* =============================
LAST RESORT GENERATOR
============================= */

export async function generateOG(slug,title){

 try{

   const svg = await satori({
     type:"div",
     props:{
       style:{
         width:1200,
         height:630,
         background:"#020617",
         display:"flex",
         flexDirection:"column",
         justifyContent:"center",
         padding:"70px",
         color:"#fff"
       },
       children:[
         {
           type:"div",
           props:{
             style:{
               fontSize:64,
               fontWeight:800
             },
             children:title.slice(0,80)
           }
         }
       ]
     }
   },{
     width:1200,
     height:630,
     fonts: fontData ? [{
       name:"Inter",
       data:fontData,
       weight:400,
       style:"normal"
     }] : []
   });

   const resvg=new Resvg(svg);
   const image=resvg.render();

   fs.writeFileSync(
     `./_site/og-images/${slug}.jpg`,
     image.asJpeg(100)
   );

   return true;

 }catch{

   fs.copyFileSync(
     "og-default.jpg",
     `./_site/og-images/${slug}.jpg`
   );

   return false;
 }
}
