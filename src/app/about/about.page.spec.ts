import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, Subject, throwError } from 'rxjs';
import { AboutPage } from './about.page';
import { LanguageManifest, LanguageModuleService } from '../services/language-module.service';
import { LanguageThemeService } from '../services/language-theme.service';

describe('AboutPage', () => {
  let component: AboutPage;
  let fixture: ComponentFixture<AboutPage>;
  let manifest: LanguageManifest;
  let selectedModule$: Observable<{ manifest: LanguageManifest }>;
  let loadSelectedModule: jasmine.Spy;

  beforeEach(() => {
    manifest = { id: 'test', name: 'Test', version: '1.0.0', data: 'words.json', games: [] };
    selectedModule$ = of({ manifest });
    loadSelectedModule = jasmine.createSpy().and.callFake(() => selectedModule$);
    TestBed.configureTestingModule({
      imports: [AboutPage],
      providers: [
        provideRouter([]),
        {
          provide: LanguageModuleService,
          useValue: {
            loadSelectedModule
          }
        }
      ]
    });
    fixture = TestBed.createComponent(AboutPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('renders manifest About paragraphs and acknowledgements in order', () => {
    manifest.about = {
      paragraphs: ['First About paragraph.', 'Second About paragraph.'],
      links: [{ paragraph: 0, text: 'About', url: 'https://example.com/about' }],
      acknowledgementIntro: 'With thanks.',
      acknowledgements: [
        { role: 'First role', text: 'First acknowledgement.' },
        { role: 'Second role', text: 'Second acknowledgement.' }
      ],
      supporters: [
        { name: 'First supporter', logo: 'assets/logos/griffith-university.png' },
        { name: 'Second supporter', logo: 'assets/logos/vitalogy-foundation.png' }
      ],
      artists: [
        {
          name: 'First artist',
          role: 'Artist',
          image: 'assets/artists/chrissy-musgrave.jpg',
          description: 'First artist description.'
        }
      ]
    };

    fixture.detectChanges();

    const paragraphs = [...fixture.nativeElement.querySelectorAll('.gamespace > ng-container, p')]
      .map((element: Element) => element.textContent?.trim())
      .filter(Boolean);
    const acknowledgementRoles = [...fixture.nativeElement.querySelectorAll('.acknowledgement-row dt')]
      .map((element: Element) => element.textContent?.trim());
    const acknowledgements = [...fixture.nativeElement.querySelectorAll('.acknowledgement-row dd')]
      .map((element: Element) => element.textContent?.trim());
    const logos = [...fixture.nativeElement.querySelectorAll('.supporters img')];
    const supporterNames = [...fixture.nativeElement.querySelectorAll('.supporters figcaption')]
      .map((element: Element) => element.textContent?.trim());
    const aboutLink = fixture.nativeElement.querySelector('.about-copy a') as HTMLAnchorElement;
    const sectionTitles = [...fixture.nativeElement.querySelectorAll('.about-section h1, .about-section h2')]
      .map((element: Element) => element.textContent?.trim());
    expect(paragraphs).toContain('First About paragraph.');
    expect(paragraphs).toContain('Second About paragraph.');
    expect(aboutLink.textContent?.trim()).toBe('About');
    expect(aboutLink.href).toBe('https://example.com/about');
    expect(fixture.nativeElement.querySelectorAll('.about-copy a').length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('With thanks.');
    expect(acknowledgementRoles).toEqual(['First role', 'Second role']);
    expect(acknowledgements).toEqual(['First acknowledgement.', 'Second acknowledgement.']);
    expect(logos.map((logo: HTMLImageElement) => logo.alt)).toEqual([
      'First supporter logo',
      'Second supporter logo'
    ]);
    expect(supporterNames).toEqual(['First supporter', 'Second supporter']);
    expect(sectionTitles).toEqual([
      'IAbout this app',
      'IIAcknowledgements',
      'IIISupported by',
      'IVThe artists'
    ]);
    expect(fixture.nativeElement.textContent).toContain('First artist');
    expect(fixture.nativeElement.textContent).toContain('First artist description.');
  });

  it('renders a legacy manifest without optional editorial fields', () => {
    manifest.about = {
      paragraphs: ['Legacy About paragraph.'],
      acknowledgements: ['Legacy acknowledgement.']
    };

    expect(() => fixture.detectChanges()).not.toThrow();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Legacy About paragraph.');
    expect(text).toContain('Legacy acknowledgement.');
    expect(text).not.toContain('undefined');
    expect(fixture.nativeElement.querySelector('.supporters')).toBeNull();
    expect(fixture.nativeElement.querySelector('.artist-plates')).toBeNull();
  });

  it('shows only the neutral About fallback when manifest content is missing', () => {
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('About information for this language is not yet available.');
    expect(fixture.nativeElement.querySelector('.acknowledgement-ledger')).toBeNull();
    expect(fixture.nativeElement.querySelector('.supporters')).toBeNull();
    expect(fixture.nativeElement.querySelector('.artist-plates')).toBeNull();
    expect(text).not.toContain('Acknowledgements');
    expect(text).not.toContain('Kuku Thaypan');
  });

  it('continues to apply the selected manifest theme', () => {
    const theme = TestBed.inject(LanguageThemeService);
    const applyTheme = spyOn(theme, 'applyManifestTheme');

    fixture.detectChanges();

    expect(applyTheme).toHaveBeenCalledOnceWith(manifest);
  });

  it('reloads About for the selected language on later Ionic entries', () => {
    const kukuAbout = {
      paragraphs: ['Kuku About content.']
    };
    manifest.about = kukuAbout;

    fixture.detectChanges();
    expect(component.about).toBe(kukuAbout);
    expect(loadSelectedModule).toHaveBeenCalledTimes(1);

    component.ionViewWillEnter();
    expect(loadSelectedModule).toHaveBeenCalledTimes(1);

    manifest = { id: 'bininj', name: 'Bininj', version: '1.0.0', data: 'words.json', games: [] };
    selectedModule$ = of({ manifest });
    component.ionViewWillEnter();
    fixture.detectChanges();

    expect(component.about).toBeUndefined();
    expect(fixture.nativeElement.textContent).toContain('About information for this language is not yet available.');
    expect(fixture.nativeElement.textContent).not.toContain('Kuku About content.');

    manifest = {
      id: 'kuku',
      name: 'Kuku',
      version: '1.0.0',
      data: 'words.json',
      games: [],
      about: kukuAbout
    };
    selectedModule$ = of({ manifest });
    component.ionViewWillEnter();
    fixture.detectChanges();

    expect(component.about).toBe(kukuAbout);
    expect(fixture.nativeElement.textContent).toContain('Kuku About content.');
  });

  it('clears stale About content before a reloaded module arrives', () => {
    manifest.about = { paragraphs: ['Kuku About content.'] };
    fixture.detectChanges();
    component.ionViewWillEnter();

    const pendingModule = new Subject<{ manifest: LanguageManifest }>();
    selectedModule$ = pendingModule;
    component.ionViewWillEnter();

    expect(component.about).toBeUndefined();

    pendingModule.next({
      manifest: { id: 'bininj', name: 'Bininj', version: '1.0.0', data: 'words.json', games: [] }
    });
    expect(component.about).toBeUndefined();
  });

  it('does not retain stale About content when a reload fails', () => {
    manifest.about = { paragraphs: ['Kuku About content.'] };
    fixture.detectChanges();
    component.ionViewWillEnter();

    selectedModule$ = throwError(() => new Error('load failed'));

    expect(() => component.ionViewWillEnter()).not.toThrow();
    expect(component.about).toBeUndefined();
  });
});
