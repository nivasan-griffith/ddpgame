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

  it('deletes a downloaded module and clears it when it is the active selection', async () => {
    const http = jasmine.createSpyObj<HttpClient>('HttpClient', ['get']);
    const supabase = jasmine.createSpyObj<SupabaseService>('SupabaseService', ['getModuleAccessType']);
    const service = new LanguageModuleService(http, supabase);
    const databaseName = `ddpgame-language-modules-test-${Date.now()}`;
    Reflect.set(service, 'databaseName', databaseName);
    const storageService = service as unknown as {
      writeInstalledModule(module: unknown): Promise<void>;
      readInstalledModule(id: string): Promise<unknown>;
      databasePromise: Promise<IDBDatabase> | null;
    };
    const revokeObjectUrl = spyOn(URL, 'revokeObjectURL');
    Reflect.get(service, 'objectUrls').set('remove-me@1.0.0/image.png', 'blob:test');
    localStorage.setItem('selected-language-id', 'remove-me');
    service.setSelectedLanguage('remove-me');

    await storageService.writeInstalledModule({
      id: 'remove-me',
      manifestPath: 'remove-me/manifest.json',
      manifest: { id: 'remove-me', name: 'Remove me', version: '1.0.0', data: 'words.json', games: [] },
      words: [],
      assets: {},
      installedAt: new Date().toISOString(),
    });

    const removedSelectedLanguage = await service.removeLanguage('remove-me');

    expect(removedSelectedLanguage).toBeTrue();
    expect(await storageService.readInstalledModule('remove-me')).toBeNull();
    expect(localStorage.getItem('selected-language-id')).toBeNull();
    expect(service.hasSelectedLanguage()).toBeFalse();
    expect(revokeObjectUrl).toHaveBeenCalledOnceWith('blob:test');

    const database = await storageService.databasePromise;
    database?.close();
    indexedDB.deleteDatabase(databaseName);
  });
});

function makeWord(id: string, entrySource: LanguageWord['entrySource'], playable: boolean | undefined): LanguageWord {
  return { id, word: id, english: id, entrySource, playable, image: null, audio: { language: null, english: null } };
}
