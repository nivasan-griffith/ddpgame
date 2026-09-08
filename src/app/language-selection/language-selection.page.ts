import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AlertController,
  IonContent,
  IonButton,
  IonIcon,
  IonProgressBar,
} from '@ionic/angular/standalone';
import {
  LanguageDownloadProgress,
  LanguageModuleService,
  LanguageOption,
} from 'src/app/services/language-module.service';
import { SupabaseService } from 'src/app/services/supabase.service';
import { LanguageThemeService } from 'src/app/services/language-theme.service';

@Component({
  selector: 'app-language-selection',
  templateUrl: './language-selection.page.html',
  styleUrls: ['./language-selection.page.scss'],
  standalone: true,
  imports: [IonIcon, IonButton, IonProgressBar, IonContent, CommonModule],
})
export class LanguageSelectionPage implements OnInit {
  languages: LanguageOption[] = [];
  loading = false;
  showLanguageList = false;
  installingLanguageId: string | null = null;
  removingLanguageId: string | null = null;
  downloadProgress: LanguageDownloadProgress | null = null;
  errorMessage = '';
  successMessage = '';

  get installingLanguageName(): string {
    return (
      this.languages.find(
        (language) => language.id === this.installingLanguageId
      )?.name ?? 'language module'
    );
  }

  constructor(
    private languageModules: LanguageModuleService,
    private supabase: SupabaseService,
    private languageTheme: LanguageThemeService,
    private router: Router,
    private route: ActivatedRoute,
    private alertController: AlertController
  ) {}

  ngOnInit(): void {
    this.showLanguageList =
      this.route.snapshot.queryParamMap.get('configure') === 'true';
    if (this.showLanguageList) {
      this.loadLanguages();
    }
  }

  beginLanguageConfiguration(): void {
    this.showLanguageList = true;
    this.loadLanguages();
  }

  private loadLanguages(): void {
    if (this.loading || this.languages.length > 0) {
      return;
    }

    this.loading = true;
    this.languageModules.loadLanguageOptions().subscribe({
      next: (languages) => {
        this.languages = languages;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMessage =
          'Languages could not be loaded. Check your connection and try again.';
      },
    });
  }

  async downloadLanguage(language: LanguageOption, isUpdate = false): Promise<void> {
    if (
      this.installingLanguageId !== null ||
      this.removingLanguageId !== null
    ) {
      return;
    }

    this.installingLanguageId = language.id;
    this.downloadProgress = null;
    this.errorMessage = '';
    this.successMessage = '';
    try {
      await this.languageModules.installLanguage(language.id, (progress) => {
        this.downloadProgress = progress;
      });
      language.installed = true;
      language.installedVersion = language.version || language.installedVersion;
      language.updateAvailable = false;
      this.successMessage = `${language.name} is downloaded and ready to use offline.`;
    } catch {
      this.errorMessage = isUpdate
        ? `Couldn't update ${language.name}. Your downloaded version is still available offline.`
        : `Couldn't download ${language.name}. Check your connection and try again.`;
    } finally {
      this.installingLanguageId = null;
    }
  }

  async updateLanguage(language: LanguageOption): Promise<void> {
    await this.downloadLanguage(language, true);
  }

  async confirmRemoveLanguage(language: LanguageOption): Promise<void> {
    if (
      this.installingLanguageId !== null ||
      this.removingLanguageId !== null
    ) {
      return;
    }

    const alert = await this.alertController.create({
      header: `Remove ${language.name}?`,
      message:
        'This removes the downloaded module and its offline files from this device. You can download it again later.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Remove',
          role: 'destructive',
        },
      ],
    });

    await alert.present();
    const result = await alert.onDidDismiss();
    if (result.role === 'destructive') {
      await this.removeLanguage(language);
    }
  }

  async removeLanguage(language: LanguageOption): Promise<void> {
    if (
      this.installingLanguageId !== null ||
      this.removingLanguageId !== null
    ) {
      return;
    }

    this.removingLanguageId = language.id;
    this.errorMessage = '';
    this.successMessage = '';
    try {
      const removedSelectedLanguage = await this.languageModules.removeLanguage(
        language.id
      );
      language.installed = false;
      if (removedSelectedLanguage) {
        this.languageTheme.applyDefaultTheme();
      }
      this.successMessage = `${language.name} was removed from this device. You can download it again later.`;
    } catch (error) {
      console.error('[IND-90] Module removal failed.', error);
      this.errorMessage = `Couldn't remove ${language.name}. Try again.`;
    } finally {
      this.removingLanguageId = null;
    }
  }

  async selectLanguage(language: LanguageOption): Promise<void> {
    if (
      this.installingLanguageId !== null ||
      this.removingLanguageId !== null
    ) {
      return;
    }

    if (language.accessType === 'restricted' && !language.installed) {
      if (!this.supabase.hasModuleAccessGrant(language.id)) {
        await this.router.navigate(['/access-code'], {
          queryParams: { moduleId: language.id, returnUrl: '/home' },
          replaceUrl: true,
        });
        return;
      }

      await this.downloadLanguage(language);
      if (!language.installed) {
        return;
      }
    }

    if (language.accessType === 'public' && !language.installed) {
      return;
    }

    this.languageModules.setSelectedLanguage(language.id);
    this.languageModules.loadSelectedModule().subscribe({
      next: (module) => this.languageTheme.applyManifestTheme(module.manifest),
      error: () => this.languageTheme.applyDefaultTheme(),
    });
    await this.router.navigateByUrl('/home', { replaceUrl: true });
  }
}
