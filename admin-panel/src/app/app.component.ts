import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AdminApiService,
  AdminRole,
  AccessCode,
  AdministratorAccount,
  LanguageModule,
  LanguageWord,
} from './services/admin-api.service';
import { AdminAuthService } from './services/admin-auth.service';

type PortalSection = 'languages' | 'administrators';
type ConfigureSection = 'settings' | 'content';

function emptyWord(): LanguageWord {
  return {
    id: '',
    word: '',
    english: '',
    category: '',
    entrySource: 'original',
    availableInCurrentVersion: true,
    playable: true,
    image: null,
    audio: { language: null, english: null },
  };
}

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
  newAdministratorModuleIds: string[] = [];
  newAdministratorSelectedModuleId = '';
  creatingAdministrator = false;
  codeLabel = '';
  expiresInDays = 30;
  maxRedemptions = 1;
  generatedCode = '';
  generating = false;
  publishingModuleId: string | null = null;
  accessTypeSelections: Record<string, 'public' | 'private'> = {};
  managingCode: AccessCode | null = null;
  editCodeLabel = '';
  editExpiresInDays = 30;
  editMaxRedemptions = 1;
  savingCode = false;
  words: LanguageWord[] = [];
  contentVersion = '';
  loadingContent = false;
  editingWord: LanguageWord | null = null;
  editingWordOriginalId: string | null = null;
  savingWord = false;
  creatingLanguage = false;
  languageCreatorOpen = false;
  newLanguageId = '';
  newLanguageName = '';
  deletingLanguage = false;

  get privateModules(): LanguageModule[] { return this.modules.filter(module => module.access_type === 'private'); }
  get activeCodes(): AccessCode[] { return this.codes.filter(code => code.is_active); }
  get isSystemAdmin(): boolean { return this.adminRole === 'system'; }
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
    this.words = [];
    this.contentVersion = '';
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

  async removeLanguageAdministrator(): Promise<void> {
    const administrator = this.editingAdministrator;
    if (!administrator || this.savingAdministrator) return;
    if (!confirm(`Remove ${administrator.email} as a Language Administrator? They will no longer be able to use the admin portal.`)) return;
    this.savingAdministrator = true;
    this.actionError = '';
    try {
      await this.api.removeLanguageAdministrator(administrator.user_id);
      this.message = `${administrator.email} no longer has Language Administrator access.`;
      this.editingModuleIds = [];
      this.editingAdministrator = null;
      await this.loadAdministrators();
    } catch (error) { this.actionError = this.errorMessage(error); }
    finally { this.savingAdministrator = false; }
  }

  async createLanguageAdministrator(): Promise<void> {
    if (!this.newAdministratorEmail || !this.newAdministratorPassword || this.newAdministratorModuleIds.length === 0 || this.creatingAdministrator) return;
    this.creatingAdministrator = true;
    this.actionError = '';
    try {
      await this.api.createLanguageAdministrator(this.newAdministratorEmail, this.newAdministratorPassword, this.newAdministratorModuleIds);
      this.message = `Language Administrator account created for ${this.newAdministratorEmail}. Share the temporary password securely.`;
      this.newAdministratorEmail = '';
      this.newAdministratorPassword = '';
      this.newAdministratorModuleIds = [];
      await this.loadAdministrators();
    } catch (error) { this.actionError = this.errorMessage(error); }
    finally { this.creatingAdministrator = false; }
  }

  async configureModule(module: LanguageModule): Promise<void> {
    this.activeSection = 'languages';
    this.configuredModule = module;
    this.configureSection = 'settings';
    this.words = [];
    this.contentVersion = '';
    this.editingWord = null;
    this.editingWordOriginalId = null;
    this.actionError = '';
    this.message = '';
    if (module.access_type === 'private') {
      this.selectedModuleId = module.id;
      await this.loadCodes();
    }
  }

  async selectConfigureSection(section: ConfigureSection): Promise<void> {
    this.configureSection = section;
    if (section === 'content' && this.configuredModule && !this.loadingContent) {
      await this.loadModuleContent();
    }
  }

  async loadModuleContent(): Promise<void> {
    if (!this.configuredModule) return;
    this.loadingContent = true;
    this.actionError = '';
    try {
      const content = await this.api.getModuleContent(this.configuredModule.id);
      this.words = content.words;
      this.contentVersion = content.version;
      this.configuredModule.published_version = content.version;
    } catch (error) {
      this.actionError = this.errorMessage(error);
    } finally {
      this.loadingContent = false;
    }
  }

  openLanguageCreator(): void {
    if (!this.isSystemAdmin) return;
    this.newLanguageId = '';
    this.newLanguageName = '';
    this.languageCreatorOpen = true;
    this.actionError = '';
  }

  closeLanguageCreator(): void {
    if (!this.creatingLanguage) this.languageCreatorOpen = false;
  }

  async createLanguage(): Promise<void> {
    if (!this.newLanguageId.trim() || !this.newLanguageName.trim() || this.creatingLanguage) return;
    this.creatingLanguage = true;
    this.actionError = '';
    try {
      const result = await this.api.createModule(this.newLanguageId, this.newLanguageName);
      this.languageCreatorOpen = false;
      this.message = `${result.module.name} was created as a private language.`;
      await this.loadDashboard();
      const created = this.modules.find(module => module.id === result.module.id);
      if (created) await this.configureModule(created);
    } catch (error) {
      this.actionError = this.errorMessage(error);
    } finally {
      this.creatingLanguage = false;
    }
  }

  openWordEditor(word?: LanguageWord): void {
    this.editingWordOriginalId = word?.id ?? null;
    this.editingWord = word
      ? { ...word, audio: { ...word.audio } }
      : emptyWord();
    this.actionError = '';
  }

  closeWordEditor(): void {
    if (!this.savingWord) {
      this.editingWord = null;
      this.editingWordOriginalId = null;
    }
  }

  async saveWord(): Promise<void> {
    if (!this.configuredModule || !this.editingWord || !this.contentVersion || this.savingWord) return;
    this.savingWord = true;
    this.actionError = '';
    try {
      const result = this.editingWordOriginalId
        ? await this.api.updateWord(this.configuredModule.id, this.editingWordOriginalId, this.contentVersion, this.editingWord)
        : await this.api.createWord(this.configuredModule.id, this.contentVersion, this.editingWord);
      this.words = result.words;
      this.contentVersion = result.version;
      this.configuredModule.published_version = result.version;
      this.message = this.editingWordOriginalId ? 'Word entry updated.' : 'Word entry added.';
      this.editingWord = null;
      this.editingWordOriginalId = null;
    } catch (error) {
      this.actionError = this.errorMessage(error);
      if (this.actionError.includes('changed after you opened it')) await this.loadModuleContent();
    } finally {
      this.savingWord = false;
    }
  }

  async deleteWord(word: LanguageWord): Promise<void> {
    if (!this.configuredModule || !this.contentVersion || this.savingWord) return;
    if (!confirm(`Delete “${word.word}” (${word.english})? The entry will be removed from the module.`)) return;
    this.savingWord = true;
    this.actionError = '';
    try {
      const result = await this.api.deleteWord(this.configuredModule.id, word.id, this.contentVersion);
      this.words = result.words;
      this.contentVersion = result.version;
      this.configuredModule.published_version = result.version;
      this.message = 'Word entry deleted. Referenced media files were retained in case another word uses them.';
    } catch (error) {
      this.actionError = this.errorMessage(error);
      if (this.actionError.includes('changed after you opened it')) await this.loadModuleContent();
    } finally {
      this.savingWord = false;
    }
  }

  async deleteLanguage(module: LanguageModule): Promise<void> {
    if (!this.isSystemAdmin || !module.published_version || this.deletingLanguage) return;
    if (!confirm(`Delete ${module.name}? Its language record and stored module files will be removed. This cannot be undone.`)) return;
    this.deletingLanguage = true;
    this.actionError = '';
    try {
      const result = await this.api.deleteModule(module.id, module.published_version);
      this.openLanguages();
      this.message = result.cleanupPending
        ? `${module.name} was deleted. Some stored files still need administrator cleanup.`
        : `${module.name} and its stored module files were deleted.`;
      await this.loadDashboard();
    } catch (error) {
      this.actionError = this.errorMessage(error);
    } finally {
      this.deletingLanguage = false;
    }
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
      const updated = await this.api.updateModule(module);
      module.name = updated.name;
      module.published_version = updated.version;
      this.contentVersion = updated.version;
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
