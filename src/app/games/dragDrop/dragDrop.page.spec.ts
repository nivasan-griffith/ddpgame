import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import {
  LanguageModuleService,
  LoadedLanguageModule,
  ResolvedLanguageWord,
} from 'src/app/services/language-module.service';
import { LanguageThemeService } from 'src/app/services/language-theme.service';
import { UtilsService } from 'src/app/services/utils.service';
import { DragDropPage } from './dragDrop.page';

describe('DragDropPage', () => {
  let component: DragDropPage;
  let fixture: ComponentFixture<DragDropPage>;
  let shuffleArray: jasmine.Spy;
  let languageModules: jasmine.SpyObj<LanguageModuleService>;

  const playableWords = [
    makeWord('one'),
    makeWord('two'),
    makeWord('three'),
    makeWord('four'),
    makeWord('five'),
    makeWord('no-image', null),
  ];
  const module: LoadedLanguageModule = {
    manifest: {
      id: 'bininj-kunwok',
      name: 'Test',
      version: '1.0.0',
      data: 'words.json',
      games: ['drag-drop'],
    },
    words: playableWords,
    playableWords,
  };

  beforeEach(() => {
    shuffleArray = jasmine.createSpy('shuffleArray').and.callFake(
      <T>(items: T[]) => (shuffleArray.calls.count() % 2 === 0 ? [...items].reverse() : items)
    );

    languageModules = jasmine.createSpyObj<LanguageModuleService>(
      'LanguageModuleService',
      ['loadSelectedModule']
    );
    languageModules.loadSelectedModule.and.returnValue(of(module));

    TestBed.configureTestingModule({
      imports: [DragDropPage],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        {
          provide: LanguageModuleService,
          useValue: languageModules,
        },
        {
          provide: LanguageThemeService,
          useValue: {
            applyManifestTheme: () => undefined,
            asset: () => 'assets/dot.png',
          },
        },
        { provide: UtilsService, useValue: { shuffleArray } },
      ],
    });

    fixture = TestBed.createComponent(DragDropPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('shuffles the word cards independently from the image targets', () => {
    expect(component.targets.map(target => target.word.id)).toEqual([
      'one',
      'two',
      'three',
      'four',
    ]);
    expect(component.wordBank.map(word => word.id)).toEqual([
      'four',
      'three',
      'two',
      'one',
    ]);
    expect(shuffleArray).toHaveBeenCalledTimes(2);
  });

  it('keeps the same set and orders when restarting a round', () => {
    const imageOrder = component.targets.map(target => target.word.id);
    const wordOrder = component.wordBank.map(word => word.id);
    component.targets[0].droppedWord = component.wordBank[0];

    component.restartRound();

    expect(component.targets.map(target => target.word.id)).toEqual(imageOrder);
    expect(component.wordBank.map(word => word.id)).toEqual(wordOrder);
    expect(component.targets.every(target => target.droppedWord === null)).toBeTrue();
    expect(shuffleArray).toHaveBeenCalledTimes(2);
  });

  it('creates a fresh independent word-card shuffle for the next round', () => {
    component.nextRound();

    expect(shuffleArray).toHaveBeenCalledTimes(4);
    expect(component.wordBank.map(word => word.id)).not.toEqual(
      component.targets.map(target => target.word.id)
    );
  });

  it('loads once on initialisation and skips the first Ionic entry callback', () => {
    expect(languageModules.loadSelectedModule).toHaveBeenCalledTimes(1);

    component.ionViewWillEnter();

    expect(languageModules.loadSelectedModule).toHaveBeenCalledTimes(1);
  });

  it('clears stale state and loads the newly selected language on re-entry', () => {
    const bininjWords = [
      makeWord('bininj-one'),
      makeWord('bininj-two'),
      makeWord('bininj-three'),
      makeWord('bininj-four'),
    ];
    const bininjModule: LoadedLanguageModule = {
      manifest: {
        id: 'bininj-kunwok',
        name: 'Bininj Kunwok',
        version: '1.0.0',
        data: 'words.json',
        games: ['drag-drop'],
      },
      words: bininjWords,
      playableWords: bininjWords,
    };
    const reloadedModule = new Subject<LoadedLanguageModule>();

    component.ionViewWillEnter();
    component.isPopovertrueOpen = true;
    component.isPopoverfalseOpen = true;
    component.selectedWord = component.wordBank[0];
    languageModules.loadSelectedModule.and.returnValue(reloadedModule);

    component.ionViewWillEnter();

    expect(component.targets).toEqual([]);
    expect(component.wordBank).toEqual([]);
    expect(component.selectedWord).toBeNull();
    expect(component.isPopovertrueOpen).toBeFalse();
    expect(component.isPopoverfalseOpen).toBeFalse();

    reloadedModule.next(bininjModule);

    expect(languageModules.loadSelectedModule).toHaveBeenCalledTimes(2);
    expect(component.targets.map(target => target.word.id)).toEqual([
      'bininj-one',
      'bininj-two',
      'bininj-three',
      'bininj-four',
    ]);
    expect(component.wordBank.map(word => word.id)).toEqual([
      'bininj-four',
      'bininj-three',
      'bininj-two',
      'bininj-one',
    ]);
  });
});

function makeWord(
  id: string,
  image: string | null = 'images/test.png'
): ResolvedLanguageWord {
  return {
    id,
    word: id,
    english: id,
    entrySource: 'original',
    playable: true,
    image,
    audio: { language: null, english: null },
    imageUrl: image,
    languageAudioUrl: null,
    englishAudioUrl: null,
  };
}
