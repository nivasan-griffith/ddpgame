import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonButton, IonIcon } from '@ionic/angular/standalone';
import { LanguageModuleService, LanguageOption } from 'src/app/services/language-module.service';
import { SupabaseService } from 'src/app/services/supabase.service';


@Component({
  selector: 'app-language-selection',
  templateUrl: './language-selection.page.html',
  styleUrls: ['./language-selection.page.scss'],
  standalone: true,
  imports: [IonIcon, IonButton,IonContent,  CommonModule]
})

export class LanguageSelectionPage implements OnInit {
  languages: LanguageOption[] = [];
  loading = true;
  installingLanguageId: string | null = null;
  errorMessage = '';

  constructor(
    private languageModules: LanguageModuleService,
    private supabase: SupabaseService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.languageModules.loadLanguageOptions().subscribe({
      next: languages => {
        this.languages = languages;
        this.loading = false;

      },
      error: () => this.loading = false
    });
  }

  async downloadLanguage(language: LanguageOption): Promise<void> {
    this.installingLanguageId = language.id;
    this.errorMessage = '';
    try {
      await this.languageModules.installLanguage(language.id);
      language.installed = true;
    } catch {
      this.errorMessage = `Couldn't download ${language.name}. Check your connection and try again.`;
    } finally {
      this.installingLanguageId = null;
    }
  }

  async selectLanguage(language: LanguageOption): Promise<void> {
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
    await this.router.navigateByUrl('/home', { replaceUrl: true });
  }
}
