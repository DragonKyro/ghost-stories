#!/usr/bin/env node
// Screenshot the game screen in a demo state with headless Chrome.
//
//   npx vite --port 5181 --strictPort        # in another terminal (or set APP_URL)
//   node scripts/render-app.mjs --demo 40 --seed 3 [--wm] [--bs] [--size 1600,1000] [--name shot]
//   node scripts/render-app.mjs --menu        # the main menu / new game screens

import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { openBrowser, sleep } from './lib/chrome.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : d;
};
const flag = (k) => args.includes(`--${k}`);
const base = process.env.APP_URL ?? 'http://localhost:5181/ghost-stories/';
const [w, h] = opt('size', '1600,1000').split(',').map(Number);
const out = opt('out', 'art-renders');
const name = opt('name', 'app');
const hover = opt('hover', '');
mkdirSync(out, { recursive: true });
const q = flag('menu')
  ? ''
  : `?demo=${opt('demo', '30')}&seed=${opt('seed', '3')}&players=${opt('players', '4')}${flag('wm') ? '&wm' : ''}${flag('bs') ? '&bs' : ''}${flag('stats') ? '&stats' : ''}${flag('watch') ? '&watch' : ''}`;
const chrome = await openBrowser();
try {
  const mobile = flag('mobile');
  await chrome.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: mobile ? 2 : 1, mobile });
  if (mobile) await chrome.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await chrome.navigate(base + q + (opt('page', '') ? `${q ? '&' : '?'}${opt('page')}` : ''));
  await chrome.waitFor(flag('menu') ? '.gs-menu' : '.gs-board', 60000);
  await sleep(Number(opt('wait', '4000')));
  if (opt('click', '')) {
    await chrome.evaluate(`(() => { const el = document.querySelector(${JSON.stringify(opt('click'))}); el && el.click(); })()`);
    await sleep(Number(opt('after', '3500')));
  }
  if (hover) {
    await chrome.evaluate(`(() => { const el = document.querySelectorAll('.gs-space')[${Number(hover)}]; el && el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); })()`);
    await sleep(500);
  }
  // Headless Chrome sometimes captures before the first frame is composited
  // (a flat, tiny PNG): wait and try again.
  let shot = await chrome.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: true });
  for (let i = 0; i < 6 && shot.data.length < 40000; i++) {
    await chrome.evaluate('window.scrollTo(0, 1); window.scrollTo(0, 0)');
    await sleep(1500);
    shot = await chrome.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: true });
  }
  const file = resolve(join(out, `${name}.png`));
  writeFileSync(file, Buffer.from(shot.data, 'base64'));
  console.log(file);
} finally {
  await chrome.close();
}
