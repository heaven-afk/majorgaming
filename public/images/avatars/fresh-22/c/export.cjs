const fs = require('node:fs');
const path = require('node:path');
const sharp = require(path.resolve(process.cwd(), 'node_modules/sharp'));
sharp.cache(false);
const manifest = require('./manifest.json');
(async () => {
  for (const a of manifest.assets) {
    if (!fs.existsSync(a.original)) fs.copyFileSync(a.source, a.original);
    const m = await sharp(a.original).metadata();
    a.originalWidth = m.width; a.originalHeight = m.height;
    if (!fs.existsSync(a.output)) await sharp(a.original).resize(512, 512).webp({quality:90}).toFile(a.output);
    if (!fs.existsSync(a.small)) await sharp(a.original).resize(256, 256).webp({quality:90}).toFile(a.small);
    const w = await sharp(a.output).metadata();
    if (m.width !== m.height || w.width !== 512 || w.height !== 512) throw Error(a.slug + ' dimensions');
    console.log(a.slug + ': ' + m.width + ' square PNG, verified 512 and 256 WebP');
  }
  fs.writeFileSync(path.join(__dirname, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
})().catch(e => { console.error(e); process.exitCode=1; });
