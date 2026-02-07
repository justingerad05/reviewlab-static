import fs from "fs";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

const OG_FOLDER = "./_site/og-images";
const SITE_URL = "https://justingerad05.github.io/reviewlab-static";
const FALLBACK_IMAGE = `${SITE_URL}/og-default.jpg`;

/* ensure folder INSIDE _site */
fs.mkdirSync(OG_FOLDER, { recursive: true });

let fontData;
try {
  fontData = fs.readFileSync("./fonts/Inter-Regular.ttf");
} catch {
  console.log("Font missing — fallback used");
}

function cleanTitle(title){
  return title.replace(/\|.*$/,"").slice(0,85);
}

export async function generateOG(slug,title){

  try{

    const width = 1200;
    const height = 630;

    const svg = await satori({
      type:"div",
      props:{
        style:{
          width,
          height,
          display:"flex",
          flexDirection:"column",
          justifyContent:"center",
          padding:"80px",
          background:"#020617",
          color:"#ffffff"
        },
        children:[
          {
            type:"div",
            props:{
              style:{fontSize:64,fontWeight:800,lineHeight:1.1},
              children:cleanTitle(title)
            }
          },
          {
            type:"div",
            props:{
              style:{
                marginTop:"30px",
                fontSize:34,
                color:"#38bdf8"
              },
              children:"Read the Full Review →"
            }
          }
        ]
      }
    },{
      width,
      height,
      fonts: fontData
        ? [{name:"Inter",data:fontData,weight:400,style:"normal"}]
        : []
    });

    const png = new Resvg(svg).render().asPng();

    const path = `${OG_FOLDER}/${slug}.png`;

    fs.writeFileSync(path,png);

    console.log("OG CREATED:",slug);

    return `${SITE_URL}/og-images/${slug}.png`;

  }catch(err){

    console.error("OG FAILED",err);
    return FALLBACK_IMAGE;
  }
}
