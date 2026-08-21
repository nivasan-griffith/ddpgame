import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  // This is temporary until the app has a language/module selection screen.
  readonly moduleId = 'bininj-kunwok';
  accessCode = '';
  isChecking = false;
  resultMessage = '';
  isValid = false;

  constructor(private readonly supabase: SupabaseService) {}

  async validate(): Promise<void> {
    const code = this.accessCode.trim();
    this.resultMessage = '';
    this.isValid = false;

    if (!code) {
      this.resultMessage = 'Enter an access code first.';
      return;
    }

    this.isChecking = true;

    try {
      this.isValid = await this.supabase.validateAccessCode(this.moduleId, code);
      this.resultMessage = this.isValid
        ? 'Access code accepted. This module is unlocked for this test.'
        : 'That access code is not valid for this module.';
    } catch (error) {
      console.error('Access code validation failed.', error);
      this.resultMessage = 'The code could not be checked. Please try again.';
    } finally {
      this.isChecking = false;
    }
  }
}
