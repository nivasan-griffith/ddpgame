import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { AppConfigService } from './app-config.service';

export type ModuleAccessType = 'public' | 'private';

interface RedeemModuleAccessResponse {
  granted: boolean;
  grant_token?: string;
  expires_at?: string | null;
}

interface PrivateModuleUrlsResponse {
  urls: Array<{ path: string; url: string }>;
}

interface StoredModuleAccessGrant {
  token: string;
  expiresAt: string | null;
}

/**
 * Provides the app's single connection to Supabase.
 *
 * Keep database permissions in Supabase (RLS and server functions), not here.
 */
@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private readonly moduleGrantPrefix = 'module-access-grant:';
  readonly client: SupabaseClient;

  constructor(appConfig: AppConfigService) {
    this.client = createClient(
      appConfig.serverUrl,
      environment.supabasePublishableKey,
    );
  }

  async validateAccessCode(moduleId: string, accessCode: string): Promise<boolean> {
    const { data, error } = await this.client.rpc('validate_access_code', {
      p_module_id: moduleId,
      p_access_code: accessCode,
    });

    if (error) {
      throw error;
    }

    return data === true;
  }

  async redeemAccessCode(moduleId: string, accessCode: string): Promise<boolean> {
    const { data, error } = await this.client.rpc('redeem_access_code', {
      p_module_id: moduleId,
      p_access_code: accessCode,
    });

    if (error) {
      throw error;
    }

    return data === true;
  }

  async getModuleAccessType(moduleId: string): Promise<ModuleAccessType> {
    const { data, error } = await this.client.rpc('get_module_access_type', {
      p_module_id: moduleId,
    });

    if (error) {
      throw error;
    }

    return data === 'public' ? 'public' : 'private';
  }

  async redeemModuleAccessCode(moduleId: string, accessCode: string): Promise<boolean> {
    const { data, error } = await this.client.rpc('redeem_module_access_code', {
      p_module_id: moduleId,
      p_access_code: accessCode,
    });

    if (error) {
      throw error;
    }

    const result = data as RedeemModuleAccessResponse | null;
    if (!result?.granted || !result.grant_token) {
      return false;
    }

    this.saveModuleAccessGrant(moduleId, {
      token: result.grant_token,
      expiresAt: result.expires_at ?? null,
    });
    return true;
  }

  hasModuleAccessGrant(moduleId: string): boolean {
    const grant = this.readModuleAccessGrant(moduleId);
    if (!grant) {
      return false;
    }

    if (grant.expiresAt && new Date(grant.expiresAt) <= new Date()) {
      this.removeModuleAccessGrant(moduleId);
      return false;
    }

    return true;
  }

  async getPrivateModuleUrls(moduleId: string, paths: string[]): Promise<Record<string, string>> {
    const grant = this.readModuleAccessGrant(moduleId);
    if (!grant || !this.hasModuleAccessGrant(moduleId)) {
      throw new Error('No valid access grant exists for this module.');
    }

    const { data, error } = await this.client.functions.invoke('private-module-download', {
      body: { moduleId, grantToken: grant.token, paths },
    });

    if (error) {
      throw error;
    }

    const result = data as PrivateModuleUrlsResponse | null;
    if (!result?.urls) {
      throw new Error('Private module files could not be prepared.');
    }

    return result.urls.reduce<Record<string, string>>((urls, item) => {
      urls[item.path] = item.url;
      return urls;
    }, {});
  }

  private grantStorageKey(moduleId: string): string {
    return `${this.moduleGrantPrefix}${moduleId}`;
  }

  private readModuleAccessGrant(moduleId: string): StoredModuleAccessGrant | null {
    try {
      const value = localStorage.getItem(this.grantStorageKey(moduleId));
      return value ? JSON.parse(value) as StoredModuleAccessGrant : null;
    } catch {
      return null;
    }
  }

  private saveModuleAccessGrant(moduleId: string, grant: StoredModuleAccessGrant): void {
    try {
      localStorage.setItem(this.grantStorageKey(moduleId), JSON.stringify(grant));
    } catch {
      // The active page can still use a grant until a refresh if storage is unavailable.
    }
  }

  private removeModuleAccessGrant(moduleId: string): void {
    try {
      localStorage.removeItem(this.grantStorageKey(moduleId));
    } catch {
      // Ignore unavailable browser storage.
    }
  }
}
