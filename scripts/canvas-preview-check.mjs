import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const baseUrl = process.env.CANVAS_CHECK_URL || 'http://127.0.0.1:3000/';
const port = 9228;
const samplePath = '/tmp/clothing-ad-sample.png';
const screenshotPath = '/home/ubuntu/canvas-preview-check.png';

await writeFile(samplePath, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL5ZQAAAABJRU5ErkJggg==', 'base64'));

const browser = spawn('chromium', ['--headless=new', '--no-sandbox', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/canvas-preview-${process.pid}`, 'about:blank'], { stdio: 'ignore' });
const wait = (milliseconds) => new Promise(resolve => setTimeout(resolve, milliseconds));

async function json(path) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}${path}`);
      if (response.ok) return response.json();
    } catch { /* Browser is still booting. */ }
    await wait(100);
  }
  throw new Error('تعذر تشغيل فحص Canvas في Chromium.');
}

async function connect() {
  const target = (await json('/json/list')).find(entry => entry.type === 'page');
  if (!target?.webSocketDebuggerUrl) throw new Error('تعذر إيجاد صفحة Chromium.');
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  let id = 0;
  const requests = new Map();
  socket.addEventListener('message', ({ data }) => {
    const payload = JSON.parse(data);
    if (!payload.id) return;
    const request = requests.get(payload.id);
    if (!request) return;
    requests.delete(payload.id);
    if (payload.error) request.reject(new Error(payload.error.message));
    else request.resolve(payload.result);
  });
  return {
    send(method, params = {}) {
      const requestId = ++id;
      socket.send(JSON.stringify({ id: requestId, method, params }));
      return new Promise((resolve, reject) => requests.set(requestId, { resolve, reject }));
    },
    close: () => socket.close(),
  };
}

async function evaluate(cdp, expression) {
  const { result } = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  return result.value;
}

try {
  const cdp = await connect();
  await cdp.send('Page.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true, screenOrientation: { type: 'portraitPrimary', angle: 0 } });
  await cdp.send('Page.navigate', { url: baseUrl });
  await wait(900);

  const { root } = await cdp.send('DOM.getDocument');
  const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: 'input[type=file]' });
  if (!nodeId) throw new Error('تعذر إيجاد حقل اختيار الصورة في الواجهة.');
  await cdp.send('DOM.setFileInputFiles', { files: [samplePath], nodeId });
  await wait(900);

  await evaluate(cdp, `(() => {
    const fields = [...document.querySelectorAll('input:not([type=file])')];
    const values = ['فستان بلوشي أنيق', '3000', 'ريال', '30', '10', 'متجر مروان', '770976559', 'أبيض'];
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    fields.forEach((field, index) => {
      if (values[index] === undefined) return;
      setter.call(field, values[index]);
      field.dispatchEvent(new Event('input', { bubbles: true }));
    });
    [...document.querySelectorAll('button')].find(button => button.textContent.includes('توليد الإعلان'))?.click();
  })()`);
  await wait(3_000);

  const preview = await evaluate(cdp, `(() => ({
    finalImage: document.querySelector('img[alt="معاينة الإعلان النهائي"]')?.getAttribute('src') || '',
    hasEdit: [...document.querySelectorAll('button')].some(button => button.textContent.includes('تعديل')),
    hasStoreFields: [...document.querySelectorAll('input')].some(input => input.value === 'متجر مروان'),
  }))()`);
  const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  await writeFile(screenshotPath, Buffer.from(screenshot.data, 'base64'));
  console.log(JSON.stringify({ ...preview, screenshotPath }, null, 2));
  cdp.close();
  browser.kill('SIGTERM');
  if (!preview.finalImage || !preview.hasEdit) process.exitCode = 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  browser.kill('SIGTERM');
  process.exitCode = 1;
}
