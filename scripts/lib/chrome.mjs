// Headless Chrome / Edge driven over the DevTools protocol, shared by
// render-gallery.mjs. Waiting for a selector before the
// screenshot (instead of Chrome's --screenshot flag) is what makes the shots
// reliable: --screenshot fires on its own clock and can catch a blank page
// while the fast-forwarded position is still being computed.

import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function findBrowser() {
  return [
    process.env.CHROME,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ].find((b) => b && existsSync(b));
}

async function waitForFile(path, ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (existsSync(path)) {
      const text = readFileSync(path, 'utf8');
      if (text.includes('\n')) return text;
    }
    await sleep(100);
  }
  throw new Error(`timed out waiting for ${path}`);
}

// Launch the browser and open a CDP session on its page. Returns
// { send, evaluate, waitFor, screenshot, emulate, navigate, close }.
export async function openBrowser() {
  const browser = findBrowser();
  if (!browser) throw new Error('No Chrome / Edge found; set CHROME=/path/to/browser');
  const profile = mkdtempSync(join(tmpdir(), 'gs-chrome-'));
  const proc = spawn(
    browser,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--hide-scrollbars',
      `--user-data-dir=${profile}`,
      '--remote-debugging-port=0',
      'about:blank',
    ],
    { stdio: 'ignore' },
  );
  const portFile = await waitForFile(join(profile, 'DevToolsActivePort'), 15000);
  const port = portFile.split('\n')[0].trim();
  const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = list.find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  ws.onmessage = (ev) => {
    const msg = JSON.parse(typeof ev.data === 'string' ? ev.data : ev.data.toString());
    if (msg.id && pending.has(msg.id)) {
      const { ok, fail } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) fail(new Error(msg.error.message));
      else ok(msg.result);
    }
  };
  await new Promise((r, j) => {
    ws.onopen = r;
    ws.onerror = j;
  });
  const send = (method, params = {}) =>
    new Promise((ok, fail) => {
      const n = ++id;
      pending.set(n, { ok, fail });
      ws.send(JSON.stringify({ id: n, method, params }));
    });
  await send('Page.enable');
  await send('Runtime.enable');

  const evaluate = async (expression) =>
    (await send('Runtime.evaluate', { expression, returnByValue: true })).result?.value;

  return {
    send,
    evaluate,
    emulate: (width, height, mobile = false) =>
      send('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor: mobile ? 2 : 1,
        mobile,
      }),
    navigate: (url) => send('Page.navigate', { url }),
    reload: () => send('Page.reload', { ignoreCache: false }),
    // Poll until `selector` exists (or `ms` passes), then settle briefly.
    async waitFor(selector, ms = 90000) {
      const end = Date.now() + ms;
      while (Date.now() < end) {
        if (await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`)) {
          await sleep(800);
          return true;
        }
        await sleep(250);
      }
      return false;
    },
    async screenshot() {
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      return Buffer.from(shot.data, 'base64');
    },
    async close() {
      ws.close();
      proc.kill();
      // Chrome may still hold files in its profile for a moment after exiting.
      for (let i = 0; i < 5; i++) {
        await sleep(300);
        try {
          rmSync(profile, { recursive: true, force: true });
          return;
        } catch {
          /* try again */
        }
      }
    },
  };
}
