import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Buffer } from 'node:buffer';
import ts from 'typescript';

const sourceUrl = new URL('../../supabase/functions/_shared/language-content.ts', import.meta.url);
const source = fs.readFileSync(sourceUrl, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
}).outputText;
const helpers = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

const sample = {
  id: 'hello-world',
  word: 'Yura',
  english: 'Hello',
  category: 'Greetings',
  image: 'images/yura.webp',
  audio: { language: 'audio/yura.mp3', english: null },
  availableInCurrentVersion: true,
  playable: true,
  note: 'Preserve community-supplied metadata.',
};

const validated = helpers.validateWord(sample);
assert.equal(validated.note, sample.note);
assert.equal(validated.audio.language, 'audio/yura.mp3');
assert.equal(helpers.nextPatchVersion('1.4.9'), '1.4.10');
assert.equal(helpers.nextPatchVersion('2.0.0-beta.1'), '2.0.1');

const manifest = helpers.defaultManifest('test-language', 'Test Language');
assert.deepEqual(
  helpers.parseManifestJson(JSON.stringify(manifest)),
  manifest,
);
assert.deepEqual(helpers.parseWordsJson(JSON.stringify([sample])), [validated]);

assert.throws(
  () => helpers.parseWordsJson(JSON.stringify([sample, sample])),
  /duplicate word ID/,
);
assert.throws(
  () => helpers.validateWord({ ...sample, image: '../outside.webp' }),
  /safe path/,
);
assert.throws(
  () => helpers.validateWord({ ...sample, id: 'Not Safe' }),
  /lowercase letters/,
);
assert.throws(
  () => helpers.nextPatchVersion('version-one'),
  /semantic versioning/,
);

const languagesUrl = new URL('../../languages/', import.meta.url);
for (const entry of fs.readdirSync(languagesUrl, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const languageUrl = new URL(`${entry.name}/`, languagesUrl);
  const checkedInManifest = helpers.parseManifestJson(
    fs.readFileSync(new URL('manifest.json', languageUrl), 'utf8'),
  );
  const checkedInWords = helpers.parseWordsJson(
    fs.readFileSync(new URL(checkedInManifest.data, languageUrl), 'utf8'),
  );
  assert.equal(checkedInManifest.id, entry.name);
  assert.ok(checkedInWords.length > 0, `${entry.name} should contain words`);
}

console.log('Language content contract tests passed.');
