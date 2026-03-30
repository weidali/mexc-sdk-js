import crypto from 'crypto';

const BASE_URL = 'https://contract.mexc.com';

export class Futures {
  constructor(apiKey = '', apiSecret = '') {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
  }

  // --- Подпись для фьючерсов: accessKey + timestamp + params ---
  #sign(timestamp, paramString) {
    const str = this.apiKey + timestamp + paramString;
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(str)
      .digest('hex');
  }

  #buildQuery(params) {
    return Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null)
      .sort(([a], [b]) => a.localeCompare(b)) // словарный порядок
      .map(([k, v]) => `${k}=${v}`)
      .join('&');
  }

  async #request(method, path, params = {}, signed = false) {
    const timestamp = String(Date.now());

    let url = `${BASE_URL}${path}`;
    let body = null;
    let paramString = '';

    if (method === 'GET' || method === 'DELETE') {
      paramString = this.#buildQuery(params);
      if (paramString) url += '?' + paramString;
    } else {
      // POST — JSON строка
      paramString = Object.keys(params).length ? JSON.stringify(params) : '';
      body = paramString || null;
    }

    const headers = { 'Content-Type': 'application/json' };

    if (signed) {
      const signature = this.#sign(timestamp, paramString);
      headers['ApiKey'] = this.apiKey;
      headers['Request-Time'] = timestamp;
      headers['Signature'] = signature;
    }

    const res = await fetch(url, { method, headers, body });
    const data = await res.json();

    if (!data.success) {
      throw new Error(`MEXC Futures Error ${data.code}: ${data.message || JSON.stringify(data)}`);
    }
    return data.data;
  }

  // =====================
  //   ПУБЛИЧНЫЕ МЕТОДЫ
  // =====================

  /** Серверное время */
  serverTime() {
    return this.#request('GET', '/api/v1/contract/ping');
  }

  /** Информация о контракте */
  contractDetail(symbol) {
    return this.#request('GET', '/api/v1/contract/detail', symbol ? { symbol } : {});
  }

  /** Стакан ордеров */
  depth(symbol, limit = 5) {
    return this.#request('GET', `/api/v1/contract/depth/${symbol}`, { limit });
  }

  /** Текущая цена (fair price) */
  fairPrice(symbol) {
    return this.#request('GET', `/api/v1/contract/fair_price/${symbol}`);
  }

  /** Funding rate */
  fundingRate(symbol) {
    return this.#request('GET', `/api/v1/contract/funding_rate/${symbol}`);
  }

  /** История funding rate */
  fundingRateHistory(symbol, options = {}) {
    return this.#request('GET', '/api/v1/contract/funding_rate/history', { symbol, ...options });
  }

  /** Тренд (24h статистика) */
  ticker(symbol) {
    return this.#request('GET', '/api/v1/contract/ticker', symbol ? { symbol } : {});
  }

  // =====================
  //   ПРИВАТНЫЕ МЕТОДЫ
  // =====================

  /** Баланс аккаунта (все валюты) */
  accountAssets() {
    return this.#request('GET', '/api/v1/private/account/assets', {}, true);
  }

  /** Баланс по конкретной валюте */
  accountAsset(currency) {
    return this.#request('GET', `/api/v1/private/account/asset/${currency}`, {}, true);
  }

  /** Текущие открытые позиции */
  openPositions(symbol) {
    return this.#request('GET', '/api/v1/private/position/open_positions',
      symbol ? { symbol } : {}, true);
  }

  /** История позиций */
  positionHistory(options = {}) {
    return this.#request('GET', '/api/v1/private/position/list/history_positions', options, true);
  }

  /** Текущие открытые ордера */
  openOrders(symbol, options = {}) {
    return this.#request('GET', '/api/v1/private/order/list/open_orders/' + (symbol || ''),
      options, true);
  }

  /** История всех ордеров */
  orderHistory(symbol, options = {}) {
    return this.#request('GET', '/api/v1/private/order/list/history_orders',
      { symbol, ...options }, true);
  }

  /**
   * Детали ордера по orderId
   * @param {string} orderId
   */
  getOrder(orderId) {
    return this.#request('GET', `/api/v1/private/order/get/${orderId}`, {}, true);
  }

  /**
   * Детали ордера по внешнему ID (externalOid)
   * @param {string} symbol
   * @param {string} externalOid
   */
  getOrderByExternalId(symbol, externalOid) {
    return this.#request('GET', `/api/v1/private/order/external/${symbol}/${externalOid}`, {}, true);
  }

  /** Трейды по ордеру */
  orderDeals(orderId, options = {}) {
    return this.#request('GET', `/api/v1/private/order/deal_details/${orderId}`, options, true);
  }

  /** Все трейды пользователя */
  allDeals(symbol, options = {}) {
    return this.#request('GET', '/api/v1/private/order/list/order_deals',
      { symbol, ...options }, true);
  }

  /** Текущий леверидж */
  getLeverage(symbol) {
    return this.#request('GET', '/api/v1/private/position/leverage', { symbol }, true);
  }

  /** Текущая ставка комиссии */
  feeRate(symbol) {
    return this.#request('GET', '/api/v1/private/account/tiered_fee_rate', { symbol }, true);
  }
}
