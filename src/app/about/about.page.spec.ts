import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AboutPage } from './about.page';
import { LanguageModuleService } from '../services/language-module.service';

describe('AboutPage', () => {
  let component: AboutPage;
  let fixture: ComponentFixture<AboutPage>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AboutPage],
      providers: [
        provideRouter([]),
        {
          provide: LanguageModuleService,
          useValue: {
            loadSelectedModule: () => of({
              manifest: { id: 'test', name: 'Test', version: '1.0.0', data: 'words.json', games: [] }
            })
          }
        }
      ]
    });
    fixture = TestBed.createComponent(AboutPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
