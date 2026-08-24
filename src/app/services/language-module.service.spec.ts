import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { LanguageModuleService, LanguageWord } from './language-module.service';
import { SupabaseService } from './supabase.service';

describe('LanguageModuleService', () => {
  it('maps public and private module access from Supabase without loading a private manifest', (done: DoneFn) => {
    const http = jasmine.createSpyObj<HttpClient>('HttpClient', ['get']);
    http.get.and.returnValue(of({ modules: [
      { id: 'public', manifest: 'public/manifest.json', name: 'Public' },
      { id: 'private', manifest: 'private/manifest.json', name: 'Private' },
    ] }));
    const supabase = jasmine.createSpyObj<SupabaseService>('SupabaseService', ['getModuleAccessType']);
    supabase.getModuleAccessType.and.callFake((id: string) => Promise.resolve(id === 'public' ? 'public' : 'private'));
    const service = new LanguageModuleService(http, supabase);

    service.loadLanguageOptions().subscribe(options => {
      expect(options).toEqual([
        { id: 'public', name: 'Public', accessType: 'public' },
        { id: 'private', name: 'Private', accessType: 'restricted' },
      ]);
      done();
    });
  });

  it('keeps the full inventory but exposes only explicitly playable entries', (done: DoneFn) => {
    const words = [makeWord('original', 'original', true), makeWord('dictionary', 'dictionary', false), makeWord('unknown', undefined, undefined)];
    const http = jasmine.createSpyObj<HttpClient>('HttpClient', ['get']);
    http.get.and.returnValues(
      of({ modules: [{ id: 'test', manifest: 'test/manifest.json' }] }),
      of({ id: 'test', name: 'Test', version: '1.0.0', data: 'words.json', games: [] }),
      of(words)
    );
    const supabase = jasmine.createSpyObj<SupabaseService>('SupabaseService', ['getModuleAccessType']);
    supabase.getModuleAccessType.and.returnValue(Promise.resolve('public'));
    const service = new LanguageModuleService(http, supabase);

    service.loadSelectedModule().subscribe(module => {
      expect(module.words.length).toBe(3);
      expect(module.playableWords.map(word => word.id)).toEqual(['original']);
      done();
    });
  });
});

function makeWord(id: string, entrySource: LanguageWord['entrySource'], playable: boolean | undefined): LanguageWord {
  return { id, word: id, english: id, entrySource, playable, image: null, audio: { language: null, english: null } };
}
