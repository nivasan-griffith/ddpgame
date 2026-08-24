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

  async selectLanguage(language: LanguageOption): Promise<void> {
    try {
      const accessType = await this.supabase.getModuleAccessType(language.id);
      if (accessType === 'private' && !this.supabase.hasModuleAccessGrant(language.id)) {
        await this.router.navigate(['/access-code'], {
          queryParams: { moduleId: language.id, returnUrl: '/home' },
          replaceUrl: true,
        });
        return;
      }

      this.languageModules.setSelectedLanguage(language.id);
      await this.router.navigateByUrl('/home', { replaceUrl: true });
    } catch {
      // Do not silently open a restricted module if its access status cannot be checked.
      await this.router.navigate(['/access-code'], {
        queryParams: { moduleId: language.id, returnUrl: '/home' },
        replaceUrl: true,
      });
    }
  }
}
