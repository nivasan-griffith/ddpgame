import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, firstValueFrom, forkJoin, from, map, of, switchMap } from 'rxjs';
import { SupabaseService } from './supabase.service';

export type LanguageEntrySource = 'original' | 'dictionary';
export type LanguageAccessType = 'public' | 'restricted';

export interface LanguageModuleIndex {
  modules: LanguageModuleIndexEntry[];
}

export interface LanguageModuleIndexEntry {
  id: string;
  manifest: string;
  /** Public display metadata; lets private manifests remain out of the app bundle. */
  name?: string;
}

export interface LanguageManifest {
  id: string;
  name: string;
  location?: string;
  version: string;
  data: string;
  games: string[];
  accessType?: string;
}

export interface LanguageWord {
  id: string;
  word: string;
  english: string;
  category?: string;
  entrySource?: LanguageEntrySource;
  availableInCurrentVersion?: boolean;
  playable?: boolean;
  image: string | null;
  audio: {
    language: string | null;
    english: string | null;
  };
}

export interface ResolvedLanguageWord extends LanguageWord {
  imageUrl: string | null;
  languageAudioUrl: string | null;
  englishAudioUrl: string | null;
}

export interface LoadedLanguageModule {
  manifest: LanguageManifest;
  words: ResolvedLanguageWord[];
  playableWords: ResolvedLanguageWord[];
}

export interface LanguageOption {
  id: string;
  name: string;
  version: string;
  installed: boolean;
  accessType: LanguageAccessType;
}

interface StoredLanguageModule {
  id: string;
  manifestPath: string;
  manifest: LanguageManifest;
  words: LanguageWord[];
  assets: Record<string, Blob>;
  installedAt: string;
}

@Injectable({ providedIn: 'root' })
export class LanguageModuleService {
  private readonly selectionStorageKey = 'selected-language-id';
  private readonly databaseName = 'ddpgame-language-modules';
  private readonly databaseVersion = 1;
  private readonly moduleStoreName = 'modules';
  private readonly objectUrls = new Map<string, string>();
  private selectedLanguageId = this.readSavedLanguage();
  private databasePromise: Promise<IDBDatabase> | null = null;

  constructor(
    private http: HttpClient,
    private supabase: SupabaseService,
  ) {}

  setSelectedLanguage(languageId: string): void {
    this.selectedLanguageId = languageId;
    this.saveLanguage(languageId);
  }

  hasSelectedLanguage(): boolean {
    return this.selectedLanguageId !== null;
  }

  loadLanguageOptions(): Observable<LanguageOption[]> {
    return forkJoin({
      remote: this.loadRemoteLanguageOptions().pipe(catchError(() => of([]))),
      installed: from(this.readInstalledModules()).pipe(catchError(() => of([])))
    }).pipe(map(({ remote, installed }) => {
      const installedById = new Map(installed.map(module => [module.id, module]));
      const options = remote.map(option => ({
        ...option,
        installed: installedById.has(option.id)
      }));

      for (const stored of installed) {
        if (!options.some(option => option.id === stored.id)) {
          options.push({
            id: stored.id,
            name: stored.manifest.name,
            version: stored.manifest.version,
            installed: true,
            accessType: this.normalizeAccessType(stored.manifest.accessType)
          });
        }
      }

      return options;
    }));
  }

  async installLanguage(languageId: string): Promise<void> {
    const accessType = await this.supabase.getModuleAccessType(languageId);
    if (accessType === 'private') {
      await this.installPrivateLanguage(languageId);
      return;
    }

    const index = await firstValueFrom(this.http.get<LanguageModuleIndex>('languages/index.json'));
    const entry = index.modules.find(module => module.id === languageId);
    if (!entry) {
      throw new Error(`Language module "${languageId}" is not available.`);
    }

    const basePath = this.moduleBasePath(entry.manifest);
    const manifest = await firstValueFrom(
      this.http.get<LanguageManifest>(`languages/${entry.manifest}`)
    );
    const existing = await this.readInstalledModule(languageId);
    if (existing?.manifest.version === manifest.version) {
      return;
    }

    const words = await firstValueFrom(
      this.http.get<LanguageWord[]>(`${basePath}/${manifest.data}`)
    );
    const assetPaths = this.collectAssetPaths(words);
    const assets = await this.downloadAssets(basePath, assetPaths);

    await this.writeInstalledModule({
      id: languageId,
      manifestPath: entry.manifest,
      manifest,
      words,
      assets,
      installedAt: new Date().toISOString()
    });
  }

