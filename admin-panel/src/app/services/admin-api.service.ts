import { Injectable } from '@angular/core';
import { SupabaseClientService } from './supabase-client.service';

export type AdminRole = 'system' | 'language';

export interface LanguageModule {
  id: string;
  name: string;
  access_type: 'public' | 'private';
  content_bucket: string | null;
  content_prefix: string | null;
  published_version: string | null;
  published_at: string | null;
  created_at: string;
}

export interface LanguageWord {
  id: string;
  word: string;
  english: string;
  category?: string;
  entrySource?: 'original' | 'dictionary';
  availableInCurrentVersion?: boolean;
  playable?: boolean;
  image: string | null;
  audio: { language: string | null; english: string | null };
  [key: string]: unknown;
}

export interface LanguageManifest {
  id: string;
  name: string;
  version: string;
  data: string;
  games: string[];
  [key: string]: unknown;
}

export interface ModuleContent {
  manifest: LanguageManifest;
  words: LanguageWord[];
  version: string;
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

export interface AdminDashboard {
  modules: LanguageModule[];
  role: AdminRole;
}

export interface AdministratorAccount {
  user_id: string;
  email: string;
  display_name: string | null;
  role: AdminRole;
  module_ids: string[];
}

export interface AvailableUser {
  id: string;
  email: string;
}

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  constructor(private readonly supabase: SupabaseClientService) {}

  private async request<T>(body: Record<string, unknown>): Promise<T> {
    const { data, error } = await this.supabase.client.functions.invoke('admin-access-management', { body });
    if (error) {
      const context = (error as { context?: unknown }).context;
      if (context instanceof Response) {
        const detail = await context.clone().json().catch(() => null) as { error?: unknown } | null;
        if (typeof detail?.error === 'string') throw new Error(detail.error);
      }
      throw new Error(error.message);
    }
    if (data?.error) throw new Error(data.error);
    return data as T;
  }

  listModules(): Promise<AdminDashboard> {
    return this.request<AdminDashboard>({ action: 'list_modules' });
  }

  getModuleContent(moduleId: string): Promise<ModuleContent> {
    return this.request({ action: 'get_module_content', moduleId });
  }

  createModule(id: string, name: string): Promise<{ module: LanguageModule; manifest: LanguageManifest; words: LanguageWord[] }> {
    return this.request({ action: 'create_module', id, name });
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

  updateCode(codeId: string, label: string, expiresInDays: number, maxRedemptions: number): Promise<{ updated: boolean }> {
    return this.request({ action: 'update_code', codeId, label, expiresInDays, maxRedemptions });
  }

  listAdministrators(): Promise<{ administrators: AdministratorAccount[]; availableUsers: AvailableUser[] }> {
    return this.request({ action: 'list_administrators' });
  }

  saveAdministratorPermissions(userId: string, role: AdminRole, moduleIds: string[]): Promise<{ saved: boolean }> {
    return this.request({ action: 'save_administrator_permissions', userId, role, moduleIds });
  }

  createLanguageAdministrator(email: string, password: string, moduleIds: string[]): Promise<{ created: boolean }> {
    return this.request({ action: 'create_language_administrator', email, password, moduleIds });
  }

  removeLanguageAdministrator(userId: string): Promise<{ removed: boolean }> {
    return this.request({ action: 'remove_language_administrator', userId });
  }

  updateModule(module: LanguageModule): Promise<{ updated: boolean; version: string; name: string }> {
    return this.request({
      action: 'update_module',
      moduleId: module.id,
      name: module.name,
      accessType: module.access_type,
      expectedVersion: module.published_version,
    });
  }

  deleteModule(moduleId: string, expectedVersion: string): Promise<{ deleted: boolean; cleanupPending: boolean }> {
    return this.request({ action: 'delete_module', moduleId, expectedVersion });
  }

  createWord(moduleId: string, expectedVersion: string, word: LanguageWord): Promise<{ words: LanguageWord[]; version: string }> {
    return this.request({ action: 'create_word', moduleId, expectedVersion, word });
  }

  updateWord(moduleId: string, wordId: string, expectedVersion: string, word: LanguageWord): Promise<{ words: LanguageWord[]; version: string }> {
    return this.request({ action: 'update_word', moduleId, wordId, expectedVersion, word });
  }

  deleteWord(moduleId: string, wordId: string, expectedVersion: string): Promise<{ words: LanguageWord[]; version: string }> {
    return this.request({ action: 'delete_word', moduleId, wordId, expectedVersion });
  }

  publishAccessType(moduleId: string, accessType: 'public' | 'private'): Promise<{
    published: boolean;
    accessType: 'public' | 'private';
    fileCount?: number;
    publishedVersion?: string | null;
    message?: string;
  }> {
    return this.request({ action: 'publish_access_type', moduleId, accessType });
  }
}
