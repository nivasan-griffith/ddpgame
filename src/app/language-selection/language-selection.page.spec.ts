import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { of } from 'rxjs';
import { LanguageModuleService, LanguageOption } from '../services/language-module.service';
import { SupabaseService } from '../services/supabase.service';
import { LanguageThemeService } from '../services/language-theme.service';
import { LanguageSelectionPage } from './language-selection.page';

describe('LanguageSelectionPage', () => {
  let languageModules: jasmine.SpyObj<LanguageModuleService>;
  let supabase: jasmine.SpyObj<SupabaseService>;
  let languageTheme: jasmine.SpyObj<LanguageThemeService>;
  let router: jasmine.SpyObj<Router>;
  let alertController: jasmine.SpyObj<AlertController>;
  let alert: jasmine.SpyObj<HTMLIonAlertElement>;
  let page: LanguageSelectionPage;

  beforeEach(() => {
    languageModules = jasmine.createSpyObj<LanguageModuleService>('LanguageModuleService', [
      'loadLanguageOptions',
      'installLanguage',
      'removeLanguage',
      'setSelectedLanguage',
      'loadSelectedModule'
    ]);
    languageModules.loadSelectedModule.and.returnValue(of({
      manifest: { id: 'test', name: 'Test', version: '1.0.0', data: 'words.json', games: [] },
      words: [],
      playableWords: []
    }));
    supabase = jasmine.createSpyObj<SupabaseService>('SupabaseService', ['hasModuleAccessGrant']);
    languageTheme = jasmine.createSpyObj<LanguageThemeService>('LanguageThemeService', [
      'applyManifestTheme',
      'applyDefaultTheme'
    ]);
    router = jasmine.createSpyObj<Router>('Router', ['navigate', 'navigateByUrl']);
    alert = jasmine.createSpyObj<HTMLIonAlertElement>('HTMLIonAlertElement', ['present']);
    alert.present.and.resolveTo();
    alertController = jasmine.createSpyObj<AlertController>('AlertController', ['create']);
    alertController.create.and.resolveTo(alert);
    page = new LanguageSelectionPage(languageModules, supabase, languageTheme, router, alertController);
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

  it('prevents a second language action while a download is in progress', async () => {
    page.installingLanguageId = 'bininj-kunwok';

    await page.downloadLanguage(makeOption('kuku-thaypan', 'public', false));
    await page.selectLanguage(makeOption('kuku-thaypan', 'public'));

    expect(languageModules.installLanguage).not.toHaveBeenCalled();
    expect(languageModules.setSelectedLanguage).not.toHaveBeenCalled();
  });

  it('asks for confirmation before removing a downloaded module', async () => {
    const option = makeOption('kuku-thaypan', 'public');

    await page.confirmRemoveLanguage(option);

    expect(alertController.create).toHaveBeenCalledWith(jasmine.objectContaining({
      header: 'Remove kuku-thaypan?',
      message: jasmine.stringContaining('offline files'),
    }));
    expect(alert.present).toHaveBeenCalled();
    expect(languageModules.removeLanguage).not.toHaveBeenCalled();
  });

  it('removes a module, makes it downloadable again, and reports success', async () => {
    languageModules.removeLanguage.and.resolveTo(false);
    const option = makeOption('kuku-thaypan', 'public');

    await page.removeLanguage(option);

    expect(languageModules.removeLanguage).toHaveBeenCalledOnceWith('kuku-thaypan');
    expect(option.installed).toBeFalse();
    expect(page.successMessage).toContain('removed from this device');
    expect(page.errorMessage).toBe('');
    expect(languageTheme.applyDefaultTheme).not.toHaveBeenCalled();
  });

  it('restores the default theme when the active module is removed', async () => {
    languageModules.removeLanguage.and.resolveTo(true);

    await page.removeLanguage(makeOption('kuku-thaypan', 'public'));

    expect(languageTheme.applyDefaultTheme).toHaveBeenCalled();
  });

  it('keeps a module installed and reports an error when removal fails', async () => {
    languageModules.removeLanguage.and.rejectWith(new Error('storage failure'));
    const option = makeOption('kuku-thaypan', 'public');

    await page.removeLanguage(option);

    expect(option.installed).toBeTrue();
    expect(page.errorMessage).toContain("Couldn't remove");
    expect(page.successMessage).toBe('');
  });

  it('blocks other language actions while removal is in progress', async () => {
    page.removingLanguageId = 'bininj-kunwok';

    await page.downloadLanguage(makeOption('kuku-thaypan', 'public', false));
    await page.selectLanguage(makeOption('kuku-thaypan', 'public'));
    await page.confirmRemoveLanguage(makeOption('kuku-thaypan', 'public'));

    expect(languageModules.installLanguage).not.toHaveBeenCalled();
    expect(languageModules.setSelectedLanguage).not.toHaveBeenCalled();
    expect(alertController.create).not.toHaveBeenCalled();
  });

  it('exposes the downloading language name for the visible progress message', () => {
    page.languages = [makeOption('bininj-kunwok', 'restricted', false)];
    page.installingLanguageId = 'bininj-kunwok';

    expect(page.installingLanguageName).toBe('bininj-kunwok');
  });
});

function makeOption(
  id: string,
  accessType: LanguageOption['accessType'],
  installed = true
): LanguageOption {
  return { id, name: id, version: '1.0.0', installed, accessType };
}
