import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { extname, join } from 'path';

const PORT = process.env.PORT || 3000;
const DOCS = join(process.cwd(), 'docs');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
};

createServer((req, res) => {
  let path = req.url.split('?')[0];
  if (path === '/') path = '/index.html';

  const file = join(DOCS, path);

  if (!existsSync(file)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
    return;
  }

  const ext  = extname(file);
  const type = MIME[ext] || 'text/plain';

  res.writeHead(200, { 'Content-Type': type });
  res.end(readFileSync(file));

}).listen(PORT, () => {
  console.log('\n🚀 Dashboard запущен!\n');
  console.log(`   http://localhost:${PORT}            → Документация`);
  console.log(`   http://localhost:${PORT}/metrics.html → Метрики\n`);
  console.log('   Ctrl+C для остановки\n');
});