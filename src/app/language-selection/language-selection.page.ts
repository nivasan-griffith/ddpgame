import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonButton, IonIcon, IonProgressBar } from '@ionic/angular/standalone';
import { LanguageDownloadProgress, LanguageModuleService, LanguageOption } from 'src/app/services/language-module.service';
import { SupabaseService } from 'src/app/services/supabase.service';
import { LanguageThemeService } from 'src/app/services/language-theme.service';


@Component({
  selector: 'app-language-selection',
  templateUrl: './language-selection.page.html',
  styleUrls: ['./language-selection.page.scss'],
  standalone: true,
  imports: [IonIcon, IonButton, IonProgressBar, IonContent, CommonModule]
})

export class LanguageSelectionPage implements OnInit {
  languages: LanguageOption[] = [];
  loading = false;
  showLanguageList = false;
  installingLanguageId: string | null = null;
  downloadProgress: LanguageDownloadProgress | null = null;
  errorMessage = '';
  successMessage = '';

  get installingLanguageName(): string {
    return this.languages.find(language => language.id === this.installingLanguageId)?.name ?? 'language module';
  }

  constructor(
    private languageModules: LanguageModuleService,
    private supabase: SupabaseService,
    private languageTheme: LanguageThemeService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.showLanguageList = this.route.snapshot.queryParamMap.get('configure') === 'true';
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
      next: languages => {
        this.languages = languages;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Languages could not be loaded. Check your connection and try again.';
      }
    });
  }

  async downloadLanguage(language: LanguageOption): Promise<void> {
    if (this.installingLanguageId !== null) {
      return;
    }

    this.installingLanguageId = language.id;
    this.downloadProgress = null;
    this.errorMessage = '';
    this.successMessage = '';
    try {
      await this.languageModules.installLanguage(language.id, progress => {
        this.downloadProgress = progress;
      });
      language.installed = true;
      this.successMessage = `${language.name} is downloaded and ready to use offline.`;
    } catch {
      this.errorMessage = `Couldn't download ${language.name}. Check your connection and try again.`;
    } finally {
      this.installingLanguageId = null;
    }
  }

  async selectLanguage(language: LanguageOption): Promise<void> {
    if (this.installingLanguageId !== null) {
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
      next: module => this.languageTheme.applyManifestTheme(module.manifest),
      error: () => this.languageTheme.applyDefaultTheme()
    });
    await this.router.navigateByUrl('/home', { replaceUrl: true });
  }
}
