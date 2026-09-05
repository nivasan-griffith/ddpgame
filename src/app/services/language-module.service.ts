import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, firstValueFrom, forkJoin, from, map, of, switchMap } from 'rxjs';
import { LanguageModuleCatalogEntry, SupabaseService } from './supabase.service';

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
  theme?: LanguageTheme;
}

export interface LanguageTheme {
  tokens: LanguageThemeTokens;
  assets?: LanguageThemeAssets;
}

export interface LanguageThemeAssets {
  hero: string;
  topLeftTrim: string;
  bottomRightTrim: string;
  navigationIcon: string;
  bulletIcon: string;
  successIcon: string;
  retryIcon: string;
}

export interface LanguageThemeTokens {
  primaryBackground: string;
  buttonBackground: string;
  buttonText: string;
  primaryText: string;
  linkHover: string;
  accent: string;
  surface: string;
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
  /** Latest version visible while the device has a connection. */
  version: string;
  installed: boolean;
  /** Version currently saved on this device for offline use. */
  installedVersion?: string;
  /** A newer remote module can be downloaded without removing the installed one. */
  updateAvailable: boolean;
  /** Whether the app successfully read the latest manifest during this visit. */
  latestVersionKnown: boolean;
  accessType: LanguageAccessType;
}

interface RemoteModuleEntry {
  id: string;
  name: string;
  accessType: 'public' | 'private';
  bucket: string;
  prefix: string;
  manifestPath: string;
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
      const options = remote.map(option => {
        const stored = installedById.get(option.id);
        return {
          ...option,
          installed: stored !== undefined,
          installedVersion: stored?.manifest.version,
          // An empty remote version means the device is offline or a private
          // module grant is unavailable. Keep the installed copy usable and
          // do not claim that an update is available in that situation.
          updateAvailable: stored !== undefined && option.version !== '' && option.version !== stored.manifest.version,
        };
      });

      for (const stored of installed) {
        if (!options.some(option => option.id === stored.id)) {
          options.push({
            id: stored.id,
            name: stored.manifest.name,
            version: stored.manifest.version,
            installed: true,
            installedVersion: stored.manifest.version,
            updateAvailable: false,
            latestVersionKnown: false,
            accessType: this.normalizeAccessType(stored.manifest.accessType)
          });
        }
      }

