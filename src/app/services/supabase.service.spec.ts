import { SupabaseService } from './supabase.service';

describe('SupabaseService', () => {
  it('fails closed when module access metadata is missing or invalid', async () => {
    for (const accessType of [null, undefined, 'unexpected', {}, []]) {
      const service = makeServiceWithAccessType(accessType);

      await expectAsync(service.getModuleAccessType('test-module')).toBeResolvedTo('private');
    }
  });
});

function makeServiceWithAccessType(data: unknown): SupabaseService {
  const service = Object.create(SupabaseService.prototype) as SupabaseService;
  const rpc = jasmine.createSpy('rpc').and.resolveTo({ data, error: null });
  Object.defineProperty(service, 'client', { value: { rpc } });
  return service;
}
