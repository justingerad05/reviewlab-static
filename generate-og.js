import fs from "fs";
import fetch from "node-fetch";
import sharp from "sharp";

/* Ensure folder exists */
if (!fs.existsSync("./_site/og-images")) {
  fs.mkdirSync("./_site/og-images", { recursive: true });
}

/**
 * UPSCALE ENGINE (Sharp version)
 * Downloads YouTube thumbnail and converts/resizes to 1200x630 .webp
 */
export async function upscaleToOG(url, slug) {
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    
    const buffer = await res.arrayBuffer();

    await sharp(Buffer.from(buffer))
      .resize(1200, 630, {
        fit: 'cover',
        position: 'center'
      })
      .webp({ quality: 85 }) // Output as WebP for performance
      .toFile(`./_site/og-images/${slug}.webp`);

    return true;
  } catch (error) {
    console.error(`Sharp failed for ${slug}:`, error);
    return false;
  }
}

/**
 * FALLBACK GENERATOR
 * If no YouTube image exists, this ensures a file is still created
 */
export async function generateOG(slug, title) {
  try {
    // If you have a default local image, copy it over renamed
    if (fs.existsSync("./assets/og-default.jpg")) {
        await sharp("./assets/og-default.jpg")
            .webp()
            .toFile(`./_site/og-images/${slug}.webp`);
        return true;
    }
    return false;
  } catch {
    return false;
  }
}
