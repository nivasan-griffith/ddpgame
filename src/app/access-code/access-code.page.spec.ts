import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import { LanguageModuleService } from '../services/language-module.service';
import { AccessCodePage } from './access-code.page';

describe('AccessCodePage', () => {
  it('redeems the code, installs the module, stores the selection, and opens home in order', async () => {
    const supabase = makeSupabase();
    supabase.redeemModuleAccessCode.and.resolveTo(true);
    const languageModules = makeLanguageModules();
    languageModules.installLanguage.and.resolveTo();
    const router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    const page = new AccessCodePage(supabase, languageModules, makeRoute('another-restricted-module'), router);
    page.accessCode = '  ACCESS-123  ';

    await page.validate();

    expect(supabase.redeemModuleAccessCode).toHaveBeenCalledOnceWith('another-restricted-module', 'ACCESS-123');
    expect(languageModules.installLanguage).toHaveBeenCalledOnceWith('another-restricted-module');
    expect(languageModules.setSelectedLanguage).toHaveBeenCalledOnceWith('another-restricted-module');
    expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/home', { replaceUrl: true });
    expect(languageModules.installLanguage).toHaveBeenCalledBefore(languageModules.setSelectedLanguage);
    expect(languageModules.setSelectedLanguage).toHaveBeenCalledBefore(router.navigateByUrl);
  });

  it('keeps the grant and does not select or navigate when installation fails', async () => {
    const supabase = makeSupabase();
    supabase.redeemModuleAccessCode.and.resolveTo(true);
    const languageModules = makeLanguageModules();
    languageModules.installLanguage.and.rejectWith(new Error('download failed'));
    const router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    const page = new AccessCodePage(supabase, languageModules, makeRoute('restricted-module'), router);
    page.accessCode = 'ACCESS-123';

    await page.validate();

    expect(page.isValid).toBeTrue();
    expect(languageModules.setSelectedLanguage).not.toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(page.resultMessage).toContain('could not be downloaded');
  });

  it('retries installation with an existing grant without redeeming the code again', async () => {
    const supabase = makeSupabase();
    supabase.hasModuleAccessGrant.and.returnValue(true);
    const languageModules = makeLanguageModules();
    languageModules.installLanguage.and.resolveTo();
    const router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    const page = new AccessCodePage(supabase, languageModules, makeRoute('restricted-module'), router);
    page.accessCode = 'ACCESS-123';

    await page.validate();

    expect(supabase.redeemModuleAccessCode).not.toHaveBeenCalled();
    expect(languageModules.installLanguage).toHaveBeenCalledOnceWith('restricted-module');
    expect(languageModules.setSelectedLanguage).toHaveBeenCalledOnceWith('restricted-module');
    expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/home', { replaceUrl: true });
  });

  it('fails safely when no module id is supplied', async () => {
    const supabase = makeSupabase();
    const languageModules = makeLanguageModules();
    const router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    const page = new AccessCodePage(supabase, languageModules, makeRoute(null), router);
    page.accessCode = 'ACCESS-123';

    await page.validate();

    expect(supabase.redeemModuleAccessCode).not.toHaveBeenCalled();
    expect(languageModules.setSelectedLanguage).not.toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(page.isValid).toBeFalse();
    expect(page.resultMessage).toBe('Choose a language module before entering an access code.');
  });

  it('does not grant access, select the module, or navigate when the code is invalid', async () => {
    const supabase = makeSupabase();
    supabase.redeemModuleAccessCode.and.resolveTo(false);
    const languageModules = makeLanguageModules();
    const router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    const page = new AccessCodePage(supabase, languageModules, makeRoute('restricted-module'), router);
    page.accessCode = 'INVALID';

    await page.validate();

    expect(supabase.redeemModuleAccessCode).toHaveBeenCalledOnceWith('restricted-module', 'INVALID');
    expect(page.isValid).toBeFalse();
    expect(languageModules.installLanguage).not.toHaveBeenCalled();
    expect(languageModules.setSelectedLanguage).not.toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});

function makeLanguageModules(): jasmine.SpyObj<LanguageModuleService> {
  const languageModules = jasmine.createSpyObj<LanguageModuleService>('LanguageModuleService', [
    'loadLanguageOptions',
    'installLanguage',
    'setSelectedLanguage'
  ]);
  languageModules.loadLanguageOptions.and.returnValue({ subscribe: () => undefined } as never);
  return languageModules;
}

function makeSupabase(): jasmine.SpyObj<SupabaseService> {
  const supabase = jasmine.createSpyObj<SupabaseService>('SupabaseService', [
    'hasModuleAccessGrant',
    'redeemModuleAccessCode'
  ]);
  supabase.hasModuleAccessGrant.and.returnValue(false);
  return supabase;
}

function makeRoute(moduleId: string | null): ActivatedRoute {
  return {
    snapshot: {
      queryParamMap: convertToParamMap(moduleId ? { moduleId } : {})
    }
  } as ActivatedRoute;
}
