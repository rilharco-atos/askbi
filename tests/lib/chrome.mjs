/* ─── ASBKI Covilhã — cliente CDP partilhado para os testes ────────────────
   Zero dependências: liga-se ao Chrome do sistema via protocolo DevTools
   (WebSocket nativo do Node). Usado por tests/e2e.mjs, tests/legibility.mjs
   e tests/perf.mjs, seguindo o padrão dos harnesses de referência
   (review/harness2.mjs, harness3.mjs, harness4.mjs, legibility.mjs).

   Resolução do executável do Chrome, por ordem:
     1. process.env.CHROME_PATH
     2. Caminho conhecido do Windows (posto de trabalho local)
     3. Caminhos conhecidos do Linux (runners ubuntu-latest do GitHub Actions)
*/
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { platform } from 'node:os';

const CANDIDATES = {
  win32: [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ],
  linux: [
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
  ],
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ],
};

/** Devolve o caminho do executável do Chrome a usar, ou lança erro explicativo. */
export function resolveChromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const list = CANDIDATES[platform()] || [];
  const found = list.find(p => existsSync(p));
  if (found) return found;
  throw new Error(
    `Chrome não encontrado (plataforma ${platform()}). Define CHROME_PATH ou instala o Google Chrome / Chromium.`
  );
}

export const sleep = ms => new Promise(r => setTimeout(r, ms));

/**
 * Abre uma instância de Chrome headless e liga-se via CDP.
 * @param {object} opts
 * @param {number} [opts.debugPort] Porta de debugging (default 9504, ver README).
 * @param {number} [opts.width]
 * @param {number} [opts.height]
 * @returns {Promise<CdpSession>}
 */
export async function launchChrome(opts = {}) {
  const debugPort = opts.debugPort || Number(process.env.CHROME_DEBUG_PORT) || 9504;
  const width = opts.width || 1440;
  const height = opts.height || 900;
  const chromePath = resolveChromePath();
  const userDataDir = `${process.env.TEMP || process.env.TMPDIR || '/tmp'}/asbki-qa-chrome-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const args = [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`,
    '--hide-scrollbars',
    `--window-size=${width},${height}`,
    '--no-first-run',
    'about:blank',
  ];
  const proc = spawn(chromePath, args, { stdio: 'ignore' });

  let list = [];
  for (let i = 0; i < 60; i++) {
    try {
      list = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
      if (list.length) break;
    } catch { /* Chrome ainda a arrancar */ }
    await sleep(250);
  }
  const target = list.find(t => t.type === 'page');
  if (!target) { proc.kill(); throw new Error('Não foi possível obter uma página de destino do Chrome (json/list vazio)'); }

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  let id = 0;
  const pending = new Map();
  const consoleErrors = [];
  const requests = [];
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
    if (m.method === 'Runtime.exceptionThrown') {
      consoleErrors.push('EXC ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
    }
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') {
      consoleErrors.push('LOG ' + m.params.entry.text + ' ' + (m.params.entry.url || ''));
    }
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      consoleErrors.push('CONSOLE ' + m.params.args.map(a => a.value ?? a.description).join(' '));
    }
    if (m.method === 'Network.responseReceived') {
      requests.push({ url: m.params.response.url, status: m.params.response.status, mimeType: m.params.response.mimeType });
    }
  };

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const i = ++id;
    pending.set(i, m => (m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m)));
    ws.send(JSON.stringify({ id: i, method, params }));
  });

  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.result?.exceptionDetails) {
      throw new Error('Erro a avaliar no browser: ' + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text));
    }
    return r.result?.result?.value;
  };

  const screenshot = async (format = 'jpeg', quality = 80) => {
    const r = await send('Page.captureScreenshot', { format, quality: format === 'jpeg' ? quality : undefined });
    return Buffer.from(r.result.data, 'base64');
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });

  async function navigate(url, waitMs = 2600) {
    consoleErrors.length = 0;
    requests.length = 0;
    await send('Page.navigate', { url });
    await sleep(waitMs);
  }

  async function setViewport({ width: w, height: h, mobile = false, deviceScaleFactor = mobile ? 2 : 1 }) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor, mobile });
    if (mobile) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  }

  async function setNetworkConditions({ offline = false, latencyMs, downloadThroughputBps, uploadThroughputBps }) {
    await send('Network.emulateNetworkConditions', {
      offline, latency: latencyMs,
      downloadThroughput: downloadThroughputBps, uploadThroughput: uploadThroughputBps,
    });
  }

  async function setCpuThrottle(rate = 1) {
    await send('Emulation.setCPUThrottlingRate', { rate });
  }

  async function close() {
    try { ws.close(); } catch { /* já fechado */ }
    proc.kill();
  }

  return {
    send, evaluate, screenshot, navigate, setViewport, setNetworkConditions, setCpuThrottle, close,
    consoleErrors, requests,
  };
}
