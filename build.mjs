// Vercel build step.
// Copies the static site into dist/ and injects the Google Maps API key from the
// GOOGLE_MAPS_API_KEY environment variable into the __GOOGLE_MAPS_API_KEY__ placeholder.
// Wired up via "buildCommand" in vercel.json. The raw key is NEVER stored in git —
// it lives only in Vercel's env vars (and, locally, in an untracked .env.local).
import { readFile, writeFile, mkdir, cp, rm } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const OUT = join(__dirname, 'dist');
const PLACEHOLDER = '__GOOGLE_MAPS_API_KEY__';
const KEY = (process.env.GOOGLE_MAPS_API_KEY || '').trim();

// Everything the live site serves.
const ASSETS = [
  'index.html',
  'thank-you.html',
  'sell-inherited-house.html',
  'sell-inherited-house-hero.png',
  'privacy-policy.html',
  'terms-of-service.html',
  'favicon.ico',
  'favicon.png',
  'icon-192.png',
  'apple-touch-icon.png',
  'privacy-policy.pdf',
  'terms-of-service.pdf',
  'opt-in.png',
  'Brand_assets',
];
// HTML that needs the Google Maps key placeholder injected (pages with the address autocomplete).
const HTML_FILES = ['index.html', 'thank-you.html', 'sell-inherited-house.html'];

if (!KEY) {
  console.warn('[build] WARNING: GOOGLE_MAPS_API_KEY is not set — address autocomplete will be disabled. ' +
               'Add it in Vercel → Settings → Environment Variables.');
}

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

for (const asset of ASSETS) {
  try {
    await cp(join(__dirname, asset), join(OUT, asset), { recursive: true });
  } catch (e) {
    console.warn(`[build] skipped missing asset: ${asset} (${e.code || e.message})`);
  }
}

for (const file of HTML_FILES) {
  const p = join(OUT, file);
  try {
    const original = await readFile(p, 'utf8');
    const count = original.split(PLACEHOLDER).length - 1;
    await writeFile(p, original.split(PLACEHOLDER).join(KEY));
    console.log(`[build] ${file}: replaced ${count} key placeholder(s)`);
  } catch (e) {
    console.warn(`[build] could not process ${file}: ${e.message}`);
  }
}

console.log(`[build] done → ${OUT}`);
