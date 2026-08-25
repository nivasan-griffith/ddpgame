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
  const pages = await getJson('http://127.0.0.1:9222/json');
  const page = pages.find(item => item.type === 'page');
  if (!page) throw new Error('No headless browser page is available.');

  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.once('open', resolve);
    socket.once('error', reject);
  });

  let sequence = 0;
  const pending = new Map();
  const failures = [];
  const requests = new Map();
  socket.on('message', raw => {
    const message = JSON.parse(raw.toString());
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      message.error ? reject(new Error(message.error.message)) : resolve(message.result);
    }
    if (message.method === 'Network.requestWillBeSent') {
      requests.set(message.params.requestId, message.params.request.url);
    }
    if (message.method === 'Network.loadingFailed') failures.push(message.params);
  });

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
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
    const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    fs.writeFileSync(path.join(artifactsDir, filename), Buffer.from(result.data, 'base64'));
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1
  });
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });

  await send('Page.navigate', { url: 'http://127.0.0.1:4200/language-selection' });
  const kukuOption = `[...document.querySelectorAll('.language-select__option')].find(option => option.textContent.includes('Kuku Thaypan'))`;
  await waitFor(`!!${kukuOption}?.querySelector('ion-button')`);
  const alreadyInstalled = await evaluate(`${kukuOption}?.querySelector('ion-button')?.textContent.includes('Use Kuku Thaypan')`);
  if (!alreadyInstalled) {
    await evaluate(`${kukuOption}.querySelector('ion-button').click()`);
  }
  await waitFor(`${kukuOption}?.querySelector('ion-button')?.textContent.includes('Available offline') || document.body.innerText.includes("Couldn't download")`, 300000);
  const installError = await evaluate(`document.body.innerText.includes("Couldn't download") ? document.body.innerText : null`);
  if (installError) throw new Error(installError);

  const stored = await evaluate(`new Promise((resolve, reject) => {
    const request = indexedDB.open('ddpgame-language-modules');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const get = request.result.transaction('modules').objectStore('modules').get('kuku-thaypan');
      get.onerror = () => reject(get.error);
      get.onsuccess = () => {
        const module = get.result;
        resolve({
          id: module.id,
          name: module.manifest.name,
          words: module.words.length,
          assets: Object.keys(module.assets).length,
          assetBytes: Object.values(module.assets).reduce((sum, blob) => sum + blob.size, 0)
        });
      };
    };
  })`);
  await screenshot('ind-17-installed-module.png');

  await evaluate(`${kukuOption}.querySelector('ion-button').click()`);
  await waitFor(`location.pathname === '/home'`);

  await send('Page.reload', { ignoreCache: false });
  await waitFor(`location.pathname === '/home' && document.body.innerText.includes('Flip Card Game')`);
  const restoredSelection = await evaluate(`localStorage.getItem('selected-language-id')`);

  await send('Network.emulateNetworkConditions', {
    offline: true,
    latency: 0,
    downloadThroughput: 0,
    uploadThroughput: 0
  });
  const failuresBeforeOfflineNavigation = failures.length;

  await evaluate(`document.querySelector('a[href="/games/flipcard"]').click()`);
  await waitFor(`location.pathname === '/games/flipcard' && !!document.querySelector('app-flipcard:not(.ion-page-hidden) .word')?.textContent.trim()`);
  const flip = await evaluate(`({
    word: document.querySelector('app-flipcard:not(.ion-page-hidden) .word').textContent.trim(),
    image: document.querySelector('app-flipcard:not(.ion-page-hidden) .tp-box img')?.src || null,
    speakEnabled: ![...document.querySelectorAll('app-flipcard:not(.ion-page-hidden) ion-button')].find(button => button.textContent.includes('Speak'))?.disabled
  })`);
  await screenshot('ind-18-flipcard-offline.png');

  await evaluate(`document.querySelector('a[routerlink="/"]')?.click()`);
  await waitFor(`location.pathname === '/home'`);
  await evaluate(`document.querySelector('a[href="/games/quiz"]').click()`);
  await waitFor(`location.pathname === '/games/quiz' && document.querySelectorAll('app-quiz:not(.ion-page-hidden) ion-radio').length >= 4`);
  await new Promise(resolve => setTimeout(resolve, 500));
  const quiz = await evaluate(`({
    question: document.querySelector('app-quiz:not(.ion-page-hidden) .questions p')?.textContent.trim(),
    options: [...document.querySelectorAll('app-quiz:not(.ion-page-hidden) ion-radio')].map(item => item.textContent.trim()),
    image: document.querySelector('app-quiz:not(.ion-page-hidden) .tp-box img')?.src || null,
    enabledAudioButtons: [...document.querySelectorAll('app-quiz:not(.ion-page-hidden) .question ion-button')].filter(button => !button.disabled).length
  })`);
  await screenshot('ind-18-quiz-offline.png');

  const offlineFailures = failures.slice(failuresBeforeOfflineNavigation).map(item => ({
    url: requests.get(item.requestId) || null,
    errorText: item.errorText,
    type: item.type,
    canceled: item.canceled ?? false
  }));
  await send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1
  });

  await send('Page.navigate', { url: 'http://127.0.0.1:4200/language-selection' });
  const bininjOption = `[...document.querySelectorAll('.language-select__option')].find(option => option.textContent.includes('Bininj Kunwok'))`;
  await waitFor(`${bininjOption}?.querySelector('ion-button')?.textContent.includes('Enter access code')`);
  await evaluate(`${bininjOption}.querySelector('ion-button').click()`);
  await waitFor(`location.pathname === '/access-code' && !!document.querySelector('app-access-code:not(.ion-page-hidden) h1')`);
  const restrictedAccess = await evaluate(`({
    pathname: location.pathname,
    moduleId: new URLSearchParams(location.search).get('moduleId'),
    heading: document.querySelector('app-access-code:not(.ion-page-hidden) h1')?.textContent.trim()
  })`);
  await screenshot('ind-20-restricted-access.png');
  socket.close();

  console.log(JSON.stringify({ stored, restoredSelection, flip, quiz, offlineFailures, restrictedAccess }, null, 2));
}

main().catch(error => {
  console.error(error.stack || error);
  process.exit(1);
});
