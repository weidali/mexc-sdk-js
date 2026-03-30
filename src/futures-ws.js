import crypto from 'crypto';
import { WebSocket } from 'ws';

const WS_URL = 'wss://contract.mexc.com/edge';

export class FuturesWS {
  #ws = null;
  #apiKey;
  #apiSecret;
  #handlers = {};
  #pingInterval = null;
  #reconnectTimer = null;
  #reconnectDelay = 3000;
  #intentionalClose = false;

  constructor(apiKey = '', apiSecret = '') {
    this.#apiKey = apiKey;
    this.#apiSecret = apiSecret;
  }

  // --- Подпись для WS логина ---
  #sign(timestamp) {
    return crypto
      .createHmac('sha256', this.#apiSecret)
      .update(this.#apiKey + timestamp)
      .digest('hex');
  }

  // --- Подключение ---
  connect() {
    return new Promise((resolve, reject) => {
      this.#intentionalClose = false;
      this.#ws = new WebSocket(WS_URL);

      this.#ws.on('open', () => {
        console.log('🟢 WebSocket подключён');
        this.#startPing();
        resolve();
      });

      this.#ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          this.#dispatch(msg);
        } catch (e) {
          // ignore parse errors
        }
      });

      this.#ws.on('close', (code, reason) => {
        this.#stopPing();
        if (!this.#intentionalClose) {
          console.log(`🔴 WS закрыт (${code}), переподключение через ${this.#reconnectDelay / 1000}s...`);
          this.#reconnectTimer = setTimeout(() => this.#reconnect(), this.#reconnectDelay);
        }
      });

      this.#ws.on('error', (err) => {
        console.error('❌ WS ошибка:', err.message);
        reject(err);
      });
    });
  }

  async #reconnect() {
    try {
      await this.connect();
      // Переподписываемся на все каналы
      for (const channel of Object.keys(this.#handlers)) {
        this.#resubscribe(channel);
      }
    } catch (e) {
      console.error('Ошибка переподключения:', e.message);
    }
  }

  #resubscribe(channel) {
    if (channel === 'push.ticker') {
      // Нет информации о символе — пропускаем, пользователь должен переподписаться
    }
  }

  // --- Ping каждые 15 сек ---
  #startPing() {
    this.#pingInterval = setInterval(() => {
      if (this.#ws?.readyState === WebSocket.OPEN) {
        this.#send({ method: 'ping' });
      }
    }, 15000);
  }

  #stopPing() {
    if (this.#pingInterval) {
      clearInterval(this.#pingInterval);
      this.#pingInterval = null;
    }
  }

  // --- Отправка ---
  #send(obj) {
    if (this.#ws?.readyState === WebSocket.OPEN) {
      this.#ws.send(JSON.stringify(obj));
    }
  }

  // --- Диспетчер сообщений ---
  #dispatch(msg) {
    const channel = msg.channel;
    if (!channel) return;

    // Pong — игнорируем
    if (channel === 'pong') return;

    // Ищем обработчик
    const handler = this.#handlers[channel];
    if (handler) {
      handler(msg.data ?? msg, msg);
    }
  }

  // --- Логин для приватных каналов ---
  async login() {
    const timestamp = String(Date.now());
    const signature = this.#sign(timestamp);

    this.#send({
      method: 'login',
      param: {
        apiKey: this.#apiKey,
        reqTime: timestamp,
        signature,
      },
    });

    // Ждём подтверждения логина
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Login timeout')), 5000);
      const orig = this.#handlers['rs.login'];

      this.#handlers['rs.login'] = (data) => {
        clearTimeout(timeout);
        if (orig) this.#handlers['rs.login'] = orig;
        else delete this.#handlers['rs.login'];

        if (data === 'success' || data?.success) {
          console.log('🔐 WS авторизован');
          resolve();
        } else {
          reject(new Error('WS login failed: ' + JSON.stringify(data)));
        }
      };
    });
  }

  // ========================
  //   ПУБЛИЧНЫЕ ПОДПИСКИ
  // ========================

  /**
   * Цена по одному символу (push каждую секунду)
   * @param {string} symbol  - напр. 'BTC_USDT'
   * @param {Function} cb    - callback(data)
   */
  subscribeTicker(symbol, cb) {
    this.#handlers['push.ticker'] = cb;
    this.#send({ method: 'sub.ticker', param: { symbol }, gzip: false });
  }

  unsubscribeTicker(symbol) {
    delete this.#handlers['push.ticker'];
    this.#send({ method: 'unsub.ticker', param: { symbol } });
  }

  /**
   * Все тикеры сразу (push каждую секунду)
   * @param {Function} cb - callback(data[])
   */
  subscribeAllTickers(cb) {
    this.#handlers['push.tickers'] = cb;
    this.#send({ method: 'sub.tickers', param: {}, gzip: false });
  }

  /**
   * Стакан ордеров
   * @param {string} symbol
   * @param {Function} cb - callback({ asks, bids, version })
   */
  subscribeDepth(symbol, cb) {
    this.#handlers['push.depth'] = cb;
    this.#send({ method: 'sub.depth', param: { symbol }, gzip: false });
  }

  // ========================
  //   ПРИВАТНЫЕ ПОДПИСКИ
  // ========================

  /**
   * Обновления позиций, ордеров и баланса (требует login())
   * Фильтры: 'order', 'order.deal', 'position', 'asset'
   * @param {object} callbacks - { onOrder, onDeal, onPosition, onAsset }
   * @param {string[]} symbols - фильтр по парам ([] = все)
   */
  subscribePersonal(callbacks = {}, symbols = []) {
    if (callbacks.onOrder) {
      this.#handlers['push.personal.order'] = callbacks.onOrder;
    }
    if (callbacks.onDeal) {
      this.#handlers['push.personal.order.deal'] = callbacks.onDeal;
    }
    if (callbacks.onPosition) {
      this.#handlers['push.personal.position'] = callbacks.onPosition;
    }
    if (callbacks.onAsset) {
      this.#handlers['push.personal.asset'] = callbacks.onAsset;
    }

    // Фильтруем только нужные каналы
    const filters = [];
    if (callbacks.onOrder)    filters.push({ filter: 'order',       ...(symbols.length ? { rules: symbols } : {}) });
    if (callbacks.onDeal)     filters.push({ filter: 'order.deal',  ...(symbols.length ? { rules: symbols } : {}) });
    if (callbacks.onPosition) filters.push({ filter: 'position',    ...(symbols.length ? { rules: symbols } : {}) });
    if (callbacks.onAsset)    filters.push({ filter: 'asset' });

    if (filters.length) {
      this.#send({
        method: 'personal.filter',
        param: { filters },
      });
    }
  }

  // --- Закрыть соединение ---
  disconnect() {
    this.#intentionalClose = true;
    this.#stopPing();
    if (this.#reconnectTimer) clearTimeout(this.#reconnectTimer);
    this.#ws?.close();
    console.log('⚪ WebSocket отключён');
  }
}
