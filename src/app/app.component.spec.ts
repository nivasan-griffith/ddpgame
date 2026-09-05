import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AppComponent } from './app.component';
import { LanguageModuleService } from './services/language-module.service';
import { LanguageThemeService } from './services/language-theme.service';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        { provide: LanguageModuleService, useValue: { loadSelectedModule: () => of({ manifest: {} }) } },
        { provide: LanguageThemeService, useValue: { applyManifestTheme: () => undefined, applyDefaultTheme: () => undefined } }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should have menu labels', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const app = fixture.nativeElement;
    const menuItems = app.querySelectorAll('ion-label');
    expect(menuItems.length).toEqual(4);
    expect(Array.from(menuItems).map((item: any) => item.textContent.trim())).toEqual([
      'Home', 'Flip Card', 'Quiz', 'About'
    ]);
  });

  it('should have urls', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const app = fixture.nativeElement;
    const menuItems = app.querySelectorAll('ion-item');
    expect(menuItems.length).toEqual(4);
    expect(Array.from(menuItems).map((item: any) => item.getAttribute('ng-reflect-router-link'))).toEqual([
      '/home', '/games/flipcard', '/games/quiz', '/about'
    ]);
  });
});
