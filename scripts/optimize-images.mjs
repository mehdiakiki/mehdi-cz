import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const imagesDir = path.join(__dirname, "../public/static/images");
const blurIndexFile = path.join(__dirname, "../data/blurPlaceholders/index.ts");

const SHOULD_CONVERT = [
  "mehdi_image_enhanced_square.png",
  "logo.png",
  "dicom_viewer.png",
  "new-application.png",
  "rust_analyzer.png",
  "twitter-card.png",
];

function generateBlurIndex(placeholders) {
  const entries = Object.entries(placeholders)
    .map(([imgPath, blur]) => `  "${imgPath}":\n    "${blur}",`)
    .join("\n");

  return `const blurPlaceholders: Record<string, string> = {
${entries}
};

export function getBlurDataURL(src) {
  const normalizedSrc = src.replace(/^\\/+/, "/");
  return blurPlaceholders[normalizedSrc];
}

export { blurPlaceholders };
`;
}

async function optimizeImage(inputFile, existingPlaceholders) {
  const inputPath = path.join(imagesDir, inputFile);
  const name = path.parse(inputFile).name;
  const ext = path.parse(inputFile).ext;
  const webpPath = path.join(imagesDir, `${name}.webp`);

  console.log(`\nProcessing: ${inputFile}`);

  if (!fs.existsSync(inputPath)) {
    console.log(`  Skipping: File not found`);
    return null;
  }

  const metadata = await sharp(inputPath).metadata();
  const stat = fs.statSync(inputPath);
  const originalSizeKB = stat.size / 1024;

  console.log(
    `  Original: ${metadata.width}x${metadata.height}, ${ext}, ${originalSizeKB.toFixed(1)} KB`
  );

  const shouldConvert = SHOULD_CONVERT.includes(inputFile);

  if (shouldConvert) {
    await sharp(inputPath).webp({ quality: 80 }).toFile(webpPath);

    const webpStat = fs.statSync(webpPath);
    const webpSizeKB = webpStat.size / 1024;
    const reduction = ((1 - webpStat.size / stat.size) * 100).toFixed(1);
    console.log(`  WebP: ${webpSizeKB.toFixed(1)} KB (${reduction}% reduction)`);

    const blurBuffer = await sharp(inputPath)
      .resize(10, 10, { fit: "inside" })
      .webp({ quality: 20 })
      .toBuffer();

    const blurBase64 = `data:image/webp;base64,${blurBuffer.toString("base64")}`;

    existingPlaceholders[`/static/images/${name}.webp`] = blurBase64;
    existingPlaceholders[`/static/images/${inputFile}`] = blurBase64;

    return { optimized: true, webpSizeKB };
  } else {
    const blurBuffer = await sharp(inputPath)
      .resize(10, 10, { fit: "inside" })
      .webp({ quality: 20 })
      .toBuffer();

    const blurBase64 = `data:image/webp;base64,${blurBuffer.toString("base64")}`;
    existingPlaceholders[`/static/images/${inputFile}`] = blurBase64;

    console.log(`  Skipping WebP conversion (not in SHOULD_CONVERT list)`);
    console.log(`  Blur placeholder generated`);

    return { optimized: false, originalSizeKB };
  }
}

async function main() {
  const args = process.argv.slice(2);

  const existingPlaceholders = {};

  if (args.length === 0) {
    console.log("Optimizing all images...");
    const files = fs.readdirSync(imagesDir).filter((f) => /\.(png|jpg|jpeg)$/i.test(f));

    for (const file of files) {
      await optimizeImage(file, existingPlaceholders);
    }
  } else {
    for (const file of args) {
      await optimizeImage(file, existingPlaceholders);
    }
  }

  fs.writeFileSync(blurIndexFile, generateBlurIndex(existingPlaceholders));
  console.log(`\nUpdated: ${blurIndexFile}`);
  console.log("\nDone!");
}

main().catch(console.error);
