import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { SupabaseService } from '../services/supabase.service';
import { LanguageModuleService } from '../services/language-module.service';

@Component({
  selector: 'app-access-code',
  templateUrl: './access-code.page.html',
  styleUrls: ['./access-code.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonButton,
    IonContent,
    IonHeader,
    IonInput,
    IonItem,
    IonLabel,
    IonSpinner,
    IonText,
    IonTitle,
    IonToolbar,
  ],
})
export class AccessCodePage {
  moduleId = '';
  moduleName = 'this language module';
  private returnUrl = '/home';
  accessCode = '';
  isChecking = false;
  resultMessage = '';
  isValid = false;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly languageModules: LanguageModuleService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {
    this.moduleId = this.route.snapshot.queryParamMap.get('moduleId') ?? '';
    const requestedReturnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    if (requestedReturnUrl?.startsWith('/') && !requestedReturnUrl.startsWith('//')) {
      this.returnUrl = requestedReturnUrl;
    }

    this.languageModules.loadLanguageOptions().subscribe({
      next: options => {
        this.moduleName = options.find(option => option.id === this.moduleId)?.name ?? this.moduleName;
      },
    });
  }

  async validate(): Promise<void> {
    const code = this.accessCode.trim();
    this.resultMessage = '';
    this.isValid = false;

    if (!this.moduleId) {
      this.resultMessage = 'Choose a language module before entering an access code.';
      return;
    }

    if (!code) {
      this.resultMessage = 'Enter an access code first.';
      return;
    }

    this.isChecking = true;

    try {
      this.isValid = await this.supabase.redeemModuleAccessCode(this.moduleId, code);
      this.resultMessage = this.isValid
        ? 'Access code accepted. Opening your unlocked language module…'
        : 'That access code is not valid for this module.';

      if (this.isValid) {
        this.languageModules.setSelectedLanguage(this.moduleId);
        await this.router.navigateByUrl(this.returnUrl, { replaceUrl: true });
      }
    } catch (error) {
      console.error('Access code validation failed.', error);
      this.resultMessage = 'The code could not be checked. Please try again.';
    } finally {
      this.isChecking = false;
    }
  }
}
