import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { LanguageModuleService, LanguageWord, LoadedLanguageModule } from './language-module.service';

describe('LanguageModuleService', () => {
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
