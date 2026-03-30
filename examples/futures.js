/**
 * MEXC Futures API — Демо
 *
 * Запуск (без ключей — публичные данные):
 *   node examples/futures.js
 *
 * С ключами (полный функционал):
 *   node --env-file=.env examples/futures.js
 *
 * Детали конкретного ордера:
 *   ORDER_ID=123456 node --env-file=.env examples/futures.js
 *
 * Другая пара:
 *   SYMBOL=ETH_USDT node --env-file=.env examples/futures.js
 */

import { Futures } from '../src/index.js';

const API_KEY    = process.env.MEXC_API_KEY    || '';
const API_SECRET = process.env.MEXC_API_SECRET || '';
const ORDER_ID   = process.env.ORDER_ID || '';
const SYMBOL     = process.env.SYMBOL || 'BTC_USDT';

const client = new Futures(API_KEY, API_SECRET);

async function main() {
  console.log('=== MEXC Futures API ===\n');

  // --- ПУБЛИЧНЫЕ ДАННЫЕ ---

  console.log(`📈 Тикер ${SYMBOL}:`);
  try {
    const t = await client.ticker(SYMBOL);
    console.log(`   Последняя цена: $${t.lastPrice.toLocaleString()}`);
    console.log(`   Fair price:     $${t.fairPrice.toLocaleString()}`);
    console.log(`   Index price:    $${t.indexPrice.toLocaleString()}`);
    console.log(`   High/Low 24h:   $${t.high24Price} / $${t.lower24Price}`);
    console.log(`   Объём 24h:      ${Number(t.volume24).toLocaleString()} контр.`);
    console.log(`   Изменение 24h:  ${(t.riseFallRate * 100).toFixed(2)}%`);
    console.log(`   7d / 30d:       ${(t.riseFallRates.r7 * 100).toFixed(2)}% / ${(t.riseFallRates.r30 * 100).toFixed(2)}%`);
    console.log(`   Funding rate:   ${(t.fundingRate * 100).toFixed(4)}%\n`);
  } catch (e) {
    console.error('   Ошибка:', e.message, '\n');
  }

  console.log(`💰 Funding Rate ${SYMBOL}:`);
  try {
    const fr = await client.fundingRate(SYMBOL);
    console.log(`   Текущий rate:    ${(fr.fundingRate * 100).toFixed(4)}%`);
    console.log(`   Следующее время: ${new Date(fr.nextSettleTime).toLocaleString('ru-RU')}\n`);
  } catch (e) {
    console.error('   Ошибка:', e.message, '\n');
  }

  // --- ПРИВАТНЫЕ ДАННЫЕ ---

  if (!API_KEY || !API_SECRET) {
    console.log('ℹ️  Для приватных данных укажите ключи:');
    console.log('   node --env-file=.env examples/futures.js');
    return;
  }

  console.log('💼 Баланс фьючерсного аккаунта (ненулевые):');
  try {
    const assets = await client.accountAssets();
    const nonZero = assets.filter(a => a.equity > 0 || a.availableBalance > 0);
    if (nonZero.length === 0) {
      console.log('   Нет активов');
    } else {
      nonZero.forEach(a => {
        console.log(`   ${a.currency}:`);
        console.log(`     Доступно:       ${a.availableBalance}`);
        console.log(`     Заморожено:     ${a.frozenBalance}`);
        console.log(`     Equity:         ${a.equity}`);
        console.log(`     Unrealized P&L: ${a.unrealized}`);
      });
    }
    console.log();
  } catch (e) {
    console.error('   Ошибка:', e.message, '\n');
  }

  console.log(`📋 Открытые позиции (${SYMBOL}):`);
  try {
    const positions = await client.openPositions(SYMBOL);
    if (!positions || positions.length === 0) {
      console.log('   Нет открытых позиций');
    } else {
      positions.forEach(p => printPosition(p));
    }
    console.log();
  } catch (e) {
    console.error('   Ошибка:', e.message, '\n');
  }

  console.log(`📋 Открытые ордера (${SYMBOL}):`);
  try {
    const orders = await client.openOrders(SYMBOL);
    if (!orders || orders.length === 0) {
      console.log('   Нет открытых ордеров');
    } else {
      orders.forEach(o => printOrder(o));
    }
    console.log();
  } catch (e) {
    console.error('   Ошибка:', e.message, '\n');
  }

  if (ORDER_ID) {
    console.log(`🔍 Детали ордера #${ORDER_ID}:`);
    try {
      const order = await client.getOrder(ORDER_ID);
      printOrder(order, true);

      console.log(`\n   Трейды по ордеру:`);
      const deals = await client.orderDeals(ORDER_ID);
      const list = Array.isArray(deals) ? deals : (deals?.resultList || []);
      if (list.length === 0) {
        console.log('   Нет сделок');
      } else {
        list.forEach(d => {
          console.log(`   - Цена: ${d.price}, Кол-во: ${d.vol}, Комиссия: ${d.fee} ${d.feeCurrency}`);
          console.log(`     Время: ${new Date(d.timestamp).toLocaleString('ru-RU')}`);
        });
      }
    } catch (e) {
      console.error('   Ошибка:', e.message);
    }
    console.log();
  } else {
    console.log('ℹ️  Для деталей конкретного ордера:');
    console.log(`   ORDER_ID=793688897413532160 node --env-file=.env examples/futures.js\n`);
  }

  try {
      const history = await client.orderHistory(SYMBOL, { pageSize: 5 });
      // API возвращает массив напрямую
      const list = Array.isArray(history) ? history : (history?.resultList || []);
      console.log(`📜 История ордеров (Количество: ${list.length}, ${SYMBOL}):`);
    if (list.length === 0) {
      console.log('   История пуста');
    } else {
      list.forEach(o => printOrder(o));
    }
  } catch (e) {
    console.error('   Ошибка:', e.message);
  }
}

