# MEXC API SDK (Node.js)

Минималистичный SDK для работы с MEXC API v3 (спот).  
Не требует сторонних зависимостей — только встроенный `fetch` (Node 18+).

## Быстрый старт

```bash
# 1. Публичные данные (ключи не нужны)
node examples/demo.js

# 2. Приватные методы — укажите ключи
MEXC_API_KEY=xxx MEXC_API_SECRET=yyy node examples/get_order.js

# 3. Детали конкретного ордера
MEXC_API_KEY=xxx MEXC_API_SECRET=yyy ORDER_ID=12345 node examples/get_order.js
```

## Использование в своём коде

```js
import { Spot } from './src/index.js';

const client = new Spot('API_KEY', 'API_SECRET');

// Публичные методы (без ключей)
const price = await client.tickerPrice('BTCUSDT');
const book  = await client.depth('BTCUSDT', 5);
const stats = await client.ticker24h('ETHUSDT');

// Приватные методы (нужны ключи)
const account = await client.accountInfo();
const order   = await client.getOrder('BTCUSDT', { orderId: '123456' });
const open    = await client.openOrders('BTCUSDT');
const history = await client.allOrders('BTCUSDT', { limit: 10 });

// Создать ордер
const newOrder = await client.newOrder('BTCUSDT', 'BUY', 'LIMIT', {
  quantity: '0.001',
  price: '50000',
  timeInForce: 'GTC',
});

// Отменить ордер
await client.cancelOrder('BTCUSDT', { orderId: '123456' });
```

## Получение API ключей

1. Зайдите на [mexc.com](https://mexc.com) → **Профиль → API**
2. Нажмите **Создать API ключ**
3. Установите разрешения: `Read` (для просмотра), `Trade` (для торговли)
4. Настройте IP-ограничения для безопасности
5. Скопируйте `API Key` и `Secret Key`

## Доступные методы

| Метод | Описание | Авторизация |
|---|---|---|
| `tickerPrice(symbol)` | Текущая цена | ❌ |
| `depth(symbol, limit)` | Стакан ордеров | ❌ |
| `ticker24h(symbol)` | 24h статистика | ❌ |
| `exchangeInfo(symbol)` | Информация о бирже | ❌ |
| `accountInfo()` | Баланс аккаунта | ✅ |
| `getOrder(symbol, {orderId})` | Детали ордера | ✅ |
| `openOrders(symbol)` | Открытые ордера | ✅ |
| `allOrders(symbol, opts)` | История ордеров | ✅ |
| `newOrder(symbol, side, type, opts)` | Создать ордер | ✅ |
| `cancelOrder(symbol, {orderId})` | Отменить ордер | ✅ |
| `myTrades(symbol, opts)` | История сделок | ✅ |