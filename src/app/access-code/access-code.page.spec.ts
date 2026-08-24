import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import { LanguageModuleService } from '../services/language-module.service';
import { AccessCodePage } from './access-code.page';

describe('AccessCodePage', () => {
  it('redeems the code, stores the selected module, and opens home', async () => {
    const supabase = jasmine.createSpyObj<SupabaseService>('SupabaseService', ['redeemModuleAccessCode']);
    supabase.redeemModuleAccessCode.and.resolveTo(true);
    const languageModules = jasmine.createSpyObj<LanguageModuleService>('LanguageModuleService', ['loadLanguageOptions', 'setSelectedLanguage']);
    languageModules.loadLanguageOptions.and.returnValue({ subscribe: () => undefined } as never);
    const router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    const page = new AccessCodePage(supabase, languageModules, makeRoute('another-restricted-module'), router);
    page.accessCode = '  ACCESS-123  ';

    await page.validate();

    expect(supabase.redeemModuleAccessCode).toHaveBeenCalledOnceWith('another-restricted-module', 'ACCESS-123');
    expect(languageModules.setSelectedLanguage).toHaveBeenCalledOnceWith('another-restricted-module');
    expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/home', { replaceUrl: true });
  });
});

function makeRoute(moduleId: string): ActivatedRoute {
  return { snapshot: { queryParamMap: convertToParamMap({ moduleId }) } } as ActivatedRoute;
}
