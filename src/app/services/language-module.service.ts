import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, switchMap, forkJoin} from 'rxjs';

export interface LanguageModuleIndex {
  modules: LanguageModuleIndexEntry[];
}

export interface LanguageModuleIndexEntry {
  id: string;
  manifest: string;
}

export interface LanguageManifest {
  id: string;
  name: string;
  location?: string;
  version: string;
  data: string;
  games: string[];
}

export interface LanguageWord {
  id: string;
  word: string;
  english: string;
  category?: string;
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
}

export interface LanguageOption {
  id: string;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class LanguageModuleService {
  private readonly storageKey = 'selected-language-id'; //store language choice
  private selectedLanguageId = this.readSavedLanguage();

  constructor(private http: HttpClient) {}

  setSelectedLanguage(languageId: string): void {
    this.selectedLanguageId = languageId; 
    this.saveLanguage(languageId);
  }

  hasSelectedLanguage(): boolean {
    return this.selectedLanguageId !== null;
  }

  loadLanguageOptions(): Observable<LanguageOption[]> {
    return this.http.get<LanguageModuleIndex>('languages/index.json').pipe(
      switchMap(index => forkJoin(index.modules.map(module =>
        this.http.get<LanguageManifest>(`languages/${module.manifest}`).pipe(
          map(manifest => ({ id: module.id, name: manifest.name}))
        )
      )))
    );
  }

  loadSelectedModule(): Observable<LoadedLanguageModule> {
    return this.http.get<LanguageModuleIndex>('languages/index.json').pipe(
      switchMap(index => {
        const selected = index.modules.find(module => module.id === this.selectedLanguageId) ?? index.modules[0];
        if (!selected) {
          throw new Error('No language modules are available.');
        }

        const moduleBasePath = this.moduleBasePath(selected.manifest);
        return this.http.get<LanguageManifest>(`languages/${selected.manifest}`).pipe(
          switchMap(manifest => this.http.get<LanguageWord[]>(`${moduleBasePath}/${manifest.data}`).pipe(
            map(words => ({
              manifest,
              words: words.map(word => this.resolveWord(moduleBasePath, word))
            }))
          ))
        );
      })
    );
  }

  private moduleBasePath(manifestPath: string): string {
    const separatorIndex = manifestPath.lastIndexOf('/');
    return separatorIndex === -1 ? 'languages' : `languages/${manifestPath.slice(0, separatorIndex)}`;
  }

  private resolveWord(moduleBasePath: string, word: LanguageWord): ResolvedLanguageWord {
    return {
      ...word,
      imageUrl: this.resolveAsset(moduleBasePath, word.image),
      languageAudioUrl: this.resolveAsset(moduleBasePath, word.audio?.language),
      englishAudioUrl: this.resolveAsset(moduleBasePath, word.audio?.english)
    };
  }

  private resolveAsset(moduleBasePath: string, assetPath: string | null | undefined): string | null {
    return assetPath ? `${moduleBasePath}/${assetPath}` : null;
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
