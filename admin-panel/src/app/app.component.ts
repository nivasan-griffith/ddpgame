import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApiService, AccessCode, LanguageModule } from './services/admin-api.service';
import { AdminAuthService } from './services/admin-auth.service';

@Component({
  selector: 'admin-root',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  loading = true;
  email = '';
  password = '';
  loginError = '';
  actionError = '';
  message = '';
  modules: LanguageModule[] = [];
  codes: AccessCode[] = [];
  selectedModuleId = '';
  codeLabel = '';
  expiresInDays = 30;
  maxRedemptions = 1;
  generatedCode = '';
  generating = false;

  get privateModules(): LanguageModule[] {
    return this.modules.filter(module => module.access_type === 'private');
  }

  get activeCodes(): AccessCode[] {
    // Disabled codes remain securely recorded in Supabase, but do not clutter
    // the administrator's normal active-code list.
    return this.codes.filter(code => code.is_active);
  }

  constructor(
    readonly auth: AdminAuthService,
    private readonly api: AdminApiService,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.auth.initialise();
    this.loading = false;
    if (this.auth.session) await this.loadDashboard();
  }

  async signIn(): Promise<void> {
    this.loginError = '';
    this.message = '';
    const error = await this.auth.signIn(this.email.trim(), this.password);
    if (error) {
      this.loginError = error;
      return;
    }
    this.password = '';
    await this.loadDashboard();
  }

  async signOut(): Promise<void> {
    await this.auth.signOut();
    this.modules = [];
    this.codes = [];
    this.generatedCode = '';
    this.message = '';
  }

  async loadDashboard(): Promise<void> {
    this.actionError = '';
    try {
      this.modules = await this.api.listModules();
      if (!this.privateModules.some(module => module.id === this.selectedModuleId)) {
        this.selectedModuleId = this.privateModules[0]?.id ?? '';
      }
      await this.loadCodes();
    } catch (error) {
      this.actionError = this.errorMessage(error);
    }
  }

  async loadCodes(): Promise<void> {
    if (!this.selectedModuleId) {
      this.codes = [];
      return;
    }
    try {
      this.codes = await this.api.listCodes(this.selectedModuleId);
    } catch (error) {
      this.actionError = this.errorMessage(error);
    }
  }

  async generateCode(): Promise<void> {
    if (!this.selectedModuleId || this.generating) return;
    this.actionError = '';
    this.message = '';
    this.generatedCode = '';
    this.generating = true;
    try {
      const result = await this.api.generateCode(
        this.selectedModuleId,
        this.codeLabel,
        Number(this.expiresInDays),
        Number(this.maxRedemptions),
      );
      this.generatedCode = result.code;
      this.message = `Code created. It expires ${new Date(result.expiresAt).toLocaleDateString()}. Save or send this code now; it cannot be shown again.`;
      this.codeLabel = '';
      await this.loadCodes();
    } catch (error) {
      this.actionError = this.errorMessage(error);
    } finally {
      this.generating = false;
    }
  }

  async disableCode(code: AccessCode): Promise<void> {
    if (!confirm('Disable this code? It cannot be used again.')) return;
    this.actionError = '';
    this.message = '';
    try {
      await this.api.disableCode(code.id);
      this.message = 'The code has been disabled. Future private-file requests using grants from this code are also denied.';
      await this.loadCodes();
    } catch (error) {
      this.actionError = this.errorMessage(error);
    }
  }

  async saveModule(module: LanguageModule): Promise<void> {
    this.actionError = '';
    this.message = '';
    try {
      await this.api.updateModule(module);
      this.message = `${module.name} settings saved.`;
    } catch (error) {
      this.actionError = this.errorMessage(error);
    }
  }

  codeStatus(code: AccessCode): string {
    if (!code.is_active) return 'Disabled';
    if (code.expires_at && new Date(code.expires_at) <= new Date()) return 'Expired';
    if (code.max_redemptions !== null && code.redemption_count >= code.max_redemptions) return 'Used up';
    return 'Active';
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
  }
}
