import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { LanguageModuleService, LanguageWord, LoadedLanguageModule } from './language-module.service';

describe('LanguageModuleService', () => {
  it('maps public/private access metadata and fails closed for missing or unknown values', () => {
    const http = jasmine.createSpyObj<HttpClient>('HttpClient', ['get']);
    http.get.and.returnValues(
      of({ modules: [
        { id: 'public', manifest: 'public/manifest.json' },
        { id: 'private', manifest: 'private/manifest.json' },
        { id: 'restricted', manifest: 'restricted/manifest.json' },
        { id: 'missing', manifest: 'missing/manifest.json' },
        { id: 'unknown', manifest: 'unknown/manifest.json' }
      ] }),
      of({ id: 'public', name: 'Public', version: '1.0.0', data: 'words.json', games: [], accessType: 'public' }),
      of({ id: 'private', name: 'Private', version: '1.0.0', data: 'words.json', games: [], accessType: 'private' }),
      of({ id: 'restricted', name: 'Restricted', version: '1.0.0', data: 'words.json', games: [], accessType: 'restricted' }),
      of({ id: 'missing', name: 'Missing', version: '1.0.0', data: 'words.json', games: [] }),
      of({ id: 'unknown', name: 'Unknown', version: '1.0.0', data: 'words.json', games: [], accessType: 'unexpected' })
    );
    const service = new LanguageModuleService(http);

    service.loadLanguageOptions().subscribe(options => {
      expect(options.map(option => option.accessType)).toEqual([
        'public',
        'restricted',
        'restricted',
        'restricted',
        'restricted'
      ]);
    });
  });

  it('keeps the full inventory but exposes only explicitly playable entries', () => {
    const words = [makeWord('original', 'original', true), makeWord('dictionary', 'dictionary', false), makeWord('unknown', undefined, undefined)];
    const http = jasmine.createSpyObj<HttpClient>('HttpClient', ['get']);
    http.get.and.returnValues(
      of({ modules: [{ id: 'test', manifest: 'test/manifest.json' }] }),
      of({ id: 'test', name: 'Test', version: '1.0.0', data: 'words.json', games: [] }),
      of(words)
    );
    const service = new LanguageModuleService(http);
    let loadedModule: LoadedLanguageModule | undefined;
    service.loadSelectedModule().subscribe(module => loadedModule = module);

    expect(loadedModule!.words.length).toBe(3);
    expect(loadedModule!.playableWords.map(word => word.id)).toEqual(['original']);
  });
});

function makeWord(id: string, entrySource: LanguageWord['entrySource'], playable: boolean | undefined): LanguageWord {
  return { id, word: id, english: id, entrySource, playable, image: null, audio: { language: null, english: null } };
}
