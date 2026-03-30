import crypto from 'crypto';

const BASE_URL = 'https://api.mexc.com';

export class Spot {
  constructor(apiKey = '', apiSecret = '') {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
  }

  // --- Подпись ---
  #sign(queryString) {
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(queryString)
      .digest('hex');
  }

  #buildQuery(params) {
    return Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${k}=${v}`)
      .join('&');
  }

  // --- Базовый запрос ---
  async #request(method, path, params = {}, signed = false) {
    let query = this.#buildQuery(params);

    if (signed) {
      const timestamp = Date.now();
      query += (query ? '&' : '') + `timestamp=${timestamp}`;
      const signature = this.#sign(query);
      query += `&signature=${signature}`;
    }

    const url = `${BASE_URL}${path}${query ? '?' + query : ''}`;

    const headers = { 'Content-Type': 'application/json' };
    if (this.apiKey) headers['X-MEXC-APIKEY'] = this.apiKey;

    const res = await fetch(url, { method, headers });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(`MEXC API Error ${res.status}: ${JSON.stringify(data)}`);
    }
    return data;
  }

  // =====================
  //   ПУБЛИЧНЫЕ МЕТОДЫ
  // =====================

  /** Информация о бирже */
  exchangeInfo(symbol) {
    return this.#request('GET', '/api/v3/exchangeInfo', symbol ? { symbol } : {});
  }

  /** Текущая цена тикера */
  tickerPrice(symbol) {
    return this.#request('GET', '/api/v3/ticker/price', symbol ? { symbol } : {});
  }

  /** Стакан ордеров */
  depth(symbol, limit = 5) {
    return this.#request('GET', '/api/v3/depth', { symbol, limit });
  }

  /** 24h статистика */
  ticker24h(symbol) {
    return this.#request('GET', '/api/v3/ticker/24hr', symbol ? { symbol } : {});
  }

  // =====================
  //   ПРИВАТНЫЕ МЕТОДЫ
  // =====================

  /** Баланс аккаунта */
  accountInfo() {
    return this.#request('GET', '/api/v3/account', {}, true);
  }

  /**
   * Детали ордера по orderId или origClientOrderId
   * @param {string} symbol   - торговая пара, напр. 'BTCUSDT'
   * @param {object} options  - { orderId } или { origClientOrderId }
   */
  getOrder(symbol, options = {}) {
    return this.#request('GET', '/api/v3/order', { symbol, ...options }, true);
  }

  /** Все открытые ордера */
  openOrders(symbol) {
    return this.#request('GET', '/api/v3/openOrders', { symbol }, true);
  }

  /** История ордеров */
  allOrders(symbol, options = {}) {
    return this.#request('GET', '/api/v3/allOrders', { symbol, ...options }, true);
  }

  /** Создать ордер */
  newOrder(symbol, side, type, options = {}) {
    // side: 'BUY' | 'SELL'
    // type: 'LIMIT' | 'MARKET' | 'LIMIT_MAKER'
    return this.#request('POST', '/api/v3/order',
      { symbol, side, type, ...options }, true);
  }

  /** Отменить ордер */
  cancelOrder(symbol, options = {}) {
    return this.#request('DELETE', '/api/v3/order', { symbol, ...options }, true);
  }

  /** История сделок (трейды) */
  myTrades(symbol, options = {}) {
    return this.#request('GET', '/api/v3/myTrades', { symbol, ...options }, true);
  }
}