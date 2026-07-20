/**
 * server.js — статический сервер без единой зависимости (node >= 18).
 *
 * Локально:   node server.js            → http://localhost:3000
 * Порт:       PORT=8080 node server.js  → http://localhost:8080
 * Прод (домен destiny_matrix): запускать за nginx/caddy — см. deploy/nginx.conf,
 * или отдавать папку public/ любым статическим хостом напрямую.
 */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('./public', import.meta.url)));
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    let pathname = decodeURIComponent(url.pathname);

    if (pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (pathname.endsWith('/')) pathname += 'index.html';

    // Защита от выхода за пределы public/
    const filePath = normalize(join(ROOT, pathname));
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    let target = filePath;
    const info = await stat(target).catch(() => null);
    if (!info) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 — файл не найден');
      return;
    }
    if (info.isDirectory()) target = join(target, 'index.html');

    const body = await readFile(target);
    const type = MIME[extname(target).toLowerCase()] || 'application/octet-stream';
    const isHtml = extname(target) === '.html';
    res.writeHead(200, {
      'Content-Type': type,
      'Cache-Control': isHtml ? 'no-cache' : 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(body);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('500 — внутренняя ошибка');
    console.error('[server]', err);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[destiny_matrix] Сайт запущен: http://localhost:${PORT}`);
});
