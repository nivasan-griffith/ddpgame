import { Injectable } from '@angular/core';
import { SupabaseClientService } from './supabase-client.service';

export interface LanguageModule {
  id: string;
  name: string;
  access_type: 'public' | 'private';
  created_at: string;
}

export interface AccessCode {
  id: string;
  language_module_id: string;
  label: string | null;
  is_active: boolean;
  expires_at: string | null;
  max_redemptions: number | null;
  redemption_count: number;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  constructor(private readonly supabase: SupabaseClientService) {}

  private async request<T>(body: Record<string, unknown>): Promise<T> {
    const { data, error } = await this.supabase.client.functions.invoke('admin-access-management', { body });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data as T;
  }

  async listModules(): Promise<LanguageModule[]> {
    const result = await this.request<{ modules: LanguageModule[] }>({ action: 'list_modules' });
    return result.modules;
  }

  async listCodes(moduleId?: string): Promise<AccessCode[]> {
    const result = await this.request<{ codes: AccessCode[] }>({ action: 'list_codes', moduleId });
    return result.codes;
  }

  generateCode(moduleId: string, label: string, expiresInDays: number, maxRedemptions: number): Promise<{ code: string; expiresAt: string; maxRedemptions: number }> {
    return this.request({ action: 'generate_code', moduleId, label, expiresInDays, maxRedemptions });
  }

  disableCode(codeId: string): Promise<{ disabled: boolean }> {
    return this.request({ action: 'disable_code', codeId });
  }

  updateModule(module: LanguageModule): Promise<{ updated: boolean }> {
    return this.request({
      action: 'update_module',
      moduleId: module.id,
      name: module.name,
      accessType: module.access_type,
    });
  }
}
