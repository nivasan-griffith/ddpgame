import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApiService, AdminRole, AccessCode, AdministratorAccount, LanguageModule } from './services/admin-api.service';
import { AdminAuthService } from './services/admin-auth.service';

type PortalSection = 'languages' | 'administrators';
type ConfigureSection = 'settings' | 'content';

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
  activeSection: PortalSection = 'languages';
  adminRole: AdminRole = 'system';
  configuredModule: LanguageModule | null = null;
  configureSection: ConfigureSection = 'settings';
  selectedModuleId = '';
  administrators: AdministratorAccount[] = [];
  editingAdministrator: AdministratorAccount | null = null;
  editingModuleIds: string[] = [];
  editingSelectedModuleId = '';
  savingAdministrator = false;
  newAdministratorEmail = '';
  newAdministratorPassword = '';
  newAdministratorPasswordConfirmation = '';
  showNewAdministratorPassword = false;
  showNewAdministratorPasswordConfirmation = false;
  newAdministratorRole: AdminRole = 'language';
  newAdministratorModuleIds: string[] = [];
  newAdministratorSelectedModuleId = '';
  creatingAdministrator = false;
  codeLabel = '';
  expiresInDays = 30;
  maxRedemptions = 1;
  generatedCode = '';
  generatedCodeCopied = false;
  generating = false;
  publishingModuleId: string | null = null;
  accessTypeSelections: Record<string, 'public' | 'private'> = {};
  managingCode: AccessCode | null = null;
  editCodeLabel = '';
  editExpiresInDays = 30;
  editMaxRedemptions = 1;
  savingCode = false;

  get privateModules(): LanguageModule[] { return this.modules.filter(module => module.access_type === 'private'); }
  get activeCodes(): AccessCode[] { return this.codes.filter(code => code.is_active); }
  get isSystemAdmin(): boolean { return this.adminRole === 'system'; }
  get creatingLanguageAdministrator(): boolean { return this.newAdministratorRole === 'language'; }
  get newAdministratorPasswordsMatch(): boolean {
    return this.newAdministratorPassword !== '' && this.newAdministratorPassword === this.newAdministratorPasswordConfirmation;
  }
  constructor(readonly auth: AdminAuthService, private readonly api: AdminApiService) {}

  async ngOnInit(): Promise<void> {
    await this.auth.initialise();
    this.loading = false;
    if (this.auth.session) await this.loadDashboard();
  }

  async signIn(): Promise<void> {
    this.loginError = '';
    this.message = '';
    const error = await this.auth.signIn(this.email.trim(), this.password);
    if (error) { this.loginError = error; return; }
    this.password = '';
    await this.loadDashboard();
  }

  async signOut(): Promise<void> {
    await this.auth.signOut();
    this.modules = [];
    this.codes = [];
    this.generatedCode = '';
    this.configuredModule = null;
    this.message = '';
  }

  async loadDashboard(): Promise<void> {
    this.actionError = '';
    try {
      const dashboard = await this.api.listModules();
      this.modules = dashboard.modules;
      this.adminRole = dashboard.role;
      this.accessTypeSelections = Object.fromEntries(this.modules.map(module => [module.id, module.access_type])) as Record<string, 'public' | 'private'>;
      if (!this.privateModules.some(module => module.id === this.selectedModuleId)) this.selectedModuleId = this.privateModules[0]?.id ?? '';
      if (this.configuredModule) this.configuredModule = this.modules.find(module => module.id === this.configuredModule?.id) ?? null;
    } catch (error) { this.actionError = this.errorMessage(error); }
  }

  openLanguages(): void {
    this.activeSection = 'languages';
    this.configuredModule = null;
    this.configureSection = 'settings';
    this.actionError = '';
  }

  async openAdministrators(): Promise<void> {
    if (!this.isSystemAdmin) return;
    this.activeSection = 'administrators';
    this.configuredModule = null;
    this.actionError = '';
    await this.loadAdministrators();
  }

  async loadAdministrators(): Promise<void> {
    if (!this.isSystemAdmin) return;
    try {
      const result = await this.api.listAdministrators();
      this.administrators = result.administrators;
      if (!this.modules.some(module => module.id === this.editingSelectedModuleId)) {
        this.editingSelectedModuleId = this.modules[0]?.id ?? '';
      }
      if (!this.modules.some(module => module.id === this.newAdministratorSelectedModuleId)) {
        this.newAdministratorSelectedModuleId = this.modules[0]?.id ?? '';
      }
    } catch (error) { this.actionError = this.errorMessage(error); }
  }

  editAdministrator(administrator: AdministratorAccount): void {
    this.editingAdministrator = administrator;
    this.editingModuleIds = [...administrator.module_ids];
  }

  canEditAdministrator(administrator: AdministratorAccount): boolean {
    return administrator.user_id !== this.auth.session?.user.id;
  }

  closeAdministratorEditor(): void {
    if (!this.savingAdministrator) this.editingAdministrator = null;
  }

  addAdministratorModule(): void {
    if (this.editingSelectedModuleId) {
      this.editingModuleIds = [...new Set([...this.editingModuleIds, this.editingSelectedModuleId])];
    }
  }

  removeAdministratorModule(moduleId: string): void {
    this.editingModuleIds = this.editingModuleIds.filter(id => id !== moduleId);
  }

  addNewAdministratorModule(): void {
    if (this.newAdministratorSelectedModuleId) {
      this.newAdministratorModuleIds = [...new Set([...this.newAdministratorModuleIds, this.newAdministratorSelectedModuleId])];
    }
  }

  removeNewAdministratorModule(moduleId: string): void {
    this.newAdministratorModuleIds = this.newAdministratorModuleIds.filter(id => id !== moduleId);
  }

  async saveLanguageAdministrator(): Promise<void> {
    if (!this.editingAdministrator || this.editingModuleIds.length === 0 || this.savingAdministrator) return;
    this.savingAdministrator = true;
    this.actionError = '';
    try {
      await this.api.saveAdministratorPermissions(this.editingAdministrator.user_id, 'language', this.editingModuleIds);
      this.message = 'Language Administrator permissions saved.';
      this.editingAdministrator = null;
      await this.loadAdministrators();
    } catch (error) { this.actionError = this.errorMessage(error); }
    finally { this.savingAdministrator = false; }
  }

  async removeAdministrator(): Promise<void> {
    const administrator = this.editingAdministrator;
    if (!administrator || this.savingAdministrator) return;
    const roleName = administrator.role === 'system' ? 'System Administrator' : 'Language Administrator';
    if (!confirm(`Remove ${administrator.email} as a ${roleName}? They will no longer be able to use the admin portal.`)) return;
    this.savingAdministrator = true;
    this.actionError = '';
    try {
      await this.api.removeAdministrator(administrator.user_id);
      this.message = `${administrator.email} no longer has ${roleName} access.`;
      this.editingModuleIds = [];
      this.editingAdministrator = null;
      await this.loadAdministrators();
    } catch (error) { this.actionError = this.errorMessage(error); }
    finally { this.savingAdministrator = false; }
  }

  async createAdministrator(): Promise<void> {
    if (!this.newAdministratorEmail || !this.newAdministratorPassword || (this.creatingLanguageAdministrator && this.newAdministratorModuleIds.length === 0) || this.creatingAdministrator) return;
    if (!this.newAdministratorPasswordsMatch) {
      this.actionError = 'The temporary passwords do not match.';
      return;
    }
    this.creatingAdministrator = true;
    this.actionError = '';
    try {
      await this.api.createAdministrator(
        this.newAdministratorEmail,
        this.newAdministratorPassword,
        this.newAdministratorRole,
        this.creatingLanguageAdministrator ? this.newAdministratorModuleIds : [],
      );
      const roleName = this.creatingLanguageAdministrator ? 'Language Administrator' : 'System Administrator';
      this.message = `${roleName} account created for ${this.newAdministratorEmail}. Share the temporary password securely.`;
      this.newAdministratorEmail = '';
      this.newAdministratorPassword = '';
      this.newAdministratorPasswordConfirmation = '';
      this.showNewAdministratorPassword = false;
      this.showNewAdministratorPasswordConfirmation = false;
      this.newAdministratorRole = 'language';
      this.newAdministratorModuleIds = [];
      await this.loadAdministrators();
    } catch (error) { this.actionError = this.errorMessage(error); }
    finally { this.creatingAdministrator = false; }
  }

  async configureModule(module: LanguageModule): Promise<void> {
    this.activeSection = 'languages';
    this.configuredModule = module;
    this.configureSection = 'settings';
    this.actionError = '';
    this.message = '';
    if (module.access_type === 'private') {
      this.selectedModuleId = module.id;
      await this.loadCodes();
    }
  }

  selectConfigureSection(section: ConfigureSection): void {
    this.configureSection = section;
  }

  async loadCodes(): Promise<void> {
    if (!this.selectedModuleId) { this.codes = []; return; }
    try { this.codes = await this.api.listCodes(this.selectedModuleId); }
    catch (error) { this.actionError = this.errorMessage(error); }
  }

  async generateCode(): Promise<void> {
    if (!this.selectedModuleId || this.generating) return;
    this.actionError = '';
    this.message = '';
    this.generatedCode = '';
    this.generatedCodeCopied = false;
    this.generating = true;
    try {
      const result = await this.api.generateCode(this.selectedModuleId, this.codeLabel, Number(this.expiresInDays), Number(this.maxRedemptions));
      this.generatedCode = result.code;
      this.message = `Code created. It expires ${new Date(result.expiresAt).toLocaleDateString()}. Save or send this code now; it cannot be shown again.`;
      this.codeLabel = '';
      await this.loadCodes();
    } catch (error) { this.actionError = this.errorMessage(error); }
    finally { this.generating = false; }
  }

  async copyGeneratedCode(): Promise<void> {
    if (!this.generatedCode) return;
    this.actionError = '';
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(this.generatedCode);
      } else {
        const input = document.createElement('textarea');
        input.value = this.generatedCode;
        input.setAttribute('readonly', '');
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.append(input);
        input.select();
        const copied = document.execCommand('copy');
        input.remove();
        if (!copied) throw new Error('Copy is unavailable in this browser.');
      }
      this.generatedCodeCopied = true;
      window.setTimeout(() => { this.generatedCodeCopied = false; }, 2000);
    } catch (error) {
      this.actionError = this.errorMessage(error);
    }
  }

  openCodeManager(code: AccessCode): void {
    this.managingCode = code;
    this.editCodeLabel = code.label ?? '';
    this.editExpiresInDays = this.daysUntil(code.expires_at);
    this.editMaxRedemptions = code.max_redemptions ?? 1;
    this.actionError = '';
  }

  closeCodeManager(): void { if (!this.savingCode) this.managingCode = null; }

  async saveCode(): Promise<void> {
    if (!this.managingCode || this.savingCode) return;
    this.savingCode = true;
    this.actionError = '';
    try {
      await this.api.updateCode(this.managingCode.id, this.editCodeLabel, Number(this.editExpiresInDays), Number(this.editMaxRedemptions));
      this.message = 'Access code settings updated.';
      this.managingCode = null;
      await this.loadCodes();
    } catch (error) { this.actionError = this.errorMessage(error); }
    finally { this.savingCode = false; }
  }

  async deleteCode(): Promise<void> {
    if (!this.managingCode || this.savingCode) return;
    if (!confirm('Delete this access code? It will be revoked immediately and cannot be used again.')) return;
    this.savingCode = true;
    this.actionError = '';
    try {
      await this.api.disableCode(this.managingCode.id);
      this.message = 'The access code was deleted and revoked. Its audit record is retained securely.';
      this.managingCode = null;
      await this.loadCodes();
    } catch (error) { this.actionError = this.errorMessage(error); }
    finally { this.savingCode = false; }
  }

  async saveModule(module: LanguageModule): Promise<void> {
    const targetAccessType = this.accessTypeSelections[module.id] ?? module.access_type;
    const isAccessChange = this.isSystemAdmin && targetAccessType !== module.access_type;
    if (isAccessChange) {
      const warning = targetAccessType === 'public'
        ? 'Its files will become publicly downloadable. Copies already downloaded cannot be made private later.'
        : 'The public copy will be removed before this module is marked private. New users will need an access code.';
      if (!confirm(`Save changes and make this module ${targetAccessType}?\n\n${warning}`)) return;
    }
    this.actionError = '';
    this.message = '';
    try {
      // Publishing access type is a separate server-side storage operation;
      // save the editable module metadata before starting that operation.
      await this.api.updateModule(module);
      if (isAccessChange) {
        await this.publishAccessType(module, true);
      } else {
        this.message = `${module.name} changes saved.`;
        await this.loadDashboard();
      }
    } catch (error) { this.actionError = this.errorMessage(error); }
  }

  async publishAccessType(module: LanguageModule, alreadyConfirmed = false): Promise<void> {
    if (!this.isSystemAdmin || this.publishingModuleId !== null) return;
    const targetAccessType = this.accessTypeSelections[module.id] ?? module.access_type;
    if (targetAccessType === module.access_type) { this.message = `${module.name} is already ${targetAccessType}.`; return; }
    const warning = targetAccessType === 'public'
      ? 'Its files will become publicly downloadable. Copies already downloaded cannot be made private later.'
      : 'The public copy will be removed before this module is marked private. New users will need an access code.';
    if (!alreadyConfirmed && !confirm(`Publish access change: make this module ${targetAccessType}?\n\n${warning}`)) return;
    this.actionError = '';
    this.message = '';
    this.publishingModuleId = module.id;
    try {
      const result = await this.api.publishAccessType(module.id, targetAccessType);
      this.message = result.published
        ? `${module.name} is now ${result.accessType}. ${result.fileCount ?? 0} files were published${result.publishedVersion ? ` (version ${result.publishedVersion})` : ''}.`
        : result.message ?? `${module.name} already has that access type.`;
      await this.loadDashboard();
    } catch (error) {
      this.actionError = this.errorMessage(error);
      await this.loadDashboard();
    } finally { this.publishingModuleId = null; }
  }

  codeStatus(code: AccessCode): string {
    if (!code.is_active) return 'Deleted';
    if (code.expires_at && new Date(code.expires_at) <= new Date()) return 'Expired';
    if (code.max_redemptions !== null && code.redemption_count >= code.max_redemptions) return 'Used up';
    return 'Active';
  }

  moduleName(moduleId: string): string {
    return this.modules.find(module => module.id === moduleId)?.name ?? moduleId;
  }

  private daysUntil(expiresAt: string | null): number {
    if (!expiresAt) return 30;
    return Math.max(1, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000));
  }

  private errorMessage(error: unknown): string { return error instanceof Error ? error.message : 'Something went wrong. Please try again.'; }
}
