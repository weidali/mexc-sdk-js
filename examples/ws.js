/**
 * MEXC Futures WebSocket — live цена + P&L позиции
 *
 * Запуск:
 *   node --env-file=.env examples/ws.js
 *
 * Другая пара:
 *   SYMBOL=ETH_USDT node --env-file=.env examples/ws.js
 *
 * Ctrl+C для остановки
 */

import { FuturesWS, Futures } from '../src/index.js';

const API_KEY    = process.env.MEXC_API_KEY    || '';
const API_SECRET = process.env.MEXC_API_SECRET || '';
const SYMBOL     = process.env.SYMBOL || 'BTC_USDT';

// Состояние позиции (обновляется из REST при старте + из WS)
let position = null;

// Строка без ANSI-кодов для подсчёта видимой длины
function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

function printLine(line) {
  const cols = (process.stdout.columns || 120) - 1;
  const visible = stripAnsi(line);
  if (visible.length <= cols) {
    process.stdout.write('\r\x1b[K' + line);
    return;
  }
  // Обрезаем по видимой длине, сохраняя ANSI-коды
  let count = 0;
  let result = '';
  let i = 0;
  while (i < line.length && count < cols - 1) {
    if (line[i] === '\x1b') {
      const end = line.indexOf('m', i);
      if (end === -1) break;
      result += line.slice(i, end + 1);
      i = end + 1;
    } else {
      result += line[i++];
      count++;
    }
  }
  process.stdout.write('\r\x1b[K' + result + '\x1b[0m');
}

function formatPnl(pnl, margin) {
  if (pnl === null || pnl === undefined) return '';
  const sign = pnl >= 0 ? '+' : '';
  const color = pnl >= 0 ? '\x1b[32m' : '\x1b[31m';
  const pct = margin ? (pnl / margin * 100).toFixed(2) : '0.00';
  return `${color}${sign}${pnl.toFixed(4)} USDT (${pct}%)\x1b[0m`;
}

function calcPnl(pos, currentPrice) {
  if (!pos || !currentPrice) return null;
  const { holdVol, openAvgPrice, positionType } = pos;
  const direction = positionType === 1 ? 1 : -1;
  // USDT-linear: pnl = direction * (currentPrice - openPrice) * vol / openPrice
  return direction * (currentPrice - openAvgPrice) * holdVol / openAvgPrice;
}

function printTicker(data) {
  const price = data.lastPrice;
  const changeColor = data.riseFallRate >= 0 ? '\x1b[32m' : '\x1b[31m';
  const changeStr = `${changeColor}${(data.riseFallRate * 100).toFixed(2)}%\x1b[0m`;

  let line = `📈 ${SYMBOL}  Last: \x1b[1m$${price.toLocaleString()}\x1b[0m  Fair: $${data.fairPrice.toLocaleString()}  24h: ${changeStr}`;

  if (position) {
    const pnl = calcPnl(position, price);
    const margin = (position.holdVol * position.openAvgPrice) / position.leverage;
    const side = position.positionType === 1 ? '🔼 LONG' : '🔽 SHORT';
    line += `  │  ${side} x${position.leverage} @ $${position.openAvgPrice}  P&L: ${formatPnl(pnl, margin)}`;
  }

  printLine(line);
}

async function main() {
  console.log(`=== MEXC Futures WebSocket ===`);
  console.log(`Символ: ${SYMBOL}  |  Ctrl+C для остановки\n`);

  // --- Загружаем текущую позицию через REST ---
  if (API_KEY && API_SECRET) {
    try {
      const rest = new Futures(API_KEY, API_SECRET);
      const positions = await rest.openPositions(SYMBOL);
      if (positions && positions.length > 0) {
        position = positions[0];
        console.log(`📋 Позиция загружена: ${position.positionType === 1 ? 'LONG' : 'SHORT'} x${position.leverage} @ $${position.openAvgPrice}  (${position.holdVol} контр.)\n`);
      } else {
        console.log(`📋 Открытых позиций по ${SYMBOL} нет\n`);
      }
    } catch (e) {
      console.error('⚠️  Не удалось загрузить позицию:', e.message, '\n');
    }
  }

  const ws = new FuturesWS(API_KEY, API_SECRET);

  process.on('SIGINT', () => {
    console.log('\n\n👋 Завершение...');
    ws.disconnect();
    process.exit(0);
  });

  await ws.connect();

  // --- Публичный канал: цена ---
  ws.subscribeTicker(SYMBOL, (data) => {
    printTicker(data);
  });

  // --- Приватные каналы ---
  if (API_KEY && API_SECRET) {
    try {
      await ws.login();

      ws.subscribePersonal({
        onPosition: (data) => {
          const pos = Array.isArray(data) ? data[0] : data;
          if (!pos || pos.symbol !== SYMBOL) return;
          if (pos.holdVol > 0) {
            position = pos;
          } else {
            position = null;
            console.log('\n⚠️  Позиция закрыта');
          }
        },

        onDeal: (data) => {
          const d = Array.isArray(data) ? data[0] : data;
          if (!d || d.symbol !== SYMBOL) return;
          const side = { 1: '🔼 BUY LONG', 2: '🔽 SELL SHORT', 3: '🔼 BUY (close)', 4: '🔽 SELL (close)' };
          const pnl = d.profit ?? 0;
          const pnlColor = pnl >= 0 ? '\x1b[32m' : '\x1b[31m';
          console.log(`\n✅ Сделка: ${side[d.side] || d.side}  Цена: $${d.price}  Кол-во: ${d.vol}  P&L: ${pnlColor}${pnl >= 0 ? '+' : ''}${pnl}\x1b[0m USDT`);
        },

        onOrder: (data) => {
          const o = Array.isArray(data) ? data[0] : data;
          if (!o || o.symbol !== SYMBOL) return;
          const state = { 1: 'ОЖИДАНИЕ', 2: 'АКТИВЕН', 3: 'ИСПОЛНЕН', 4: 'ОТМЕНЁН' };
          if (o.state === 3 || o.state === 4) {
            console.log(`\n📋 Ордер #${o.orderId}: ${state[o.state]}  Цена: ${o.dealAvgPrice || o.price}`);
          }
        },

        onAsset: (data) => {
          const asset = Array.isArray(data)
            ? data.find(a => a.currency === 'USDT')
            : (data.currency === 'USDT' ? data : null);
          if (asset) {
            console.log(`\n💼 USDT: доступно=${asset.availableBalance}  equity=${asset.equity}  unrealized=${asset.unrealized}`);
          }
        },
      }, [SYMBOL]);

    } catch (e) {
      console.error('⚠️  Приватные каналы недоступны:', e.message, '\n');
    }
  }
}

main().catch(console.error);
