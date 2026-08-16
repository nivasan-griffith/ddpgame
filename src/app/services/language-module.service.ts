import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, switchMap } from 'rxjs';

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

@Injectable({ providedIn: 'root' })
export class LanguageModuleService {
  private selectedLanguageId: string | null = null;

  constructor(private http: HttpClient) {}

  setSelectedLanguage(languageId: string): void {
    this.selectedLanguageId = languageId;
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
}
