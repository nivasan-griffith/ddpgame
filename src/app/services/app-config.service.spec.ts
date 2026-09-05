import { AppConfigService } from './app-config.service';

describe('AppConfigService', () => {
  it('loads and normalizes the runtime server address', async () => {
    const service = new AppConfigService();
    spyOn(window, 'fetch').and.resolveTo({
      ok: true,
      json: async () => ({ serverUrl: 'https://example.test/' }),
    } as Response);

    await service.load();

    expect(service.serverUrl).toBe('https://example.test');
    expect(window.fetch).toHaveBeenCalledOnceWith('assets/config/app-config.json', { cache: 'no-store' });
  });

  it('rejects an empty runtime server address', async () => {
    const service = new AppConfigService();
    spyOn(window, 'fetch').and.resolveTo({
      ok: true,
      json: async () => ({ serverUrl: '   ' }),
    } as Response);

    await expectAsync(service.load()).toBeRejectedWithError('Application configuration is missing serverUrl.');
  });
});
