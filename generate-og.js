const fs = require("fs");
const satori = require("satori");
const { Resvg } = require("@resvg/resvg-js");

/* SAFE FONT LOAD */

let fontData;

try{
  fontData = fs.readFileSync("./fonts/Inter-Regular.ttf");
}catch{
  console.log("⚠️ Font missing — OG fallback activated");
}

/* ENSURE og-images FOLDER EXISTS */

if (!fs.existsSync("./og-images")){
  fs.mkdirSync("./og-images",{recursive:true});
}

function cleanTitle(title){
  return title.replace(/\|.*$/,"").slice(0,85);
}

async function generateOG(slug,title){

  try{

    const width=1200;
    const height=630;

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
              children:"Real Test • Real Verdict • No Hipe"
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

    const resvg=new Resvg(svg);
    const png=resvg.render();

    fs.writeFileSync(`./og-images/${slug}.png`,png.asPng());

    console.log("✅ OG created:",slug);

  }catch(err){

    console.log("❌ OG FAILED:",slug,err);

  }
}

module.exports = generateOG;
