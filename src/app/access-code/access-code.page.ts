import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
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
  readonly moduleId: string;
  accessCode = '';
  isChecking = false;
  resultMessage = '';
  isValid = false;

  constructor(
    private readonly supabase: SupabaseService,
    route: ActivatedRoute
  ) {
    this.moduleId = route.snapshot.queryParamMap.get('moduleId')?.trim() ?? '';
    if (!this.moduleId) {
      this.resultMessage = 'No restricted language module was selected.';
    }
  }

  async validate(): Promise<void> {
    const code = this.accessCode.trim();
    this.resultMessage = '';
    this.isValid = false;

    if (!this.moduleId) {
      this.resultMessage = 'No restricted language module was selected.';
      return;
    }

    if (!code) {
      this.resultMessage = 'Enter an access code first.';
      return;
    }

    this.isChecking = true;

    try {
      this.isValid = await this.supabase.redeemAccessCode(this.moduleId, code);
      this.resultMessage = this.isValid
        ? 'Access code accepted. Download and unlock will be completed in a later step.'
        : 'That access code is not valid for this module.';
    } catch (error) {
      console.error('Access code validation failed.', error);
      this.resultMessage = 'The code could not be checked. Please try again.';
    } finally {
      this.isChecking = false;
    }
  }
}
