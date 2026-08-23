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
    page.selectLanguage(makeOption('bininj-kunwok', 'restricted'));

    expect(languageModules.setSelectedLanguage).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledOnceWith(['/access-code'], {
      queryParams: { moduleId: 'bininj-kunwok' }
    });
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});

function makeOption(id: string, accessType: LanguageOption['accessType']): LanguageOption {
  return { id, name: id, accessType };
}
