import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, map, switchMap, forkJoin, of } from 'rxjs';
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
  accessType: LanguageAccessType;
}

@Injectable({ providedIn: 'root' })
export class LanguageModuleService {
  private readonly storageKey = 'selected-language-id'; //store language choice
  private selectedLanguageId = this.readSavedLanguage();

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
    return this.http.get<LanguageModuleIndex>('languages/index.json').pipe(
      switchMap(index => forkJoin(index.modules.map(module => {
        const option$ = module.name
          ? of({ id: module.id, name: module.name })
          : this.http.get<LanguageManifest>(`languages/${module.manifest}`).pipe(
            map(manifest => ({ id: module.id, name: manifest.name }))
          );

        return option$.pipe(
        switchMap(option => from(this.supabase.getModuleAccessType(option.id)).pipe(
          map(accessType => ({
            ...option,
            accessType: accessType === 'public' ? 'public' : 'restricted' as LanguageAccessType,
          }))
        ))
        );
      })))
    );
  }

  loadSelectedModule(): Observable<LoadedLanguageModule> {
    return this.http.get<LanguageModuleIndex>('languages/index.json').pipe(
      switchMap(index => {
        const selected = index.modules.find(module => module.id === this.selectedLanguageId) ?? index.modules[0];
        if (!selected) {
          throw new Error('No language modules are available.');
        }

        return from(this.supabase.getModuleAccessType(selected.id)).pipe(
          switchMap(accessType => accessType === 'private'
            ? this.loadPrivateModule(selected)
            : this.loadPublicModule(selected))
        );
      })
    );
  }

  private loadPublicModule(selected: LanguageModuleIndexEntry): Observable<LoadedLanguageModule> {
    const moduleBasePath = this.moduleBasePath(selected.manifest);
    return this.http.get<LanguageManifest>(`languages/${selected.manifest}`).pipe(
      switchMap(manifest => this.http.get<LanguageWord[]>(`languages/${moduleBasePath}/${manifest.data}`).pipe(
        map(words => this.toLoadedModule(manifest, words, assetPath => `languages/${assetPath}`))
      ))
    );
  }

  private loadPrivateModule(selected: LanguageModuleIndexEntry): Observable<LoadedLanguageModule> {
    const manifestPath = selected.manifest;
    const moduleBasePath = this.moduleBasePath(manifestPath);

    return from(this.supabase.getPrivateModuleUrls(selected.id, [manifestPath])).pipe(
      switchMap(urls => from(this.fetchJson<LanguageManifest>(urls[manifestPath]))),
      switchMap(manifest => {
        const dataPath = `${moduleBasePath}/${manifest.data}`;
        return from(this.supabase.getPrivateModuleUrls(selected.id, [dataPath])).pipe(
          switchMap(urls => from(this.fetchJson<LanguageWord[]>(urls[dataPath]))),
          switchMap(words => {
            const assetPaths = this.assetPaths(moduleBasePath, words);
            if (assetPaths.length === 0) {
              return from(Promise.resolve(this.toLoadedModule(manifest, words, () => null)));
            }

            return from(this.supabase.getPrivateModuleUrls(selected.id, assetPaths)).pipe(
              map(assetUrls => this.toLoadedModule(manifest, words, assetPath => assetUrls[assetPath] ?? null))
            );
          })
        );
      })
    );
  }

  private async fetchJson<T>(url: string | undefined): Promise<T> {
    if (!url) {
      throw new Error('A private module file could not be located.');
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Private module file request failed (${response.status}).`);
    }

    return response.json() as Promise<T>;
  }

  private assetPaths(moduleBasePath: string, words: LanguageWord[]): string[] {
    const paths: string[] = [];
    words.forEach(word => {
      [word.image, word.audio?.language, word.audio?.english].forEach(assetPath => {
        if (assetPath) {
          paths.push(`${moduleBasePath}/${assetPath}`);
        }
      });
    });

    return Array.from(new Set(paths));
  }

  private toLoadedModule(
    manifest: LanguageManifest,
    words: LanguageWord[],
    resolveAsset: (assetPath: string) => string | null,
  ): LoadedLanguageModule {
    const moduleBasePath = this.moduleBasePath(`${manifest.id}/manifest.json`);
    const resolvedWords = words.map(word => this.resolveWord(moduleBasePath, word, resolveAsset));
    return {
      manifest,
      words: resolvedWords,
      playableWords: resolvedWords.filter(word => word.playable === true),
    };
  }

  private moduleBasePath(manifestPath: string): string {
    const separatorIndex = manifestPath.lastIndexOf('/');
    return separatorIndex === -1 ? '' : manifestPath.slice(0, separatorIndex);
  }

  private resolveWord(
    moduleBasePath: string,
    word: LanguageWord,
    resolveAsset?: (assetPath: string) => string | null,
  ): ResolvedLanguageWord {
    return {
      ...word,
      imageUrl: this.resolveAsset(moduleBasePath, word.image, resolveAsset),
      languageAudioUrl: this.resolveAsset(moduleBasePath, word.audio?.language, resolveAsset),
      englishAudioUrl: this.resolveAsset(moduleBasePath, word.audio?.english, resolveAsset)
    };
  }

  private resolveAsset(
    moduleBasePath: string,
    assetPath: string | null | undefined,
    resolver?: (assetPath: string) => string | null,
  ): string | null {
    if (!assetPath) {
      return null;
    }

    const fullPath = `${moduleBasePath}/${assetPath}`;
    return resolver ? resolver(fullPath) : `languages/${fullPath}`;
  }

  private readSavedLanguage(): string | null {
    try {
      return localStorage.getItem(this.storageKey);
    } catch {
      return null;
    }
  }

  private saveLanguage(languageId: string): void {
    try {
      localStorage.setItem(this.storageKey, languageId);
    } catch {
      // Continue using the current in-memory selection if storage is unavailable.
    }
  }
}
