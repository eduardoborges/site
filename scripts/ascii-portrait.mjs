// gera src/components/ascii-portrait.html a partir de public/me-withoutbg.png
// rodar: node scripts/ascii-portrait.mjs
// ponytail: sharp vem transitivo do astro via .pnpm; adicionar como devDep se quebrar
import { createRequire } from 'node:module';
const sharp = createRequire(import.meta.url)('../node_modules/.pnpm/sharp@0.34.5/node_modules/sharp/lib/index.js');
import { writeFileSync } from 'node:fs';

const W = 92;
const RAMP = ' .:-=+*#%@';

const img = sharp('public/me-withoutbg.png');
const { width, height } = await img.metadata();
const H = Math.round(W * (height / width) * 0.5); // ~2:1 aspect dos chars

const { data } = await img
  .resize(W, H, { fit: 'fill' })
  .normalize()
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const lines = [];
for (let y = 0; y < H; y++) {
  let line = '';
  let inRed = false;
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
    if (a < 60) {
      if (inRed) { line += '</span>'; inRed = false; }
      line += ' ';
      continue;
    }
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const ch = RAMP[Math.min(RAMP.length - 1, Math.round((lum / 255) * (RAMP.length - 1)))];
    const isRed = r > g * 1.45 && r > b * 1.45 && r > 70;
    if (isRed && !inRed) { line += '<span class="r">'; inRed = true; }
    if (!isRed && inRed) { line += '</span>'; inRed = false; }
    line += ch;
  }
  if (inRed) line += '</span>';
  lines.push(line.replace(/\s+$/, ''));
}

writeFileSync('src/components/ascii-portrait.html', lines.join('\n'));
console.log(`ok: ${W}x${H}`);
