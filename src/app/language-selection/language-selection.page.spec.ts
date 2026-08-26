import { Router } from '@angular/router';
import { of } from 'rxjs';
import { LanguageModuleService, LanguageOption, LoadedLanguageModule } from '../services/language-module.service';
import { LanguageThemeService } from '../services/language-theme.service';
import { SupabaseService } from '../services/supabase.service';
import { LanguageSelectionPage } from './language-selection.page';

describe('LanguageSelectionPage', () => {
  let languageModules: jasmine.SpyObj<LanguageModuleService>;
  let supabase: jasmine.SpyObj<SupabaseService>;
  let router: jasmine.SpyObj<Router>;
  let languageTheme: jasmine.SpyObj<LanguageThemeService>;
  let page: LanguageSelectionPage;

  beforeEach(() => {
    languageModules = jasmine.createSpyObj<LanguageModuleService>('LanguageModuleService', [
      'loadLanguageOptions',
      'installLanguage',
      'setSelectedLanguage',
      'loadSelectedModule'
    ]);
    languageModules.loadSelectedModule.and.returnValue(
      of({ manifest: { id: 'kuku-thaypan' } } as unknown as LoadedLanguageModule)
    );
    supabase = jasmine.createSpyObj<SupabaseService>('SupabaseService', ['hasModuleAccessGrant']);
    languageTheme = jasmine.createSpyObj<LanguageThemeService>('LanguageThemeService', ['applyManifestTheme']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate', 'navigateByUrl']);
    page = new LanguageSelectionPage(languageModules, languageTheme, supabase, router);
  });

  it('selects a public module through the existing home flow', async () => {
    await page.selectLanguage(makeOption('kuku-thaypan', 'public'));

    expect(languageModules.setSelectedLanguage).toHaveBeenCalledOnceWith('kuku-thaypan');
    expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/home', { replaceUrl: true });
  });

  it('routes a restricted module without a grant to access-code', async () => {
    supabase.hasModuleAccessGrant.and.returnValue(false);

    await page.selectLanguage(makeOption('bininj-kunwok', 'restricted', false));

    expect(languageModules.setSelectedLanguage).not.toHaveBeenCalled();
    expect(languageModules.installLanguage).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledOnceWith(['/access-code'], {
      queryParams: { moduleId: 'bininj-kunwok', returnUrl: '/home' },
      replaceUrl: true,
    });
  });

  it('installs and selects a restricted module that has a valid grant', async () => {
    supabase.hasModuleAccessGrant.and.returnValue(true);
    languageModules.installLanguage.and.resolveTo();

    await page.selectLanguage(makeOption('bininj-kunwok', 'restricted', false));

    expect(languageModules.installLanguage).toHaveBeenCalledOnceWith('bininj-kunwok');
    expect(languageModules.setSelectedLanguage).toHaveBeenCalledOnceWith('bininj-kunwok');
    expect(router.navigate).not.toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/home', { replaceUrl: true });
  });

  it('does not select or navigate when restricted module installation fails', async () => {
    supabase.hasModuleAccessGrant.and.returnValue(true);
    languageModules.installLanguage.and.rejectWith(new Error('download failed'));

    await page.selectLanguage(makeOption('bininj-kunwok', 'restricted', false));

    expect(languageModules.setSelectedLanguage).not.toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(page.errorMessage).toContain("Couldn't download");
  });

  it('selects an installed restricted module without checking the grant', async () => {
    await page.selectLanguage(makeOption('bininj-kunwok', 'restricted', true));

    expect(supabase.hasModuleAccessGrant).not.toHaveBeenCalled();
    expect(languageModules.installLanguage).not.toHaveBeenCalled();
    expect(languageModules.setSelectedLanguage).toHaveBeenCalledOnceWith('bininj-kunwok');
    expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/home', { replaceUrl: true });
  });

  it('does not select a module until it has been downloaded', () => {
    page.selectLanguage(makeOption('kuku-thaypan', 'public', false));

    expect(languageModules.setSelectedLanguage).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('downloads a module and marks it available offline', async () => {
    languageModules.installLanguage.and.resolveTo();
    const option = makeOption('kuku-thaypan', 'public', false);

    await page.downloadLanguage(option);

    expect(languageModules.installLanguage).toHaveBeenCalledOnceWith('kuku-thaypan');
    expect(option.installed).toBeTrue();
    expect(page.errorMessage).toBe('');
  });
});

function makeOption(
  id: string,
  accessType: LanguageOption['accessType'],
  installed = true
): LanguageOption {
  return { id, name: id, version: '1.0.0', installed, accessType };
}
