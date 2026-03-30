import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { extname, join } from 'path';
import { Futures, FuturesWS } from '../src/index.js';

const PORT    = process.env.PORT || 3000;
const DOCS    = join(process.cwd(), 'docs');
const API_KEY = process.env.MEXC_API_KEY    || '';
const API_SECRET = process.env.MEXC_API_SECRET || '';

const futures = new Futures(API_KEY, API_SECRET);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
};

// --- SSE клиенты (для WebSocket → браузер) ---
const sseClients = new Set();

function sendSSE(data) {
  const msg = `data: ${JSON.stringify(data)}\n\n`;
  for (const res of sseClients) {
    try { res.write(msg); } catch { sseClients.delete(res); }
  }
}

// --- Запускаем WS к MEXC и шлём данные через SSE ---
async function startWS(symbol) {
  const ws = new FuturesWS(API_KEY, API_SECRET);
  try {
    await ws.connect();
    ws.subscribeTicker(symbol, (data) => {
      sendSSE({ type: 'ticker', data });
    });

    if (API_KEY && API_SECRET) {
      await ws.login();
      ws.subscribePersonal({
        onPosition: (data) => sendSSE({ type: 'position', data }),
        onAsset:    (data) => sendSSE({ type: 'asset',    data }),
        onDeal:     (data) => sendSSE({ type: 'deal',     data }),
        onOrder:    (data) => sendSSE({ type: 'order',    data }),
      });
    }
    console.log(`📡 WS подключён: ${symbol}`);
  } catch (e) {
    console.error('WS ошибка:', e.message);
  }
}

// --- REST handlers ---
const routes = {
  '/api/ticker': async (params) => {
    return futures.ticker(params.symbol || 'BTC_USDT');
  },
  '/api/funding': async (params) => {
    return futures.fundingRate(params.symbol || 'BTC_USDT');
  },
  '/api/positions': async () => {
    return futures.openPositions();
  },
  '/api/assets': async () => {
    return futures.accountAssets();
  },
  '/api/orders': async (params) => {
    return futures.orderHistory(params.symbol || 'BTC_USDT', { pageSize: params.limit || 20 });
  },
  '/api/open-orders': async (params) => {
    return futures.openOrders(params.symbol || 'BTC_USDT');
  },
};

// --- HTTP сервер ---
const server = createServer(async (req, res) => {
  const [path, qs] = req.url.split('?');
  const params = Object.fromEntries(new URLSearchParams(qs || ''));

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  // SSE endpoint — живые данные из WebSocket
  if (path === '/api/stream') {
    res.writeHead(200, {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    });
    res.write('retry: 3000\n\n');
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  // REST API
  if (routes[path]) {
    try {
      const data = await routes[path](params);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, data }));
    } catch (e) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
    return;
  }

  // Статика из docs/
  let filePath = path === '/' ? '/index.html' : path;
  const file = join(DOCS, filePath);

  if (!existsSync(file)) {
    res.writeHead(404); res.end('Not found'); return;
  }

  res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'text/plain' });
  res.end(readFileSync(file));
});

server.listen(PORT, async () => {
  console.log('\n🚀 Dashboard запущен!\n');
  console.log(`   http://localhost:${PORT}             → Документация`);
  console.log(`   http://localhost:${PORT}/metrics.html → Метрики (реальные данные)\n`);
  if (!API_KEY) console.log('   ⚠️  Ключи не найдены — только публичные данные\n');
  await startWS('BTC_USDT');
});