  private async installPrivateLanguage(languageId: string): Promise<void> {
    if (!this.supabase.hasModuleAccessGrant(languageId)) {
      throw new Error('Private module access has not been granted.');
    }

    const index = await firstValueFrom(this.http.get<LanguageModuleIndex>('languages/index.json'));
    const entry = index.modules.find(module => module.id === languageId);
    if (!entry) {
      throw new Error(`Language module "${languageId}" is not available.`);
    }

    const basePath = this.privateModuleBasePath(entry.manifest);
    const manifestUrls = await this.supabase.getPrivateModuleUrls(languageId, [entry.manifest]);
    const manifest = await this.fetchPrivateJson<LanguageManifest>(manifestUrls[entry.manifest]);
    const existing = await this.readInstalledModule(languageId);
    if (existing?.manifest.version === manifest.version) {
      return;
    }

    const dataPath = `${basePath}/${manifest.data}`;
    const dataUrls = await this.supabase.getPrivateModuleUrls(languageId, [dataPath]);
    const words = await this.fetchPrivateJson<LanguageWord[]>(dataUrls[dataPath]);
    const assetPaths = this.collectAssetPaths(words);
    const assets = assetPaths.length === 0
      ? {}
      : await this.downloadPrivateAssets(languageId, basePath, assetPaths);

    await this.writeInstalledModule({
      id: languageId,
      manifestPath: entry.manifest,
      manifest,
      words,
      assets,
      installedAt: new Date().toISOString(),
    });
  }

  loadSelectedModule(): Observable<LoadedLanguageModule> {
    const selectedId = this.selectedLanguageId;
    if (selectedId) {
      return from(this.readInstalledModule(selectedId)).pipe(
        switchMap(stored => stored
          ? of(this.resolveStoredModule(stored))
          : this.loadRemoteModule(selectedId))
      );
    }

    return this.loadRemoteModule(null);
  }

  private loadRemoteLanguageOptions(): Observable<LanguageOption[]> {
    return this.http.get<LanguageModuleIndex>('languages/index.json').pipe(
      switchMap(index => forkJoin(index.modules.map(module => {
        return from(this.supabase.getModuleAccessType(module.id)).pipe(
          switchMap(accessType => {
            if (accessType === 'private') {
              return of({
                id: module.id,
                name: module.name ?? module.id,
                version: '',
                installed: false,
                accessType: 'restricted' as LanguageAccessType,
              });
            }

            return this.http.get<LanguageManifest>(`languages/${module.manifest}`).pipe(
              map(manifest => ({
                id: module.id,
                name: module.name ?? manifest.name,
                version: manifest.version,
                installed: false,
                accessType: 'public' as LanguageAccessType,
              }))
            );
          })
        );
      })))
    );
  }

  private loadRemoteModule(languageId: string | null): Observable<LoadedLanguageModule> {
    return this.http.get<LanguageModuleIndex>('languages/index.json').pipe(
      switchMap(index => {
        const selected = index.modules.find(module => module.id === languageId) ?? index.modules[0];
        if (!selected) {
          throw new Error('No language modules are available.');
        }

        return from(this.supabase.getModuleAccessType(selected.id)).pipe(
          switchMap(accessType => accessType === 'private'
            ? this.loadPrivateRemoteModule(selected)
            : this.loadPublicRemoteModule(selected))
        );
      })
    );
  }

  private loadPublicRemoteModule(selected: LanguageModuleIndexEntry): Observable<LoadedLanguageModule> {
    const basePath = this.moduleBasePath(selected.manifest);
    return this.http.get<LanguageManifest>(`languages/${selected.manifest}`).pipe(
      switchMap(manifest => this.http.get<LanguageWord[]>(`${basePath}/${manifest.data}`).pipe(
        map(words => this.buildLoadedModule(manifest, words.map(word => this.resolveRemoteWord(basePath, word))))
      ))
    );
  }

