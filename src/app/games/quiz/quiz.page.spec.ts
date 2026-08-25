import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { LanguageModuleService, LoadedLanguageModule, ResolvedLanguageWord } from 'src/app/services/language-module.service';
import { UtilsService } from 'src/app/services/utils.service';
import { QuizPage } from './quiz.page';

describe('QuizPage', () => {
  let component: QuizPage;
  let fixture: ComponentFixture<QuizPage>;
  const playableWords = [makeWord('one'), makeWord('two'), makeWord('no-image', true, null)];
  const module: LoadedLanguageModule = {
    manifest: { id: 'bininj-kunwok', name: 'Test', version: '1.0.0', data: 'words.json', games: ['quiz'] },
    words: [...playableWords, makeWord('reference', false)], playableWords
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [QuizPage],
      providers: [
        provideRouter([]),
        { provide: LanguageModuleService, useValue: { loadSelectedModule: () => of(module) } },
        { provide: UtilsService, useValue: { shuffleArray: <T>(items: T[]) => items } }
      ]
    });
    fixture = TestBed.createComponent(QuizPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('uses only playable words that have an image', () => {
    expect(component.cards.map(word => word.id)).toEqual(['one', 'two']);
    expect(component.quiz.map(word => word.id)).toEqual(['one', 'two']);
  });
});

function makeWord(id: string, playable = true, image: string | null = 'images/test.png'): ResolvedLanguageWord {
  return {
    id, word: id, english: id,
    entrySource: playable ? 'original' : 'dictionary', playable,
    image, audio: { language: null, english: null }, imageUrl: image,
    languageAudioUrl: null, englishAudioUrl: null
  };
}
