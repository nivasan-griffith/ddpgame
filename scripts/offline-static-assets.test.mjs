import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readJson = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));

test('production build enables the static-asset service worker', async () => {
  const angular = await readJson('../angular.json');
  const production = angular.projects.app.architect.build.configurations.production;

  assert.equal(production.serviceWorker, true);
  assert.equal(production.ngswConfigPath, 'ngsw-config.json');
});

test('shared UI assets are prefetched without replacing language-module storage', async () => {
  const config = await readJson('../ngsw-config.json');
  const sharedAssets = config.assetGroups.find(group => group.name === 'shared-ui-assets');

  assert.ok(sharedAssets);
  assert.equal(sharedAssets.installMode, 'prefetch');
  assert.ok(sharedAssets.resources.files.includes('/assets/**'));
  assert.ok(!sharedAssets.resources.files.some(path => path.includes('/languages/')));
});
