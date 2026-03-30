# mexc-sdk-js

Минималистичный Node.js SDK для [MEXC API](https://www.mexc.com/mexc-api) — спот и фьючерсы.  
Без зависимостей. Только встроенный `fetch` (Node.js 18+).

## Установка

```bash
git clone https://github.com/weidali/mexc-sdk-js.git
cd mexc-sdk-js
```

Зависимостей нет — `npm install` не нужен.

## Настройка

```bash
cp .env.example .env
# Откройте .env и вставьте ваши ключи
```

Ключи создаются на MEXC: **Профиль → API управление → Создать ключ**.  
Для чтения данных достаточно права `Read`.

## Запуск

```bash
# Спот — баланс, ордера
npm run order

# Фьючерсы — позиции, история, P&L
npm run futures

# Детали конкретного ордера
ORDER_ID=793688897413532160 npm run futures

# Другая пара
SYMBOL=ETH_USDT npm run futures
```

## Использование в коде

### Спот

```js
import { Spot } from './src/index.js';

const client = new Spot('API_KEY', 'API_SECRET');

// Публичные (без ключей)
const price   = await client.tickerPrice('BTCUSDT');
const book    = await client.depth('BTCUSDT', 5);
const stats   = await client.ticker24h('ETHUSDT');

// Приватные
const account = await client.accountInfo();
const order   = await client.getOrder('BTCUSDT', { orderId: '123456' });
const open    = await client.openOrders('BTCUSDT');
const history = await client.allOrders('BTCUSDT', { limit: 10 });

// Создать / отменить ордер
await client.newOrder('BTCUSDT', 'BUY', 'LIMIT', {
  quantity: '0.001',
  price: '50000',
  timeInForce: 'GTC',
});
await client.cancelOrder('BTCUSDT', { orderId: '123456' });
```

### Фьючерсы

```js
import { Futures } from './src/index.js';

const client = new Futures('API_KEY', 'API_SECRET');

// Публичные (без ключей)
const ticker  = await client.ticker('BTC_USDT');
const fr      = await client.fundingRate('BTC_USDT');

// Приватные
const assets    = await client.accountAssets();
const positions = await client.openPositions('BTC_USDT');
const order     = await client.getOrder('793688897413532160');
const history   = await client.orderHistory('BTC_USDT', { pageSize: 20 });
```

## API — Спот

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

## API — Фьючерсы

| Метод | Описание | Авторизация |
|---|---|---|
| `ticker(symbol)` | Тикер (цена, объём, 7d/30d) | ❌ |
| `fairPrice(symbol)` | Fair price | ❌ |
| `fundingRate(symbol)` | Текущий funding rate | ❌ |
| `fundingRateHistory(symbol)` | История funding rate | ❌ |
| `depth(symbol, limit)` | Стакан ордеров | ❌ |
| `accountAssets()` | Баланс аккаунта | ✅ |
| `accountAsset(currency)` | Баланс по валюте | ✅ |
| `openPositions(symbol)` | Открытые позиции | ✅ |
| `positionHistory(opts)` | История позиций | ✅ |
| `openOrders(symbol)` | Открытые ордера | ✅ |
| `orderHistory(symbol, opts)` | История ордеров | ✅ |
| `getOrder(orderId)` | Детали ордера по ID | ✅ |
| `getOrderByExternalId(symbol, oid)` | Детали по внешнему ID | ✅ |
| `orderDeals(orderId)` | Трейды по ордеру | ✅ |
| `getLeverage(symbol)` | Текущий леверидж | ✅ |
| `feeRate(symbol)` | Ставка комиссии | ✅ |

## Структура

```
mexc-sdk-js/
├── src/
│   ├── spot.js       # Спот клиент (подпись HMAC SHA256)
│   ├── futures.js    # Фьючерсный клиент (другой метод подписи)
│   └── index.js      # Экспорт
├── examples/
│   ├── demo.js       # Публичные данные спота
│   ├── get_order.js  # Спот: баланс, ордера
│   └── futures.js    # Фьючерсы: позиции, история, P&L
├── .env.example
└── README.md
```

## Различия Спот vs Фьючерсы

| | Спот | Фьючерсы |
|---|---|---|
| Base URL | `api.mexc.com` | `contract.mexc.com` |
| Подпись | `HMAC(params)` | `HMAC(apiKey + timestamp + params)` |
| Заголовок с ключом | `X-MEXC-APIKEY` | `ApiKey` |
| Формат символа | `BTCUSDT` | `BTC_USDT` |

## Разработка

### Разработка — в ветке develop
```bash
git checkout develop
# ... пишем код ...
git add .
git commit -m "feat: новая фича"
git push

git checkout develop

# Меняем версию (patch / minor / major)
npm version patch   # 1.0.0 → 1.0.1
npm version minor   # 1.0.0 → 1.1.0
npm version major   # 1.0.0 → 2.0.0

git push origin develop

# Когда готово — мержим в main через PR или локально
# Мержим в main — Actions создаст релиз и задеплоит Pages
git checkout main
git merge develop
git push          # ← триггерит GitHub Actions → обновляет страницу
```

### Локальный запуск
```bash
# Только дашборд
npm run serve

# Дашборд + WebSocket одновременно
npm run dev
```

## Лицензия

MIT