import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AppComponent } from './app.component';
import { LanguageModuleService } from './services/language-module.service';
import { LanguageThemeService } from './services/language-theme.service';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        { provide: LanguageModuleService, useValue: { loadSelectedModule: () => ({ subscribe: () => undefined }) } },
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
    expect(menuItems[0].textContent).toContain('Home');
    expect(menuItems[1].textContent).toContain('Flip Card');
  });

  it('should have urls', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const app = fixture.nativeElement;
    const menuItems = app.querySelectorAll('ion-item');
    expect(menuItems.length).toEqual(4);
    expect(menuItems[0].getAttribute('ng-reflect-router-link')).toEqual(
      '/home'
    );
    expect(menuItems[1].getAttribute('ng-reflect-router-link')).toEqual(
      '/games/flipcard'
    );
  });
});
