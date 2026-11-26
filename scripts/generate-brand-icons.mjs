// Derive browser/search and home-screen icons from the existing MGL vector mark.
import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const source = await readFile(new URL("../public/brand/mgl-mark.svg", import.meta.url), "utf8");
const artwork = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" rx="80" fill="#f3f1ed"/><svg x="64" y="64" width="384" height="384" viewBox="0 0 1000 1000">${source.replace(/<svg[^>]*>|<\/svg>/g, "")}</svg></svg>`);
const png = size => sharp(artwork).resize(size, size).png().toBuffer();
await writeFile(new URL("../public/brand/favicon-96.png", import.meta.url), await png(96));
await writeFile(new URL("../src/app/apple-icon.png", import.meta.url), await png(180));

// ICO directory with PNG-encoded images, supported by modern browsers.
const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map(png));
const header = Buffer.alloc(6 + sizes.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
images.forEach((image, index) => {
  const entry = 6 + index * 16;
  header[entry] = header[entry + 1] = sizes[index];
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(image.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += image.length;
});
await writeFile(new URL("../src/app/favicon.ico", import.meta.url), Buffer.concat([header, ...images]));
console.log("Generated MGL ICO, 96px search icon and 180px Apple icon.");
