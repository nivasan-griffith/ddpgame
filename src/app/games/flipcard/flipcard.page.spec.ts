import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { LanguageModuleService, LoadedLanguageModule, ResolvedLanguageWord } from 'src/app/services/language-module.service';
import { LanguageThemeService } from 'src/app/services/language-theme.service';
import { UtilsService } from 'src/app/services/utils.service';
import { FlipcardPage } from './flipcard.page';

describe('FlipcardPage', () => {
  let component: FlipcardPage;
  let fixture: ComponentFixture<FlipcardPage>;
  const playableWords = [makeWord('one'), makeWord('two'), makeWord('no-image', true, null, null, null)];
  const module: LoadedLanguageModule = {
    manifest: { id: 'bininj-kunwok', name: 'Test', version: '1.0.0', data: 'words.json', games: ['flipcard'] },
    words: [...playableWords, makeWord('reference', false)],
    playableWords
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FlipcardPage],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        { provide: LanguageModuleService, useValue: { loadSelectedModule: () => of(module) } },
        { provide: LanguageThemeService, useValue: { applyManifestTheme: () => undefined } },
        { provide: UtilsService, useValue: { shuffleArray: <T>(items: T[]) => items } }
      ]
    });
    fixture = TestBed.createComponent(FlipcardPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('uses only playable words that have an image', () => {
    expect(component.cards.map(word => word.id)).toEqual(['one', 'two']);
  });

  it('enables Speak only on the English side for an English-audio-only card', () => {
    component.card = makeWord('english-only', true, null, 'audio/english.mp3');
    expect(component.canSpeak).toBeTrue();
    component.toggleFlip();
    expect(component.canSpeak).toBeFalse();
  });

  it('enables Speak only on the language side for a language-audio-only card', () => {
    component.card = makeWord('language-only', true, 'audio/language.mp3', null);
    expect(component.canSpeak).toBeFalse();
    component.toggleFlip();
    expect(component.canSpeak).toBeTrue();
  });

  it('keeps Speak disabled when neither side has audio', () => {
    component.card = makeWord('no-audio');
    expect(component.canSpeak).toBeFalse();
    component.toggleFlip();
    expect(component.canSpeak).toBeFalse();
  });
});

function makeWord(
  id: string,
  playable = true,
  languageAudioUrl: string | null = null,
  englishAudioUrl: string | null = null,
  image: string | null = 'images/test.png'
): ResolvedLanguageWord {
  return {
    id, word: id, english: id,
    entrySource: playable ? 'original' : 'dictionary', playable,
    image, audio: { language: null, english: null }, imageUrl: image,
    languageAudioUrl, englishAudioUrl
  };
}
