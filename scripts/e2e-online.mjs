#!/usr/bin/env node
// End-to-end online check with two headless browsers against the real
// Firebase database: the host creates a room, a guest joins by link and sits
// on green, the host gives blue and yellow to the AI and starts; both screens
// must show the same game.
//
//   npx vite --port 5181 --strictPort      # in another terminal (or set APP_URL)
//   node scripts/e2e-online.mjs [--out art-renders]

import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { openBrowser, sleep } from './lib/chrome.mjs';

const base = process.env.APP_URL ?? 'http://localhost:5181/ghost-stories/';
const outIdx = process.argv.indexOf('--out');
const out = outIdx >= 0 ? process.argv[outIdx + 1] : 'art-renders';
mkdirSync(out, { recursive: true });

async function browser(name) {
  const b = await openBrowser();
  await b.send('Emulation.setDeviceMetricsOverride', { width: 1500, height: 950, deviceScaleFactor: 1, mobile: false });
  await b.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `try { localStorage.setItem('ghoststories.name', ${JSON.stringify(name)}) } catch {}`,
  });
  return b;
}

const js = (b, code) => b.evaluate(`(() => { ${code} })()`);
const click = (b, sel) => js(b, `const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return false; el.click(); return true`);
const clickText = (b, text) =>
  js(b, `const el = [...document.querySelectorAll('button')].find((x) => x.textContent.trim().includes(${JSON.stringify(text)}) && !x.disabled); if (!el) return false; el.click(); return true`);
const setSelect = (b, sel, value) =>
  js(
    b,
    `const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return false;
     const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set; set.call(el, ${JSON.stringify(value)});
     el.dispatchEvent(new Event('change', { bubbles: true })); return true`,
  );
async function until(b, code, ms = 30000) {
  const t = Date.now();
  while (Date.now() - t < ms) {
    const v = await js(b, code);
    if (v) return v;
    await sleep(400);
  }
  return null;
}
async function shot(b, file) {
  await b.send('Page.bringToFront');
  const s = await b.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  writeFileSync(resolve(join(out, file)), Buffer.from(s.data, 'base64'));
}

const host = await browser('Hana');
const guest = await browser('Gil');
let ok = false;
try {
  await host.navigate(base);
  await until(host, `return !!document.querySelector('.gs-menu')`);
  await click(host, '.gs-menu-buttons .gs-btn:nth-child(2)');
  await until(host, `return !!document.querySelector('.ol-buttons button')`);
  await click(host, '.ol-buttons button');
  const code = await until(host, `return document.querySelector('.ol-roomcode-value')?.textContent?.trim() || null`, 40000);
  if (!code) throw new Error('host: no room code');
  console.log('room', code);

  await guest.navigate(`${base}?room=${code}`);
  const sat = await until(guest, `const b = document.querySelector('.ol-area-green .ol-seat-actions button'); if (!b) return null; b.click(); return true`, 40000);
  if (!sat) throw new Error('guest: could not sit on green');
  await sleep(1500);

  await until(host, `return !!document.querySelector('.ol-area-blue .ol-select')`);
  await setSelect(host, '.ol-area-blue .ol-select', 'ai');
  await sleep(700);
  await setSelect(host, '.ol-area-yellow .ol-select', 'ai');
  await sleep(1500);
  if (!(await clickText(host, 'Start game'))) throw new Error('host: Start game is not available');

  const hb = await until(host, `return !!document.querySelector('.gs-board')`, 40000);
  const gb = await until(guest, `return !!document.querySelector('.gs-board')`, 40000);
  if (!hb || !gb) throw new Error(`game screen missing (host ${hb}, guest ${gb})`);
  await sleep(6000); // AI seats play on the host; moves flow to the guest
  const header = (b) => js(b, `return document.querySelector('.gs-header')?.innerText.split('\\n').slice(0, 6).join(' ')`);
  const log = (b) => js(b, `return document.querySelectorAll('.gs-log .gs-entry').length`);
  const [h1, g1, hl, gl] = [await header(host), await header(guest), await log(host), await log(guest)];
  console.log('host :', h1, `(${hl} log lines)`);
  console.log('guest:', g1, `(${gl} log lines)`);
  await shot(host, 'online-host.png');
  await shot(guest, 'online-guest.png');
  ok = h1 === g1 && hl === gl;
  console.log(ok ? 'IN STEP' : 'OUT OF STEP');
} finally {
  await host.close();
  await guest.close();
}
process.exit(ok ? 0 : 1);
