import { Injectable } from '@angular/core';
import { Session } from '@supabase/supabase-js';
import { SupabaseClientService } from './supabase-client.service';

@Injectable({ providedIn: 'root' })
export class AdminAuthService {
  session: Session | null = null;

  constructor(private readonly supabase: SupabaseClientService) {}

  async initialise(): Promise<void> {
    const { data } = await this.supabase.client.auth.getSession();
    this.session = data.session;
  }

  async signIn(email: string, password: string): Promise<string | null> {
    const { data, error } = await this.supabase.client.auth.signInWithPassword({ email, password });
    if (error) return error.message;
    this.session = data.session;
    return null;
  }

  async signOut(): Promise<void> {
    await this.supabase.client.auth.signOut();
    this.session = null;
  }
}
