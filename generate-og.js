import fs from "fs";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

let fontData;

try{
  fontData = fs.readFileSync("./fonts/Inter-Regular.ttf");
}catch{
  console.log("⚠️ Font missing — OG fallback activated");
}

if (!fs.existsSync("./og-images")){
  fs.mkdirSync("./og-images",{recursive:true});
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
          justifyContent:"space-between",
          background:"#020617",
          padding:"70px",
          color:"#ffffff"
        },
        children:[

          {
            type:"div",
            props:{
              style:{
                fontSize:44,
                fontWeight:700,
                color:"#38bdf8"
              },
              children:"REVIEWLAB VERIFIED"
            }
          },

          {
            type:"div",
            props:{
              style:{
                fontSize:68,
                fontWeight:800,
                lineHeight:1.1
              },
              children:cleanTitle(title)
            }
          },

          {
            type:"div",
            props:{
              style:{
                fontSize:30,
                color:"#22c55e"
              },
              children:"Real Test • Real Verdict • No Hype"
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
    const image = resvg.render();
    const jpgBuffer = image.asJpeg(95);

    fs.writeFileSync(`./og-images/${slug}.jpg`, jpgBuffer);

    console.log("✅ OG CREATED:", slug);

  }catch(err){

    console.log("❌ OG FAILED:", slug, err);
    fs.copyFileSync("og-default.jpg", `og-images/${slug}.jpg`);

  }
}
