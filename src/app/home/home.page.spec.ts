import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { LanguageModuleService, LoadedLanguageModule, ResolvedLanguageWord } from '../services/language-module.service';
import { LanguageThemeService } from '../services/language-theme.service';
import { HomePage } from './home.page';

describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;
  let selectedModule: BehaviorSubject<LoadedLanguageModule>;
  let loadSelectedModule: jasmine.Spy;

  const word = (id: string, imageUrl: string, region?: ResolvedLanguageWord['region']): ResolvedLanguageWord => ({
    id,
    word: id,
    english: id,
    image: `${imageUrl}.png`,
    imageUrl,
    languageAudioUrl: null,
    englishAudioUrl: null,
    audio: { language: null, english: null },
    region,
  });

  const moduleWith = (playableWords: ResolvedLanguageWord[]): LoadedLanguageModule => ({
    manifest: { id: 'test', name: 'Test', version: '1.0.0', data: 'words.json', games: [] },
    words: playableWords,
    playableWords,
  });

  const kukuModule = (): LoadedLanguageModule => moduleWith([
    word('eye', 'scene', { shapeId: 'face', x: 10, y: 10, width: 20, height: 20 }),
    word('nose', 'scene', { shapeId: 'face', x: 40, y: 40, width: 20, height: 20 }),
  ]);

  const menuLabels = (): Array<string | undefined> => Array.from(
    fixture.nativeElement.querySelectorAll('.homemenu a') as NodeListOf<HTMLAnchorElement>
  ).map(link => link.textContent?.trim());

  beforeEach(() => {
    selectedModule = new BehaviorSubject(moduleWith([]));
    loadSelectedModule = jasmine.createSpy().and.returnValue(selectedModule.asObservable());
    TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [
        provideRouter([]),
        {
          provide: LanguageModuleService,
          useValue: {
            loadSelectedModule
          }
        },
        {
          provide: LanguageThemeService,
          useValue: { applyManifestTheme: () => undefined, asset: () => 'assets/test-theme.svg' }
        }
      ]
    });
    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('does not duplicate the initial load on first entry', () => {
    expect(loadSelectedModule).toHaveBeenCalledTimes(1);
    component.ionViewWillEnter();
    expect(loadSelectedModule).toHaveBeenCalledTimes(1);
  });

  it('keeps Mix & Match and About visible without region-capable content', () => {
    const labels = menuLabels();

    expect(labels).not.toContain('Drag & Drop');
    expect(labels).toContain('Mix & Match');
    expect(labels).toContain('About');
  });

  it('shows Drag & Drop for two valid regions sharing an image', () => {
    component.ionViewWillEnter();
    selectedModule.next(kukuModule());
    component.ionViewWillEnter();
    fixture.detectChanges();

    expect(menuLabels()).toContain('Drag & Drop');
  });

  it('hides Drag & Drop when shared-image regions have invalid coordinates', () => {
    component.ionViewWillEnter();
    selectedModule.next(moduleWith([
      word('eye', 'scene', { shapeId: 'face', x: 10, y: 10, width: 20, height: 20 }),
      word('nose', 'scene', { shapeId: 'face', x: 95, y: 40, width: 20, height: 20 }),
    ]));
    component.ionViewWillEnter();
    fixture.detectChanges();

    expect(menuLabels()).not.toContain('Drag & Drop');
  });

  it('updates immediately for Kuku to Bininj to Kuku re-entry', () => {
    component.ionViewWillEnter();

    selectedModule.next(kukuModule());
    component.ionViewWillEnter();
    fixture.detectChanges();
    expect(menuLabels()).toContain('Drag & Drop');

    selectedModule.next(moduleWith([]));
    component.ionViewWillEnter();
    fixture.detectChanges();
    expect(menuLabels()).not.toContain('Drag & Drop');

    selectedModule.next(kukuModule());
    component.ionViewWillEnter();
    fixture.detectChanges();
    expect(menuLabels()).toContain('Drag & Drop');
  });

  it('updates immediately for Bininj to Kuku to Bininj re-entry', () => {
    component.ionViewWillEnter();
    expect(menuLabels()).not.toContain('Drag & Drop');

    selectedModule.next(kukuModule());
    component.ionViewWillEnter();
    fixture.detectChanges();
    expect(menuLabels()).toContain('Drag & Drop');

    selectedModule.next(moduleWith([]));
    component.ionViewWillEnter();
    fixture.detectChanges();
    expect(menuLabels()).not.toContain('Drag & Drop');
  });
});
