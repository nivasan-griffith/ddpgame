const fs = require('fs');
const http = require('http');
const path = require('path');
const WebSocket = require('ws');

const artifactsDir = path.resolve('artifacts');
fs.mkdirSync(artifactsDir, { recursive: true });

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, response => {
      let body = '';
      response.on('data', chunk => body += chunk);
      response.on('end', () => resolve(JSON.parse(body)));
    }).on('error', reject);
  });
}

async function main() {
  const pages = await getJson('http://127.0.0.1:9223/json');
  const page = pages.find(item => item.type === 'page');
  if (!page) throw new Error('No headless browser page is available.');

  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.once('open', resolve);
    socket.once('error', reject);
  });

  let sequence = 0;
  const pending = new Map();
  socket.on('message', raw => {
    const message = JSON.parse(raw.toString());
    if (!message.id || !pending.has(message.id)) return;

    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    message.error ? reject(new Error(message.error.message)) : resolve(message.result);
  });

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true
    });
    if (result.exceptionDetails) {
      const detail = result.exceptionDetails.exception?.description || result.exceptionDetails.text;
      throw new Error(detail);
    }
    return result.result.value;
  };
  const waitFor = async (expression, timeout = 30000) => {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      if (await evaluate(expression)) return;
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    throw new Error(`Timed out waiting for: ${expression}`);
  };
  const screenshot = async filename => {
    const result = await send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true
    });
    fs.writeFileSync(path.join(artifactsDir, filename), Buffer.from(result.data, 'base64'));
  };
  const storedModuleExists = () => evaluate(`new Promise((resolve, reject) => {
    const open = indexedDB.open('ddpgame-language-modules');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const get = open.result.transaction('modules').objectStore('modules').get('kuku-thaypan');
      get.onerror = () => reject(get.error);
      get.onsuccess = () => resolve(Boolean(get.result));
    };
  })`);

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });
  await send('Page.navigate', { url: 'http://127.0.0.1:4200/language-selection' });

  const kukuOption = `([...document.querySelectorAll('.language-select__option')]
    .find(option => option.textContent.includes('Kuku Thaypan')))`;
  await waitFor(`Boolean(${kukuOption}?.querySelector('ion-button'))`);

  if (!await evaluate(`${kukuOption}?.textContent.includes('Available offline') ?? false`)) {
    await evaluate(`${kukuOption}?.querySelector('ion-button')?.click()`);
    await waitFor(`${kukuOption}?.textContent.includes('Available offline') ?? false`, 300000);
  }

  await evaluate(`[...${kukuOption}.querySelectorAll('ion-button')]
    .find(button => button.textContent.includes('Use Kuku Thaypan')).click()`);
  await waitFor(`location.pathname === '/home'`);
  await send('Page.navigate', { url: 'http://127.0.0.1:4200/language-selection' });
  await waitFor(`${kukuOption}?.textContent.includes('Available offline') ?? false`);

  await waitFor(`Boolean(${kukuOption}?.querySelector('ion-button[color="danger"]'))`);
  await evaluate(`${kukuOption}.querySelector('ion-button[color="danger"]').click()`);
  await waitFor(`document.querySelector('ion-alert')?.presented === true`);
  await screenshot('ind-90-remove-confirmation.png');

  await waitFor(`Boolean(document.querySelector('ion-alert')?.buttons
    ?.find(button => button.role === 'destructive')?.handler)`);
  await evaluate(`(async () => {
    const alert = document.querySelector('ion-alert');
    const remove = alert.buttons.find(button => button.role === 'destructive');
    await remove.handler();
    await alert.dismiss();
  })()`);
  await waitFor(`(${kukuOption}?.textContent.includes('Download') ?? false) &&
    document.body.innerText.includes('was removed from this device')`);

  const storedAfterRemoval = await storedModuleExists();
  const selectedAfterRemoval = await evaluate(`localStorage.getItem('selected-language-id')`);
  await screenshot('ind-90-module-removed.png');

  await evaluate(`${kukuOption}.querySelector('ion-button').click()`);
  await waitFor(`${kukuOption}?.textContent.includes('Available offline') ?? false`, 300000);
  const storedAfterRedownload = await storedModuleExists();
  await screenshot('ind-90-module-redownloaded.png');
  socket.close();

  if (storedAfterRemoval || selectedAfterRemoval !== null || !storedAfterRedownload) {
    throw new Error('Removal persistence checks failed.');
  }

  console.log(JSON.stringify({
    storedAfterRemoval,
    selectedAfterRemoval,
    storedAfterRedownload,
    screenshots: [
      'artifacts/ind-90-remove-confirmation.png',
      'artifacts/ind-90-module-removed.png',
      'artifacts/ind-90-module-redownloaded.png'
    ]
  }, null, 2));
}

main().catch(error => {
  console.error(error.stack || error);
  process.exit(1);
});
