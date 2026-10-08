import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Buffer } from 'node:buffer';
import console from 'node:console';

// Optional local visual verification; no authentication bypass or AWS calls.
const root = resolve(import.meta.dirname, '..');
const screenshots = resolve(root, 'docs/screenshots');
await mkdir(screenshots, { recursive: true });
const browser = spawn(
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-extensions',
    '--remote-debugging-port=9334',
    `--user-data-dir=${resolve(root, '.browser-profile/cdp')}`,
    'about:blank',
  ],
  { windowsHide: true, stdio: 'ignore' },
);
let socket;
try {
  let endpoint;
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      endpoint = (await (await globalThis.fetch('http://127.0.0.1:9334/json/version')).json())
        .webSocketDebuggerUrl;
      break;
    } catch {
      await new Promise((done) => globalThis.setTimeout(done, 500));
    }
  }
  if (!endpoint) throw new Error('Local preview browser did not start');
  socket = new globalThis.WebSocket(endpoint);
  await new Promise((done, reject) => {
    socket.onopen = done;
    socket.onerror = reject;
  });
  let sequence = 0;
  const pending = new Map();
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    const promise = pending.get(message.id);
    if (promise) {
      pending.delete(message.id);
      if (message.error) promise.reject(new Error(message.error.message));
      else promise.resolve(message.result);
    }
  };
  function command(method, params = {}, sessionId) {
    return new Promise((resolveCommand, reject) => {
      const id = ++sequence;
      pending.set(id, { resolve: resolveCommand, reject });
      socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }
  const { targetId } = await command('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await command('Target.attachToTarget', { targetId, flatten: true });
  await command('Page.enable', {}, sessionId);
  for (const [filename, route, width, height] of [
    ['phase3-landing-mobile.png', '/', 390, 1100],
    ['phase3-landing-desktop.png', '/', 1440, 1100],
    ['phase3-auth-configuration.png', '/auth', 1440, 1000],
  ]) {
    await command(
      'Emulation.setDeviceMetricsOverride',
      { width, height, deviceScaleFactor: 1, mobile: width < 500 },
      sessionId,
    );
    await command('Page.navigate', { url: `http://127.0.0.1:5173${route}` }, sessionId);
    await new Promise((done) => globalThis.setTimeout(done, 2500));
    const { result } = await command(
      'Runtime.evaluate',
      {
        expression:
          'JSON.stringify({width:innerWidth,documentWidth:document.documentElement.scrollWidth})',
        returnByValue: true,
      },
      sessionId,
    );
    console.log(filename, result.value);
    const { data } = await command('Page.captureScreenshot', { format: 'png' }, sessionId);
    await writeFile(resolve(screenshots, filename), Buffer.from(data, 'base64'));
  }
  await command('Browser.close');
} finally {
  socket?.close();
  browser.kill();
}
