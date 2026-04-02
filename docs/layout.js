/**
 * Общая навигация и футер для всех страниц дашборда.
 * Подключается в каждой странице:
 *   <script type="module" src="layout.js"></script>
 *   <div id="app-header"></div>
 *   ... контент ...
 *   <div id="app-footer"></div>
 */

// Определяем активную страницу
const PAGE = location.pathname.split('/').pop() || 'index.html';

const NAV_LINKS = [
  { href: 'index.html',    label: 'Документация' },
  { href: 'metrics.html',  label: 'Метрики'      },
  { href: 'analysis.html', label: 'Анализ'       },
];

// Получаем версию из сервера (или package.json через API)
async function getVersion() {
  try {
    const r = await fetch('/api/version');
    const d = await r.json();
    return d.ok ? d.data.version : null;
  } catch {
    return null;
  }
}

function renderHeader(version) {
  const nav = NAV_LINKS.map(({ href, label }) => {
    const active = PAGE === href;
    return `<a href="${href}" class="nav-link${active ? ' nav-active' : ''}">${label}</a>`;
  }).join('');

  const ver = version ? `<span class="hbadge hbadge-green">v${version}</span>` : '';

  return `
<header class="app-header">
  <a class="logo" href="index.html">
    <div class="logo-icon">M</div>
    <div class="logo-text">mexc-sdk<span>-js</span></div>
  </a>
  <nav class="app-nav">${nav}</nav>
  <div class="header-meta">
    ${ver}
    <span class="hbadge hbadge-blue">Node.js 18+</span>
    <span class="hbadge hbadge-gray">MIT</span>
  </div>
</header>`;
}

function renderFooter(version) {
  const year = new Date().getFullYear();
  const ver  = version ? ` · v${version}` : '';
  return `
<footer class="app-footer">
  <span>mexc-sdk-js${ver} · MIT · ${year}</span>
  <span class="footer-links">
    <a href="https://github.com/weidali/mexc-sdk-js" target="_blank">GitHub</a>
    <span class="fdot">·</span>
    <a href="https://mexcdevelop.github.io/apidocs/contract_v1_en/" target="_blank">MEXC API Docs</a>
    <span class="fdot">·</span>
    <a href="https://weidali.github.io/mexc-sdk-js" target="_blank">Pages</a>
  </span>
</footer>`;
}

const STYLES = `
<style id="layout-styles">
  /* ── Header ── */
  .app-header {
    display: flex;
    align-items: center;
    gap: 0;
    justify-content: space-between;
    padding: 0 24px;
    height: 52px;
    background: #0f1217;
    border-bottom: 1px solid #1e2530;
    position: sticky;
    top: 0;
    z-index: 200;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 10px;
    text-decoration: none;
    flex-shrink: 0;
  }

  .logo-icon {
    width: 28px; height: 28px;
    background: #00d97e;
    border-radius: 5px;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; font-weight: 700; color: #000;
    font-family: 'JetBrains Mono', monospace;
  }

  .logo-text {
    font-family: 'JetBrains Mono', monospace;
    font-size: 14px; font-weight: 600; color: #e2e8f0;
  }

  .logo-text span { color: #00d97e; }

  .app-nav {
    display: flex;
    align-items: center;
    gap: 2px;
    flex: 1;
    justify-content: center;
  }

  .nav-link {
    padding: 6px 16px;
    border-radius: 6px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    font-weight: 500;
    color: #7a8899;
    text-decoration: none;
    border: 1px solid transparent;
    transition: color .15s, background .15s, border-color .15s;
  }

  .nav-link:hover {
    color: #e2e8f0;
    background: rgba(255,255,255,.04);
  }

  .nav-active {
    color: #00d97e !important;
    background: rgba(0,217,126,.1) !important;
    border-color: rgba(0,217,126,.2) !important;
  }

  .header-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  .hbadge {
    padding: 3px 8px;
    border-radius: 4px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .5px;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .hbadge-green  { background: rgba(0,217,126,.1);   color: #00d97e; border: 1px solid rgba(0,217,126,.2); }
  .hbadge-blue   { background: rgba(61,142,245,.1);  color: #3d8ef5; border: 1px solid rgba(61,142,245,.2); }
  .hbadge-gray   { background: rgba(255,255,255,.04); color: #7a8899; border: 1px solid #1e2530; }
  .hbadge-yellow { background: rgba(245,197,66,.1);  color: #f5c542; border: 1px solid rgba(245,197,66,.2); }

  /* ── Footer ── */
  .app-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 24px;
    margin-top: 32px;
    border-top: 1px solid #1e2530;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: #3a4655;
  }

  .footer-links {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .app-footer a {
    color: #7a8899;
    text-decoration: none;
    transition: color .15s;
  }

  .app-footer a:hover { color: #00d97e; }
  .fdot { color: #1e2530; }

  @media (max-width: 700px) {
    .header-meta .hbadge-blue,
    .header-meta .hbadge-gray { display: none; }
    .app-nav { gap: 0; }
    .nav-link { padding: 6px 10px; }
  }
</style>
`;

// Монтируем в DOM
async function mount() {
  // Инжектим стили один раз
  if (!document.getElementById('layout-styles')) {
    document.head.insertAdjacentHTML('beforeend', STYLES);
  }

  const version = await getVersion();

  // Header
  const headerEl = document.getElementById('app-header');
  if (headerEl) {
    headerEl.outerHTML = renderHeader(version);
  }

  // Footer
  const footerEl = document.getElementById('app-footer');
  if (footerEl) {
    footerEl.outerHTML = renderFooter(version);
  }
}

// Запускаем после загрузки DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}