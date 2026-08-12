import { spawn } from 'node:child_process';

const targetUrl = process.env.MOBILE_CHECK_URL || 'http://127.0.0.1:3000/';
const debugPort = Number(process.env.MOBILE_CHECK_PORT || 9227);
const chromium = process.env.CHROMIUM_BIN || 'chromium';

const browser = spawn(chromium, [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  '--disable-dev-shm-usage',
  `--remote-debugging-port=${debugPort}`,
  `--user-data-dir=/tmp/clothing-ad-mobile-check-${process.pid}`,
  'about:blank',
], { stdio: 'ignore' });

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function getDebugData(path) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}${path}`);
      if (response.ok) return response.json();
    } catch {
      // Chromium has not opened the debugging socket yet.
    }
    await wait(100);
  }
  throw new Error('تعذّر فتح قناة فحص Chromium في الوقت المحدد.');
}

async function connectCdp() {
  const targets = await getDebugData('/json/list');
  const page = targets.find((target) => target.type === 'page');
  if (!page?.webSocketDebuggerUrl) throw new Error('تعذّر العثور على صفحة Chromium للفحص.');
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });

  let sequence = 0;
  const pending = new Map();
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (!message.id) return;
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result);
  });

  return {
    send(method, params = {}) {
      const id = ++sequence;
      socket.send(JSON.stringify({ id, method, params }));
      return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    },
    close() {
      socket.close();
    },
  };
}

try {
  const cdp = await connectCdp();
  await cdp.send('Page.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
    screenOrientation: { type: 'portraitPrimary', angle: 0 },
  });
  await cdp.send('Page.navigate', { url: targetUrl });
  await wait(1_200);

  const { result } = await cdp.send('Runtime.evaluate', {
    returnByValue: true,
    awaitPromise: true,
    expression: `(() => {
      const viewportWidth = window.innerWidth;
      const documentWidth = document.documentElement.scrollWidth;
      const bodyWidth = document.body.scrollWidth;
      const overflowing = [...document.querySelectorAll('*')]
        .filter((element) => {
          const box = element.getBoundingClientRect();
          return box.left < -1 || box.right > viewportWidth + 1;
        })
        .slice(0, 5)
        .map((element) => {
          const box = element.getBoundingClientRect();
          return {
            tag: element.tagName.toLowerCase(),
            className: typeof element.className === 'string' ? element.className : '',
            left: Math.round(box.left),
            right: Math.round(box.right),
            width: Math.round(box.width),
          };
        });
      const importantElements = ['#root', 'main', 'header', 'nav']
        .map((selector) => {
          const element = document.querySelector(selector);
          if (!element) return { selector, found: false, withinViewport: false };
          const box = element.getBoundingClientRect();
          return {
            selector,
            found: true,
            left: Math.round(box.left),
            right: Math.round(box.right),
            width: Math.round(box.width),
            withinViewport: box.left >= -1 && box.right <= viewportWidth + 1,
          };
        });
      const requiredElementsPass = importantElements
        .filter((element) => element.selector === '#root' || element.selector === 'main')
        .every((element) => element.found && element.withinViewport);
      const presentElementsPass = importantElements
        .filter((element) => element.found)
        .every((element) => element.withinViewport);
      return {
        viewportWidth,
        documentWidth,
        bodyWidth,
        passes: documentWidth <= viewportWidth && bodyWidth <= viewportWidth && overflowing.length === 0 && requiredElementsPass && presentElementsPass,
        overflowing,
        importantElements,
      };
    })()`,
  });

  console.log(JSON.stringify(result.value, null, 2));
  cdp.close();
  browser.kill('SIGTERM');
  if (!result.value.passes) process.exitCode = 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
  browser.kill('SIGTERM');
}
