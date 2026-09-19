import { Injectable } from '@angular/core';

interface RuntimeAppConfig {
  serverUrl: string;
}

@Injectable({ providedIn: 'root' })
export class AppConfigService {
  private config: RuntimeAppConfig | null = null;

  get serverUrl(): string {
    if (!this.config) {
      throw new Error('Application configuration has not been loaded.');
    }
    return this.config.serverUrl;
  }

  async load(): Promise<void> {
    const response = await fetch('assets/config/app-config.json', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Application configuration could not be loaded (${response.status}).`);
    }

    const config = await response.json() as Partial<RuntimeAppConfig>;
    const serverUrl = config.serverUrl?.trim().replace(/\/$/, '');
    if (!serverUrl) {
      throw new Error('Application configuration is missing serverUrl.');
    }

    this.config = { serverUrl };
  }
}