      // Keep the order supplied by languages/index.json (Kuku Thaypan, then Bininj Kunwok).
      // Installed modules are only appended when an index entry is unavailable offline.
      return options;
    }));
  }

  async installLanguage(languageId: string): Promise<void> {
    const entry = await this.getRemoteModuleEntry(languageId);
    if (entry.accessType === 'private') {
      await this.installPrivateLanguage(entry);
      return;
    }

    const manifestUrl = this.supabase.getPublicModuleUrl(entry.bucket, entry.manifestPath);
    const manifest = await firstValueFrom(
      this.http.get<LanguageManifest>(manifestUrl)
    );
    const existing = await this.readInstalledModule(languageId);
    if (existing?.manifest.version === manifest.version) {
      return;
    }

    const words = await firstValueFrom(
      this.http.get<LanguageWord[]>(this.publicModuleFileUrl(entry, manifest.data))
    );
    const assetPaths = this.collectAssetPaths(words);
    const assets = await this.downloadPublicAssets(entry, assetPaths);

    await this.writeInstalledModule({
      id: languageId,
      manifestPath: entry.manifestPath,
      manifest,
      words,
      assets,
      installedAt: new Date().toISOString()
    });
  }

  private async installPrivateLanguage(entry: RemoteModuleEntry): Promise<void> {
    if (!this.supabase.hasModuleAccessGrant(entry.id)) {
      throw new Error('Private module access has not been granted.');
    }

    const manifestUrls = await this.supabase.getPrivateModuleUrls(entry.id, [entry.manifestPath]);
    const manifest = await this.fetchPrivateJson<LanguageManifest>(manifestUrls[entry.manifestPath]);
    const existing = await this.readInstalledModule(entry.id);
    if (existing?.manifest.version === manifest.version) {
      return;
    }

    const dataPath = `${entry.prefix}/${manifest.data}`;
    const dataUrls = await this.supabase.getPrivateModuleUrls(entry.id, [dataPath]);
    const words = await this.fetchPrivateJson<LanguageWord[]>(dataUrls[dataPath]);
    const assetPaths = this.collectAssetPaths(words);
    const assets = assetPaths.length === 0
      ? {}
      : await this.downloadPrivateAssets(entry.id, entry.prefix, assetPaths);

    await this.writeInstalledModule({
      id: entry.id,
      manifestPath: entry.manifestPath,
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
    return from(this.getRemoteModuleEntries()).pipe(
      switchMap(entries => forkJoin(entries.map(entry => {
        if (entry.accessType === 'private') {
              const privateOption = {
                id: entry.id,
                name: entry.name,
                version: '',
                installed: false,
                updateAvailable: false,
                latestVersionKnown: false,
                accessType: 'restricted' as LanguageAccessType,
              };

              // A private manifest can only be checked if this browser still
              // has a valid grant. Without it, the saved offline copy remains
              // available but its latest version is intentionally unknown.
              if (!this.supabase.hasModuleAccessGrant(entry.id)) {
                return of(privateOption);
              }

              return from(this.fetchPrivateManifest(entry.id, entry.manifestPath)).pipe(
                map(manifest => ({
                  ...privateOption,
                  name: entry.name || manifest.name,
                  version: manifest.version,
                  latestVersionKnown: true,
                })),
                catchError(() => of(privateOption))
              );
        }

        return this.http.get<LanguageManifest>(this.supabase.getPublicModuleUrl(entry.bucket, entry.manifestPath)).pipe(
              map(manifest => ({
                id: entry.id,
                name: entry.name || manifest.name,
                version: manifest.version,
                installed: false,
                updateAvailable: false,
                latestVersionKnown: true,
                accessType: 'public' as LanguageAccessType,
              }))
            );
      })))
    );
  }

  private loadRemoteModule(languageId: string | null): Observable<LoadedLanguageModule> {
    return from(this.getRemoteModuleEntries()).pipe(
      switchMap(entries => {
        const selected = entries.find(module => module.id === languageId) ?? entries[0];
        if (!selected) {
          throw new Error('No language modules are available.');
        }

        return selected.accessType === 'private'
          ? this.loadPrivateRemoteModule(selected)
          : this.loadPublicRemoteModule(selected);
      })
    );
  }

  private loadPublicRemoteModule(selected: RemoteModuleEntry): Observable<LoadedLanguageModule> {
    return this.http.get<LanguageManifest>(this.supabase.getPublicModuleUrl(selected.bucket, selected.manifestPath)).pipe(
      switchMap(manifest => this.http.get<LanguageWord[]>(this.publicModuleFileUrl(selected, manifest.data)).pipe(
        map(words => this.buildLoadedModule(manifest, words.map(word => this.resolveRemoteWord(this.publicModuleBaseUrl(selected), word))))
      ))
    );
  }

  private loadPrivateRemoteModule(selected: RemoteModuleEntry): Observable<LoadedLanguageModule> {
    return from(this.supabase.getPrivateModuleUrls(selected.id, [selected.manifestPath])).pipe(
      switchMap(urls => from(this.fetchPrivateJson<LanguageManifest>(urls[selected.manifestPath]))),
      switchMap(manifest => {
        const dataPath = `${selected.prefix}/${manifest.data}`;
        return from(this.supabase.getPrivateModuleUrls(selected.id, [dataPath])).pipe(
          switchMap(urls => from(this.fetchPrivateJson<LanguageWord[]>(urls[dataPath]))),
          switchMap(words => {
            const assetPaths = this.collectAssetPaths(words).map(path => `${selected.prefix}/${path}`);
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
                imageUrl: word.image ? assetUrls[`${selected.prefix}/${word.image}`] ?? null : null,
                languageAudioUrl: word.audio?.language ? assetUrls[`${selected.prefix}/${word.audio.language}`] ?? null : null,
                englishAudioUrl: word.audio?.english ? assetUrls[`${selected.prefix}/${word.audio.english}`] ?? null : null,
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

  private async fetchPrivateManifest(languageId: string, manifestPath: string): Promise<LanguageManifest> {
    const urls = await this.supabase.getPrivateModuleUrls(languageId, [manifestPath]);
    return this.fetchPrivateJson<LanguageManifest>(urls[manifestPath]);
  }

  private async getRemoteModuleEntries(): Promise<RemoteModuleEntry[]> {
    const catalogue = await this.supabase.getLanguageModuleCatalog();
    return catalogue.map(entry => this.toRemoteModuleEntry(entry));
  }

  private async getRemoteModuleEntry(languageId: string): Promise<RemoteModuleEntry> {
    const entries = await this.getRemoteModuleEntries();
    const entry = entries.find(module => module.id === languageId);
    if (!entry) {
      throw new Error(`Language module "${languageId}" is not available.`);
    }
    return entry;
  }

  private toRemoteModuleEntry(entry: LanguageModuleCatalogEntry): RemoteModuleEntry {
    if (!entry.content_bucket || !entry.content_prefix) {
      throw new Error(`Language module "${entry.id}" has no published storage location.`);
    }
    return {
      id: entry.id,
      name: entry.name,
      accessType: entry.access_type,
      bucket: entry.content_bucket,
      prefix: entry.content_prefix,
      manifestPath: `${entry.content_prefix}/manifest.json`,
    };
  }

  private publicModuleBaseUrl(entry: RemoteModuleEntry): string {
    return this.supabase.getPublicModuleUrl(entry.bucket, entry.prefix);
  }

  private publicModuleFileUrl(entry: RemoteModuleEntry, relativePath: string): string {
    return this.supabase.getPublicModuleUrl(entry.bucket, `${entry.prefix}/${relativePath}`);
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

  private async downloadPublicAssets(entry: RemoteModuleEntry, paths: string[]): Promise<Record<string, Blob>> {
    const assets: Record<string, Blob> = {};
    let nextIndex = 0;
    const worker = async (): Promise<void> => {
      while (nextIndex < paths.length) {
        const path = paths[nextIndex++];
        try {
          assets[path] = await firstValueFrom(
            this.http.get(this.publicModuleFileUrl(entry, path), { responseType: 'blob' })
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
