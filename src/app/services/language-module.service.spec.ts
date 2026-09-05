import { HttpClient } from '@angular/common/http';
import { firstValueFrom, of } from 'rxjs';
import { LanguageModuleService, LanguageWord } from './language-module.service';
import { SupabaseService } from './supabase.service';

describe('LanguageModuleService', () => {
  it('reports meaningful asset progress while installing a public module', async () => {
    const words = [
      { ...makeWord('one', undefined, true), image: 'one.png' },
      { ...makeWord('two', undefined, true), audio: { language: 'two.mp3', english: null } },
    ];
    const http = jasmine.createSpyObj<HttpClient>('HttpClient', ['get']);
    http.get.and.returnValues(
      of({ modules: [{ id: 'test', manifest: 'test/manifest.json' }] }),
      of({ id: 'test', name: 'Test', version: '1.0.0', data: 'words.json', games: [] }),
      of(words),
      of(new Blob(['one'])),
      of(new Blob(['two'])),
    );
    const supabase = jasmine.createSpyObj<SupabaseService>('SupabaseService', ['getModuleAccessType']);
    supabase.getModuleAccessType.and.resolveTo('public');
    const service = new LanguageModuleService(http, supabase);
    spyOn<any>(service, 'readInstalledModule').and.resolveTo(null);
    spyOn<any>(service, 'writeInstalledModule').and.resolveTo();
    const updates: number[] = [];

    await service.installLanguage('test', progress => updates.push(progress.percent));

    expect(updates[0]).toBe(0);
    expect(updates[updates.length - 1]).toBe(100);
    expect(updates).toContain(50);
  });

  it('maps public and private access from Supabase without loading a private manifest', async () => {
    const http = jasmine.createSpyObj<HttpClient>('HttpClient', ['get']);
    http.get.and.returnValue(of({ modules: [
      { id: 'public', manifest: 'public/manifest.json', name: 'Kuku Thaypan' },
      { id: 'private', manifest: 'private/manifest.json', name: 'Bininj Kunwok' },
    ] }));
    const supabase = jasmine.createSpyObj<SupabaseService>('SupabaseService', ['getModuleAccessType']);
    supabase.getModuleAccessType.and.callFake((id: string) => Promise.resolve(id === 'public' ? 'public' : 'private'));
    const service = new LanguageModuleService(http, supabase);

    const options = await firstValueFrom(service.loadLanguageOptions());

    expect(options.map(option => option.accessType)).toEqual(['public', 'restricted']);
    expect(options.map(option => option.name)).toEqual(['Kuku Thaypan', 'Bininj Kunwok']);
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
