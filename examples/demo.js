/**
 * MEXC API SDK — Демонстрация публичных методов
 * (не требует API ключей)
 *
 * Запуск: node examples/demo.js
 */

import { Spot } from '../src/index.js';

const client = new Spot(); // без ключей для публичных методов

async function main() {
  console.log('=== MEXC API SDK Demo ===\n');

  // 1. Текущая цена BTC
  console.log('📈 Цена BTC/USDT:');
  try {
    const price = await client.tickerPrice('BTCUSDT');
    console.log(`   ${price.symbol}: $${Number(price.price).toLocaleString()}\n`);
  } catch (e) {
    console.error('   Ошибка:', e.message, '\n');
  }

  // 2. Стакан ордеров
  console.log('📊 Стакан ордеров BTC/USDT (топ-3):');
  try {
    const book = await client.depth('BTCUSDT', 3);
    console.log('   Asks (продажа):');
    book.asks.forEach(([p, q]) => console.log(`     $${Number(p).toLocaleString()} — ${q} BTC`));
    console.log('   Bids (покупка):');
    book.bids.forEach(([p, q]) => console.log(`     $${Number(p).toLocaleString()} — ${q} BTC`));
    console.log();
  } catch (e) {
    console.error('   Ошибка:', e.message, '\n');
  }

  // 3. 24h статистика ETH
  console.log('📉 24h статистика ETH/USDT:');
  try {
    const stats = await client.ticker24h('ETHUSDT');
    console.log(`   Открытие:  $${Number(stats.openPrice).toLocaleString()}`);
    console.log(`   Текущая:   $${Number(stats.lastPrice).toLocaleString()}`);
    console.log(`   Высшая:    $${Number(stats.highPrice).toLocaleString()}`);
    console.log(`   Низшая:    $${Number(stats.lowPrice).toLocaleString()}`);
    console.log(`   Изменение: ${stats.priceChangePercent}%`);
    console.log(`   Объём:     ${Number(stats.volume).toLocaleString()} ETH\n`);
  } catch (e) {
    console.error('   Ошибка:', e.message, '\n');
  }

  console.log('✅ Публичные методы работают!');
  console.log('ℹ️  Для приватных методов (ордера, баланс) — запустите: node examples/get_order.js');
}

main().catch(console.error);