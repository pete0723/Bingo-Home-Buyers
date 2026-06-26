import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { existsSync, readFileSync } from 'fs';
import { extname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PORT = 3000;
const PLACEHOLDER = '__GOOGLE_MAPS_API_KEY__';

// ── Local Google Maps key injection (mirrors the Vercel build step) ──
// Reads GOOGLE_MAPS_API_KEY from the environment, or from an untracked .env.local
// file in the project root. Never commit .env.local. Run locally with either:
//   GOOGLE_MAPS_API_KEY=AIza... node serve.mjs
//   echo 'GOOGLE_MAPS_API_KEY=AIza...' > .env.local && node serve.mjs
function loadLocalKey() {
  if (process.env.GOOGLE_MAPS_API_KEY) return process.env.GOOGLE_MAPS_API_KEY.trim();
  const envPath = join(__dirname, '.env.local');
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^\s*GOOGLE_MAPS_API_KEY\s*=\s*(.+?)\s*$/);
      if (m) return m[1].replace(/^['"]|['"]$/g, '').trim();
    }
  }
  return '';
}
const GOOGLE_MAPS_API_KEY = loadLocalKey();
if (GOOGLE_MAPS_API_KEY) {
  console.log('[serve] Google Maps key loaded — injecting into HTML.');
} else {
  console.warn('[serve] No GOOGLE_MAPS_API_KEY (env or .env.local). Address autocomplete disabled locally.');
}

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
};

const server = createServer(async (req, res) => {
  // Strip query string / hash, default to index.html
  let urlPath = (req.url || '/').split('?')[0].split('#')[0];
  if (urlPath === '/') urlPath = '/index.html';

  // Candidate files. Clean-URL support (mirrors Vercel `cleanUrls`):
  //   /thank-you -> thank-you.html -> thank-you/index.html
  const candidates = [urlPath];
  if (!extname(urlPath)) {
    candidates.push(urlPath + '.html', join(urlPath, 'index.html'));
  }

  for (const candidate of candidates) {
    try {
      const filePath = join(__dirname, candidate);
      const ext = extname(filePath);
      if (ext === '.html') {
        // Inject the Maps key on the fly so the placeholder works locally too.
        let html = await readFile(filePath, 'utf8');
        html = html.split(PLACEHOLDER).join(GOOGLE_MAPS_API_KEY);
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
      } else {
        const data = await readFile(filePath);
        res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
        res.end(data);
      }
      return;
    } catch {
      // try the next candidate
    }
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
