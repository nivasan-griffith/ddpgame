import { Router } from '@angular/router';
import { LanguageModuleService, LanguageOption } from '../services/language-module.service';
import { LanguageSelectionPage } from './language-selection.page';

describe('LanguageSelectionPage', () => {
  let languageModules: jasmine.SpyObj<LanguageModuleService>;
  let router: jasmine.SpyObj<Router>;
  let page: LanguageSelectionPage;

  beforeEach(() => {
    languageModules = jasmine.createSpyObj<LanguageModuleService>('LanguageModuleService', [
      'loadLanguageOptions',
      'installLanguage',
      'setSelectedLanguage'
    ]);
    router = jasmine.createSpyObj<Router>('Router', ['navigate', 'navigateByUrl']);
    page = new LanguageSelectionPage(languageModules, router);
  });

  it('selects a public module through the existing home flow', () => {
    page.selectLanguage(makeOption('kuku-thaypan', 'public'));

    expect(languageModules.setSelectedLanguage).toHaveBeenCalledOnceWith('kuku-thaypan');
    expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/home', { replaceUrl: true });
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('routes a restricted module to access-code without selecting it', () => {
    page.selectLanguage(makeOption('bininj-kunwok', 'restricted', false));

    expect(languageModules.setSelectedLanguage).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledOnceWith(['/access-code'], {
      queryParams: { moduleId: 'bininj-kunwok' }
    });
    expect(router.navigateByUrl).not.toHaveBeenCalled();
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
