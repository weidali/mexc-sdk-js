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

import { FuturesWS } from '../src/index.js';

const API_KEY    = process.env.MEXC_API_KEY    || '';
const API_SECRET = process.env.MEXC_API_SECRET || '';
const SYMBOL     = process.env.SYMBOL || 'BTC_USDT';

// Состояние позиции (обновляется из WS)
let position = null;

// --- Утилиты отображения ---
function clearLine() {
  process.stdout.write('\r\x1b[K');
}

function formatPnl(value) {
  if (value === undefined || value === null) return 'n/a';
  const sign = value >= 0 ? '+' : '';
  const color = value >= 0 ? '\x1b[32m' : '\x1b[31m'; // зелёный / красный
  return `${color}${sign}${value.toFixed(4)} USDT\x1b[0m`;
}

function calcUnrealizedPnl(position, currentPrice) {
  if (!position) return null;
  const { holdVol, openAvgPrice, positionType, leverage } = position;
  // positionType: 1 = LONG, 2 = SHORT
  const direction = positionType === 1 ? 1 : -1;
  // Размер контракта BTC_USDT = 1 контракт = 1 USD / цена
  // Упрощённо: pnl = vol * (currentPrice - openPrice) / currentPrice * direction (для inverse)
  // Для USDT-linear: pnl = vol * (currentPrice - openPrice) * direction / openPrice * margin
  const margin = (holdVol * openAvgPrice) / leverage;
  const pnl = direction * (currentPrice - openAvgPrice) * holdVol / openAvgPrice * (openAvgPrice / openAvgPrice);
  // Для USDT linear perpetual: pnl = direction * (currentPrice - openAvgPrice) * contractSize * vol
  // На MEXC контракт = 1 USD, vol в контрактах
  const pnlUsdt = direction * (currentPrice - openAvgPrice) * holdVol / openAvgPrice;
  return pnlUsdt;
}

function printTicker(data) {
  const price = data.lastPrice;
  const fairPrice = data.fairPrice;
  const change = (data.riseFallRate * 100).toFixed(2);
  const changeColor = data.riseFallRate >= 0 ? '\x1b[32m' : '\x1b[31m';
  const changeStr = `${changeColor}${change >= 0 ? '+' : ''}${change}%\x1b[0m`;

  let line = `📈 ${SYMBOL}  Last: \x1b[1m$${price.toLocaleString()}\x1b[0m  Fair: $${fairPrice.toLocaleString()}  24h: ${changeStr}`;

  // P&L позиции если есть
  if (position) {
    const pnl = calcUnrealizedPnl(position, price);
    const side = position.positionType === 1 ? '🔼 LONG' : '🔽 SHORT';
    const pnlStr = formatPnl(pnl);
    const pnlPct = position.openAvgPrice
      ? ((pnl / ((position.holdVol * position.openAvgPrice) / position.leverage)) * 100).toFixed(2)
      : '0.00';
    line += `  │  ${side} x${position.leverage}  P&L: ${pnlStr} (${pnlPct}%)`;
  }

  clearLine();
  process.stdout.write(line);
}

async function main() {
  console.log(`=== MEXC Futures WebSocket ===`);
  console.log(`Символ: ${SYMBOL}  |  Ctrl+C для остановки\n`);

  const ws = new FuturesWS(API_KEY, API_SECRET);

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n👋 Завершение...');
    ws.disconnect();
    process.exit(0);
  });

  await ws.connect();

  // --- 1. Публичный канал: цена ---
  ws.subscribeTicker(SYMBOL, (data) => {
    printTicker(data);
  });

  // --- 2. Приватные каналы (если есть ключи) ---
  if (API_KEY && API_SECRET) {
    try {
      await ws.login();

      ws.subscribePersonal({
        // Обновления позиции — пересчитываем P&L
        onPosition: (data) => {
          const pos = Array.isArray(data) ? data[0] : data;
          if (pos?.symbol === SYMBOL) {
            if (pos.positionType && pos.holdVol > 0) {
              position = pos;
            } else {
              // Позиция закрыта
              position = null;
              console.log('\n⚠️  Позиция закрыта');
            }
          }
        },

        // Исполненные ордера
        onDeal: (data) => {
          const d = Array.isArray(data) ? data[0] : data;
          if (!d || d.symbol !== SYMBOL) return;
          const side = { 1: '🔼 BUY LONG', 2: '🔽 SELL SHORT', 3: '🔼 BUY (close)', 4: '🔽 SELL (close)' };
          console.log(`\n✅ Сделка: ${side[d.side] || d.side}  Цена: ${d.price}  Кол-во: ${d.vol}  P&L: ${d.profit ?? 0} USDT`);
        },

        // Изменения ордеров
        onOrder: (data) => {
          const o = Array.isArray(data) ? data[0] : data;
          if (!o || o.symbol !== SYMBOL) return;
          const state = { 1: 'ОЖИДАНИЕ', 2: 'АКТИВЕН', 3: 'ИСПОЛНЕН', 4: 'ОТМЕНЁН' };
          if (o.state === 3 || o.state === 4) {
            console.log(`\n📋 Ордер #${o.orderId}: ${state[o.state] || o.state}  Цена: ${o.dealAvgPrice || o.price}`);
          }
        },

        // Баланс
        onAsset: (data) => {
          const asset = Array.isArray(data)
            ? data.find(a => a.currency === 'USDT')
            : (data.currency === 'USDT' ? data : null);
          if (asset) {
            console.log(`\n💼 Баланс USDT: доступно=${asset.availableBalance}  equity=${asset.equity}  unrealized=${asset.unrealized}`);
          }
        },
      }, [SYMBOL]);

    } catch (e) {
      console.error('⚠️  Приватные каналы недоступны:', e.message);
      console.log('   Работаем только с публичными данными\n');
    }
  } else {
    console.log('ℹ️  Без ключей — только публичная цена\n');
  }
}

main().catch(console.error);
