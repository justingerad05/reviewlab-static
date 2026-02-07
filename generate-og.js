import fs from "fs";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

let fontData;

try{
  fontData = fs.readFileSync("./fonts/Inter-Regular.ttf");
}catch{
  console.log("⚠️ Font missing — fallback font used");
}

if (!fs.existsSync("./og-images")){
  fs.mkdirSync("./og-images",{recursive:true});
}

function cleanTitle(title){
  return title.replace(/\|.*$/,"").slice(0,70);
}

export async function generateOG(slug,title){

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
        justifyContent:"space-between",
        background:"#020617",
        padding:"80px",
        color:"#fff"
      },
      children:[

        {
          type:"div",
          props:{
            style:{
              fontSize:42,
              fontWeight:700,
              color:"#22c55e"
            },
            children:"REVIEWLAB VERIFIED"
          }
        },

        {
          type:"div",
          props:{
            style:{
              fontSize:72,
              fontWeight:800,
              lineHeight:1.05
            },
            children:cleanTitle(title)
          }
        },

        {
          type:"div",
          props:{
            style:{
              fontSize:34,
              color:"#38bdf8",
              fontWeight:600
            },
            children:"Read The Full Review →"
          }
        }

      ]
    }
  },
  {
    width,
    height,
    fonts: fontData ? [{
      name:"Inter",
      data:fontData,
      weight:400,
      style:"normal"
    }] : []
  });

  const resvg = new Resvg(svg);
  const pngBuffer = resvg.render().asPng();

  fs.writeFileSync(`./og-images/${slug}.png`, pngBuffer);

  console.log("✅ OG PNG CREATED:", slug);
}