  private loadPrivateRemoteModule(selected: LanguageModuleIndexEntry): Observable<LoadedLanguageModule> {
    const basePath = this.privateModuleBasePath(selected.manifest);
    return from(this.supabase.getPrivateModuleUrls(selected.id, [selected.manifest])).pipe(
      switchMap(urls => from(this.fetchPrivateJson<LanguageManifest>(urls[selected.manifest]))),
      switchMap(manifest => {
        const dataPath = `${basePath}/${manifest.data}`;
        return from(this.supabase.getPrivateModuleUrls(selected.id, [dataPath])).pipe(
          switchMap(urls => from(this.fetchPrivateJson<LanguageWord[]>(urls[dataPath]))),
          switchMap(words => {
            const assetPaths = this.collectAssetPaths(words).map(path => `${basePath}/${path}`);
            if (assetPaths.length === 0) {
              return of(this.buildLoadedModule(manifest, words.map(word => ({
                ...word,
                imageUrl: null,
                languageAudioUrl: null,
                englishAudioUrl: null,
              }))));
            }
            return from(this.supabase.getPrivateModuleUrls(selected.id, assetPaths)).pipe(
              map(assetUrls => this.buildLoadedModule(manifest, words.map(word => ({
                ...word,
                imageUrl: word.image ? assetUrls[`${basePath}/${word.image}`] ?? null : null,
                languageAudioUrl: word.audio?.language ? assetUrls[`${basePath}/${word.audio.language}`] ?? null : null,
                englishAudioUrl: word.audio?.english ? assetUrls[`${basePath}/${word.audio.english}`] ?? null : null,
              }))))
            );
          })
        );
      })
    );
  }

