import { HttpClient } from '@angular/common/http';
import { firstValueFrom, of } from 'rxjs';
import { LanguageModuleService, LanguageWord } from './language-module.service';
import { SupabaseService } from './supabase.service';

describe('LanguageModuleService', () => {
  it('maps public and private access from Supabase without loading a private manifest', async () => {
    const http = jasmine.createSpyObj<HttpClient>('HttpClient', ['get']);
    http.get.and.returnValue(of({ id: 'public', name: 'Kuku Thaypan', version: '1.0.0', data: 'words.json', games: [] }));
    const supabase = jasmine.createSpyObj<SupabaseService>('SupabaseService', ['getLanguageModuleCatalog', 'getPublicModuleUrl', 'hasModuleAccessGrant']);
    supabase.getLanguageModuleCatalog.and.resolveTo([
      { id: 'public', name: 'Kuku Thaypan', access_type: 'public', content_bucket: 'public-language-modules', content_prefix: 'public', published_version: '1.0.0', published_at: null },
      { id: 'private', name: 'Bininj Kunwok', access_type: 'private', content_bucket: 'private-language-modules', content_prefix: 'private', published_version: null, published_at: null },
    ]);
    supabase.getPublicModuleUrl.and.callFake((_bucket: string, path: string) => `https://example.test/${path}`);
    supabase.hasModuleAccessGrant.and.returnValue(false);
    const service = new LanguageModuleService(http, supabase);

    const options = await firstValueFrom(service.loadLanguageOptions());

    expect(options.map(option => option.accessType)).toEqual(['public', 'restricted']);
    expect(options.map(option => option.name)).toEqual(['Kuku Thaypan', 'Bininj Kunwok']);
  });

  it('keeps the full inventory but exposes only explicitly playable entries', (done: DoneFn) => {
    const words = [makeWord('original', 'original', true), makeWord('dictionary', 'dictionary', false), makeWord('unknown', undefined, undefined)];
    const http = jasmine.createSpyObj<HttpClient>('HttpClient', ['get']);
    http.get.and.returnValues(
      of({ id: 'test', name: 'Test', version: '1.0.0', data: 'words.json', games: [] }),
      of(words)
    );
    const supabase = jasmine.createSpyObj<SupabaseService>('SupabaseService', ['getLanguageModuleCatalog', 'getPublicModuleUrl']);
    supabase.getLanguageModuleCatalog.and.resolveTo([
      { id: 'test', name: 'Test', access_type: 'public', content_bucket: 'public-language-modules', content_prefix: 'test', published_version: '1.0.0', published_at: null },
    ]);
    supabase.getPublicModuleUrl.and.callFake((_bucket: string, path: string) => `https://example.test/${path}`);
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
