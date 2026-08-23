import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import { AccessCodePage } from './access-code.page';

describe('AccessCodePage', () => {
  it('validates the entered code against the module supplied by navigation', async () => {
    const supabase = jasmine.createSpyObj<SupabaseService>('SupabaseService', ['redeemAccessCode']);
    supabase.redeemAccessCode.and.resolveTo(true);
    const page = new AccessCodePage(supabase, makeRoute('another-restricted-module'));
    page.accessCode = '  ACCESS-123  ';

    await page.validate();

    expect(supabase.redeemAccessCode).toHaveBeenCalledOnceWith('another-restricted-module', 'ACCESS-123');
    expect(page.isValid).toBeTrue();
    expect(page.resultMessage).toContain('accepted');
    expect(page.resultMessage).toContain('later step');
  });

  it('fails safely when no module id is supplied', async () => {
    const supabase = jasmine.createSpyObj<SupabaseService>('SupabaseService', ['redeemAccessCode']);
    const page = new AccessCodePage(supabase, makeRoute(null));
    page.accessCode = 'ACCESS-123';

    await page.validate();

    expect(supabase.redeemAccessCode).not.toHaveBeenCalled();
    expect(page.isValid).toBeFalse();
    expect(page.resultMessage).toBe('No restricted language module was selected.');
  });
});

function makeRoute(moduleId: string | null): ActivatedRoute {
  return {
    snapshot: {
      queryParamMap: convertToParamMap(moduleId ? { moduleId } : {})
    }
  } as ActivatedRoute;
}
