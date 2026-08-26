import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { LanguageModuleService } from '../services/language-module.service';
import { LanguageThemeService } from '../services/language-theme.service';
import { HomePage } from './home.page';

describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [
        provideRouter([]),
        {
          provide: LanguageModuleService,
          useValue: {
            loadSelectedModule: () => of({
              manifest: { id: 'test', name: 'Test', version: '1.0.0', data: 'words.json', games: [] },
              words: [],
              playableWords: []
            })
          }
        }
        , { provide: LanguageThemeService, useValue: { applyManifestTheme: () => undefined } }
      ]
    });
    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
