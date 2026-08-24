import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonButton, IonIcon } from '@ionic/angular/standalone';
import { LanguageModuleService, LanguageOption } from 'src/app/services/language-module.service';
import { LanguageThemeService } from 'src/app/services/language-theme.service';


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

  constructor(
    private languageModules: LanguageModuleService,
    private languageTheme: LanguageThemeService,
    private router: Router
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

  selectLanguage(language: LanguageOption): void {
    if (language.accessType === 'restricted') {
      this.router.navigate(['/access-code'], {
        queryParams: { moduleId: language.id }
      });
      return;
    }

    this.languageModules.setSelectedLanguage(language.id);
    this.languageModules.loadSelectedModule().subscribe({
      next: module => {
        this.languageTheme.applyManifestTheme(module.manifest);
        this.router.navigateByUrl('/home', { replaceUrl: true });
      },
      error: () => this.router.navigateByUrl('/home', { replaceUrl: true })
    });

  }
}
