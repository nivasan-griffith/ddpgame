import { Router } from '@angular/router';
import { LanguageModuleService, LanguageOption } from '../services/language-module.service';
import { SupabaseService } from '../services/supabase.service';
import { LanguageSelectionPage } from './language-selection.page';

describe('LanguageSelectionPage', () => {
  let languageModules: jasmine.SpyObj<LanguageModuleService>;
  let supabase: jasmine.SpyObj<SupabaseService>;
  let router: jasmine.SpyObj<Router>;
  let page: LanguageSelectionPage;

  beforeEach(() => {
    languageModules = jasmine.createSpyObj<LanguageModuleService>('LanguageModuleService', ['loadLanguageOptions', 'setSelectedLanguage']);
    supabase = jasmine.createSpyObj<SupabaseService>('SupabaseService', ['hasModuleAccessGrant']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate', 'navigateByUrl']);
    page = new LanguageSelectionPage(languageModules, supabase, router);
  });

  it('selects a public module through the existing home flow', async () => {
    await page.selectLanguage(makeOption('kuku-thaypan', 'public'));

    expect(languageModules.setSelectedLanguage).toHaveBeenCalledOnceWith('kuku-thaypan');
    expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/home', { replaceUrl: true });
  });

  it('routes a restricted module without a grant to access-code', async () => {
    supabase.hasModuleAccessGrant.and.returnValue(false);

    await page.selectLanguage(makeOption('bininj-kunwok', 'restricted'));

    expect(languageModules.setSelectedLanguage).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledOnceWith(['/access-code'], {
      queryParams: { moduleId: 'bininj-kunwok', returnUrl: '/home' },
      replaceUrl: true,
    });
  });
});

function makeOption(id: string, accessType: LanguageOption['accessType']): LanguageOption {
  return { id, name: id, accessType };
}
