/**
 * Вшивает версию из package.json в layout.js перед деплоем.
 * Запускается автоматически через GitHub Actions при пуше в main.
 * 
 * Использование: node scripts/inject-version.js
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const root    = dirname(dirname(fileURLToPath(import.meta.url)));
const pkg     = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const version = pkg.version;

const layoutPath = join(root, 'docs', 'layout.js');
let layout = readFileSync(layoutPath, 'utf8');

// Заменяем getVersion() на функцию возвращающую захардкоженную версию
const oldFn = `async function getVersion() {
  try {
    const r = await fetch('/api/version');
    const d = await r.json();
    return d.ok ? d.data.version : null;
  } catch {
    return null;
  }
}`;

const newFn = `async function getVersion() {
  // Версия вшита при сборке (scripts/inject-version.js)
  // Локально с сервером — подхватывается из /api/version
  const STATIC_VERSION = '${version}';
  try {
    const r = await fetch('/api/version');
    const d = await r.json();
    return d.ok ? d.data.version : STATIC_VERSION;
  } catch {
    return STATIC_VERSION;
  }
}`;

layout = layout.replace(oldFn, newFn);
writeFileSync(layoutPath, layout);
console.log(`✅ layout.js: версия ${version} вшита`);
