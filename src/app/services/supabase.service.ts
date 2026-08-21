import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

/**
 * Provides the app's single connection to Supabase.
 *
 * Keep database permissions in Supabase (RLS and server functions), not here.
 */
@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly client: SupabaseClient;

  constructor() {
    this.client = createClient(
      environment.supabaseUrl,
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
}