  private async fetchPrivateJson<T>(url: string | undefined): Promise<T> {
    if (!url) throw new Error('A private module file could not be located.');
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Private module file request failed (${response.status}).`);
    return response.json() as Promise<T>;
  }

  private async downloadPrivateAssets(
    languageId: string,
    basePath: string,
    relativePaths: string[],
  ): Promise<Record<string, Blob>> {
    const storagePaths = relativePaths.map(path => `${basePath}/${path}`);
    const urls = await this.supabase.getPrivateModuleUrls(languageId, storagePaths);
    const assets: Record<string, Blob> = {};
    let nextIndex = 0;
    const worker = async (): Promise<void> => {
      while (nextIndex < relativePaths.length) {
        const path = relativePaths[nextIndex++];
        const url = urls[`${basePath}/${path}`];
        if (!url) continue;
        try {
          const response = await fetch(url);
          if (response.ok) assets[path] = await response.blob();
        } catch {
          // Keep the downloaded module usable if an optional media file is unavailable.
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(6, relativePaths.length) }, () => worker()));
    return assets;
  }

  private privateModuleBasePath(manifestPath: string): string {
    const separatorIndex = manifestPath.lastIndexOf('/');
    return separatorIndex === -1 ? '' : manifestPath.slice(0, separatorIndex);
  }

  private resolveStoredModule(stored: StoredLanguageModule): LoadedLanguageModule {
    return this.buildLoadedModule(
      stored.manifest,
      stored.words.map(word => ({
        ...word,
        imageUrl: this.resolveStoredAsset(stored, word.image),
        languageAudioUrl: this.resolveStoredAsset(stored, word.audio?.language),
        englishAudioUrl: this.resolveStoredAsset(stored, word.audio?.english)
      }))
    );
  }

  private buildLoadedModule(
    manifest: LanguageManifest,
    words: ResolvedLanguageWord[]
  ): LoadedLanguageModule {
    return {
      manifest,
      words,
      playableWords: words.filter(word => word.playable === true)
    };
  }

  private resolveRemoteWord(basePath: string, word: LanguageWord): ResolvedLanguageWord {
    return {
      ...word,
      imageUrl: this.resolveRemoteAsset(basePath, word.image),
      languageAudioUrl: this.resolveRemoteAsset(basePath, word.audio?.language),
      englishAudioUrl: this.resolveRemoteAsset(basePath, word.audio?.english)
    };
  }

  private resolveRemoteAsset(basePath: string, assetPath: string | null | undefined): string | null {
    return assetPath ? `${basePath}/${assetPath}` : null;
  }

  private resolveStoredAsset(
    stored: StoredLanguageModule,
    assetPath: string | null | undefined
  ): string | null {
    if (!assetPath || !stored.assets[assetPath]) {
      return null;
    }

    const key = `${stored.id}@${stored.manifest.version}/${assetPath}`;
    const existingUrl = this.objectUrls.get(key);
    if (existingUrl) {
      return existingUrl;
    }

    const url = URL.createObjectURL(stored.assets[assetPath]);
    this.objectUrls.set(key, url);
    return url;
  }

  private collectAssetPaths(words: LanguageWord[]): string[] {
    const paths = new Set<string>();
    for (const word of words) {
      if (word.image) paths.add(word.image);
      if (word.audio?.language) paths.add(word.audio.language);
      if (word.audio?.english) paths.add(word.audio.english);
    }
    return [...paths];
  }

  private async downloadAssets(basePath: string, paths: string[]): Promise<Record<string, Blob>> {
    const assets: Record<string, Blob> = {};
    let nextIndex = 0;
    const worker = async (): Promise<void> => {
      while (nextIndex < paths.length) {
        const path = paths[nextIndex++];
        try {
          assets[path] = await firstValueFrom(
            this.http.get(`${basePath}/${path}`, { responseType: 'blob' })
          );
        } catch {
          // Some source manifests intentionally reference unavailable media.
          // Keep the module usable and expose that asset as unavailable offline.
        }
      }
    };

    await Promise.all(Array.from({ length: Math.min(6, paths.length) }, () => worker()));
    return assets;
  }

  private moduleBasePath(manifestPath: string): string {
    const separatorIndex = manifestPath.lastIndexOf('/');
    return separatorIndex === -1 ? 'languages' : `languages/${manifestPath.slice(0, separatorIndex)}`;
  }

  private openDatabase(): Promise<IDBDatabase> {
    if (this.databasePromise) {
      return this.databasePromise;
    }
    if (typeof indexedDB === 'undefined') {
      return Promise.reject(new Error('Persistent language-module storage is unavailable.'));
    }

    this.databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.databaseName, this.databaseVersion);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(this.moduleStoreName)) {
          request.result.createObjectStore(this.moduleStoreName, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Could not open local module storage.'));
    });
    return this.databasePromise;
  }

  private async readInstalledModule(id: string): Promise<StoredLanguageModule | null> {
    const database = await this.openDatabase();
    return new Promise((resolve, reject) => {
      const request = database
        .transaction(this.moduleStoreName, 'readonly')
        .objectStore(this.moduleStoreName)
        .get(id);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  }

  private async readInstalledModules(): Promise<StoredLanguageModule[]> {
    const database = await this.openDatabase();
    return new Promise((resolve, reject) => {
      const request = database
        .transaction(this.moduleStoreName, 'readonly')
        .objectStore(this.moduleStoreName)
        .getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async writeInstalledModule(module: StoredLanguageModule): Promise<void> {
    const database = await this.openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(this.moduleStoreName, 'readwrite');
      transaction.objectStore(this.moduleStoreName).put(module);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error ?? new Error('Module installation was aborted.'));
    });
  }

  private normalizeAccessType(accessType: unknown): LanguageAccessType {
    return accessType === 'public' ? 'public' : 'restricted';
  }

  private readSavedLanguage(): string | null {
    try {
      return localStorage.getItem(this.selectionStorageKey);
    } catch {
      return null;
    }
  }

  private saveLanguage(languageId: string): void {
    try {
      localStorage.setItem(this.selectionStorageKey, languageId);
    } catch {
      // Continue using the in-memory selection if localStorage is unavailable.
    }
  }

}
