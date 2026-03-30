/**
 * MEXC API — Получение деталей ордера
 *
 * Использование:
 *   MEXC_API_KEY=xxx MEXC_API_SECRET=yyy node examples/get_order.js
 *
 * Или создайте файл .env (скопируйте из .env.example) и запустите:
 *   node examples/get_order.js
 */

import { Spot } from '../src/index.js';

// --- Настройки ---
const API_KEY    = process.env.MEXC_API_KEY    || '';
const API_SECRET = process.env.MEXC_API_SECRET || '';

// Укажите ваши параметры:
const SYMBOL   = 'BTCUSDT';        // торговая пара
const ORDER_ID = process.env.ORDER_ID || ''; // или вставьте ID напрямую

if (!API_KEY || !API_SECRET) {
  console.error('❌ Укажите API ключи через переменные окружения:');
  console.error('   MEXC_API_KEY=... MEXC_API_SECRET=... node examples/get_order.js');
  console.error('\nИли создайте .env файл (см. .env.example)');
  process.exit(1);
}

const client = new Spot(API_KEY, API_SECRET);

async function main() {
  console.log('=== MEXC — Информация об ордере ===\n');

  // --- 1. Баланс аккаунта ---
  console.log('💼 Баланс аккаунта (ненулевые активы):');
  try {
    const account = await client.accountInfo();
    const nonZero = account.balances.filter(b => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0);
    if (nonZero.length === 0) {
      console.log('   Нет активов');
    } else {
      nonZero.forEach(b => {
        console.log(`   ${b.asset}: свободно=${b.free}, заморожено=${b.locked}`);
      });
    }
    console.log();
  } catch (e) {
    console.error('   Ошибка:', e.message, '\n');
  }

  // --- 2. Открытые ордера ---
  console.log(`📋 Открытые ордера по ${SYMBOL}:`);
  try {
    const open = await client.openOrders(SYMBOL);
    if (open.length === 0) {
      console.log('   Нет открытых ордеров');
    } else {
      open.forEach(o => printOrder(o));
    }
    console.log();
  } catch (e) {
    console.error('   Ошибка:', e.message, '\n');
  }

  // --- 3. Конкретный ордер по ID ---
  if (ORDER_ID) {
    console.log(`🔍 Детали ордера #${ORDER_ID}:`);
    try {
      const order = await client.getOrder(SYMBOL, { orderId: ORDER_ID });
      printOrder(order, true);
    } catch (e) {
      console.error('   Ошибка:', e.message);
    }
    console.log();
  } else {
    console.log('ℹ️  Для запроса конкретного ордера укажите ORDER_ID:');
    console.log('   ORDER_ID=12345 node examples/get_order.js\n');
  }

  // --- 4. История ордеров (последние 5) ---
  console.log(`📜 Последние ордера по ${SYMBOL}:`);
  try {
    const history = await client.allOrders(SYMBOL, { limit: 5 });
    if (history.length === 0) {
      console.log('   История пуста');
    } else {
      history.reverse().forEach(o => printOrder(o));
    }
  } catch (e) {
    console.error('   Ошибка:', e.message);
  }
}

function printOrder(o, detailed = false) {
  const STATUS = {
    NEW: '🟡 NEW',
    PARTIALLY_FILLED: '🟠 ЧАСТИЧНО ИСПОЛНЕН',
    FILLED: '🟢 ИСПОЛНЕН',
    CANCELED: '🔴 ОТМЕНЁН',
    REJECTED: '❌ ОТКЛОНЁН',
    EXPIRED: '⚪ ИСТЁК',
  };

  const side   = o.side === 'BUY' ? '🔼 BUY' : '🔽 SELL';
  const status = STATUS[o.status] || o.status;
  const time   = new Date(o.time || o.transactTime).toLocaleString('ru-RU');

  console.log(`   ─────────────────────────────`);
  console.log(`   ID:       ${o.orderId}`);
  console.log(`   Пара:     ${o.symbol}`);
  console.log(`   Сторона:  ${side}  |  Тип: ${o.type}`);
  console.log(`   Статус:   ${status}`);
  console.log(`   Цена:     ${o.price || 'MARKET'}`);
  console.log(`   Кол-во:   ${o.origQty} (исп: ${o.executedQty})`);
  if (detailed) {
    console.log(`   Сумма:    ${o.cummulativeQuoteQty} USDT`);
    console.log(`   TimeInForce: ${o.timeInForce}`);
  }
  console.log(`   Время:    ${time}`);
}

main().catch(console.error);
