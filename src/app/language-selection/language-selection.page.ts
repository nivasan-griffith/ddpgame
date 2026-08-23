import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonButton, IonIcon } from '@ionic/angular/standalone';
import { LanguageModuleService, LanguageOption } from 'src/app/services/language-module.service';


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

  constructor(private languageModules: LanguageModuleService, private router: Router) {}

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

  selectLanguage(language: LanguageOption): void {
    if (!language.installed) {
      return;
    }
    this.languageModules.setSelectedLanguage(language.id);
    this.router.navigateByUrl('/home', { replaceUrl: true });
  }
}
