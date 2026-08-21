import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readWords = async path => JSON.parse(await readFile(new URL(path, import.meta.url)));

test('Bininj inventory preserves expected source and playable counts', async () => {
  const words = await readWords('../languages/bininj-kunwok/words.json');
  assert.equal(words.length, 993);
  assert.equal(words.filter(word => word.entrySource === 'original').length, 28);
  assert.equal(words.filter(word => word.entrySource === 'dictionary').length, 965);
  assert.equal(words.filter(word => word.playable === true).length, 28);
  for (const word of words) assert.equal(word.playable, word.entrySource === 'original', word.id);
});

test('all Kuku entries are playable while preserving current-version availability', async () => {
  const words = await readWords('../languages/kuku-thaypan/words.json');
  assert.equal(words.length, 63);
  assert.equal(words.filter(word => word.playable === true).length, 63);
  assert.equal(words.filter(word => 'entrySource' in word).length, 0);
  assert.equal(words.filter(word => word.availableInCurrentVersion === true).length, 25);
  for (const word of words) assert.equal(word.playable, true, word.id);
});
