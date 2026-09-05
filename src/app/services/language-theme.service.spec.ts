import { LanguageThemeService } from './language-theme.service';

describe('LanguageThemeService', () => {
  it('applies a language manifest token set as CSS variables', () => {
    const setProperty = jasmine.createSpy('setProperty');
    const document = { documentElement: { style: { setProperty } } } as unknown as Document;
    const service = new LanguageThemeService(document);

    service.applyManifestTheme({
      id: 'bininj-kunwok',
      name: 'Bininj Kunwok',
      version: '1.0.0',
      data: 'words.json',
      games: [],
      theme: {
        tokens: {
          primaryBackground: '#eef4ef',
          buttonBackground: '#2f5d50',
          buttonText: '#ffffff',
          primaryText: '#15312d',
          linkHover: '#9a4e32',
          accent: '#9a4e32',
          surface: '#ffffff'
        },
        assets: {
          hero: 'assets/themes/generic/hero.svg',
          topLeftTrim: 'assets/themes/generic/top-left.svg',
          bottomRightTrim: 'assets/themes/generic/bottom-right.svg',
          navigationIcon: 'assets/themes/generic/navigation.svg',
          bulletIcon: 'assets/themes/generic/bullet.svg',
          successIcon: 'assets/themes/generic/success.svg',
          retryIcon: 'assets/themes/generic/retry.svg'
        }
      }
    });

    expect(setProperty).toHaveBeenCalledWith('--primary-bg', '#eef4ef');
    expect(setProperty).toHaveBeenCalledWith('--button-bg', '#2f5d50');
    expect(setProperty).toHaveBeenCalledWith('--theme-accent', '#9a4e32');
    expect(setProperty).toHaveBeenCalledWith('--theme-bullet-icon', 'url("assets/themes/generic/bullet.svg")');
    expect(service.asset('hero')).toBe('assets/themes/generic/hero.svg');
  });
});