function printOrder(o, detailed = false) {
  const G = '\x1b[32m', R = '\x1b[31m', RESET = '\x1b[0m', BOLD = '\x1b[1m';

  // Сторона: LONG/открытие = зелёный, SHORT/закрытие лонга = красный
  const SIDE = {
    1: `${G}BUY LONG${RESET}`,
    2: `${R}SELL SHORT${RESET}`,
    3: `${G}BUY (close short)${RESET}`,
    4: `${R}SELL (close long)${RESET}`,
  };
  const STATE = { 1: 'ОЖИДАНИЕ', 2: 'АКТИВЕН', 3: 'ИСПОЛНЕН', 4: 'ОТМЕНЁН', 5: 'ОТМЕНЁН (частично)' };
  const TYPE  = { 1: 'LIMIT', 2: 'POST_ONLY', 3: 'MARKET', 4: 'STOP_LIMIT', 5: 'MARKET (стоп)' };

  // P&L
  let pnlStr = '';
  if (o.profit !== undefined && o.profit !== 0) {
    const color = o.profit > 0 ? G : R;
    const sign  = o.profit > 0 ? '+' : '';
    const rate  = o.pnlRate !== undefined ? `  (${(o.pnlRate * 100).toFixed(2)}%)` : '';
    pnlStr = `  |  P&L: ${color}${BOLD}${sign}${o.profit} USDT${rate}${RESET}`;
  }

  console.log(`   ─────────────────────────────`);
  console.log(`   ID:      ${o.orderId}`);
  console.log(`   Пара:    ${o.symbol}  |  Плечо: x${o.leverage}`);
  console.log(`   Сторона: ${SIDE[o.side] || o.side}  |  Тип: ${TYPE[o.orderType] || o.orderType}`);
  console.log(`   Статус:  ${STATE[o.state] || o.state}`);
  console.log(`   Цена:    ${o.dealAvgPrice || o.price}  |  Кол-во: ${o.vol} (исп: ${o.dealVol})${pnlStr}`);
  console.log(`   Комиссия: ${o.totalFee} ${o.feeCurrency}`);
  if (detailed) {
    if (o.openAvgPrice) console.log(`   Цена открытия позиции: $${o.openAvgPrice}`);
    console.log(`   usedMargin: ${o.usedMargin}  orderMargin: ${o.orderMargin}`);
  }
  console.log(`   Время:   ${new Date(o.createTime).toLocaleString('ru-RU')}`);
}

function printPosition(p) {
  const side = p.positionType === 1 ? '🔼 LONG' : '🔽 SHORT';
  const pnlSign = p.realised >= 0 ? '+' : '';

  console.log(`   ─────────────────────────────`);
  console.log(`   ${p.symbol} ${side}  x${p.leverage}`);
  console.log(`   Объём:         ${p.holdVol}`);
  console.log(`   Цена входа:    $${p.openAvgPrice}`);
  console.log(`   Ликв. цена:    $${p.liquidatePrice}`);
  console.log(`   Маржа (im):    ${p.im}`);
  console.log(`   Margin ratio:  ${(p.marginRatio * 100).toFixed(2)}%`);
  console.log(`   Realised P&L:  ${pnlSign}${p.realised}`);
  console.log(`   Profit ratio:  ${(p.profitRatio * 100).toFixed(2)}%`);
  console.log(`   Открыта:       ${new Date(p.createTime).toLocaleString('ru-RU')}`);
}

main().catch(console.error);
