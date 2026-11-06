#!/usr/bin/env node
// Screenshot the art gallery (src/ui/art/Gallery.tsx) with headless Chrome.
//
//   npx vite --port 5180 --strictPort     # in another terminal (or set GALLERY_URL)
//   node scripts/render-gallery.mjs tiles ghosts --out art-renders
//   node scripts/render-gallery.mjs tiles --clip 0,0,900,500 --scale 2 --name tiles-zoom
//   node scripts/render-gallery.mjs all
//
// Each positional arg is a gallery section (or comma-joined sections, or
// `all`); each becomes <out>/<name or section>.png. --clip x,y,w,h crops a
// region (CSS px of the page), --scale sets the device pixel ratio.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { openBrowser, sleep } from './lib/chrome.mjs';

const args = process.argv.slice(2);
const specs = [];
let out = 'art-renders';
let width = 1500;
let scale = 1;
let clip = '';
let name = '';
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--out') out = args[++i];
  else if (a === '--width') width = Number(args[++i]);
  else if (a === '--scale') scale = Number(args[++i]);
  else if (a === '--clip') clip = args[++i];
  else if (a === '--name') name = args[++i];
  else specs.push(a);
}
if (specs.length === 0) specs.push('all');

const base = process.env.GALLERY_URL ?? 'http://localhost:5180/ghost-stories/';
mkdirSync(out, { recursive: true });
const chrome = await openBrowser();
let failed = false;
const metrics = (w, h) =>
  chrome.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: scale, mobile: false });
try {
  await metrics(width, 900);
  for (const spec of specs) {
    const url = `${base}?gallery${spec === 'all' ? '' : `=${encodeURIComponent(spec)}`}`;
    await chrome.navigate(url);
    let ready = await chrome.waitFor('.gs-gallery[data-ready]', 60000);
    if (!ready) {
      await chrome.reload();
      ready = await chrome.waitFor('.gs-gallery[data-ready]', 60000);
    }
    if (!ready) failed = true;
    // Very tall captures can stall headless Chrome: cap the height (use sections or --clip for more).
    const h = Math.min(Number(await chrome.evaluate('document.documentElement.scrollHeight')) || 900, 6000);
    await metrics(width, h);
    await sleep(500);
    const params = { format: 'png' };
    if (clip) {
      const [x, y, w, hh] = clip.split(',').map(Number);
      params.clip = { x, y, width: w, height: hh, scale: 1 };
    }
    const shot = await Promise.race([
      chrome.send('Page.captureScreenshot', params),
      sleep(90000).then(() => {
        throw new Error(`screenshot of ${spec} timed out`);
      }),
    ]);
    const file = resolve(join(out, `${name || spec.replace(/,/g, '+')}.png`));
    writeFileSync(file, Buffer.from(shot.data, 'base64'));
    console.log(`${ready ? '' : 'TIMED OUT (shot anyway): '}${file}`);
    await metrics(width, 900);
  }
} finally {
  await chrome.close();
}
process.exit(failed ? 1 : 0);
