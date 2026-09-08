import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent,IonList,IonItem } from '@ionic/angular/standalone';
import { RouterLink } from '@angular/router';
import { LanguageThemeService } from '../services/language-theme.service';
import {
  LanguageAbout,
  LanguageAcknowledgement,
  LanguageModuleService
} from '../services/language-module.service';

@Component({
  selector: 'app-about',
  templateUrl: './about.page.html',
  styleUrls: ['./about.page.scss'],
  standalone: true,
  imports: [RouterLink,IonContent,IonList,IonItem, CommonModule, FormsModule]
})
export class AboutPage implements OnInit {
  about?: LanguageAbout;
  private firstEntry = true;

  constructor(
    private readonly languageModules: LanguageModuleService,
    public readonly theme: LanguageThemeService
  ) { }

  ngOnInit() {
    this.loadAbout();
  }

  ionViewWillEnter(): void {
    if (this.firstEntry) {
      this.firstEntry = false;
      return;
    }

    this.loadAbout();
  }

  private loadAbout(): void {
    this.about = undefined;
    this.languageModules.loadSelectedModule().subscribe({
      next: module => {
        this.theme.applyManifestTheme(module.manifest);
        this.about = module.manifest.about;
      },
      error: () => {
        this.about = undefined;
      }
    });
  }

  acknowledgementRole(acknowledgement: LanguageAcknowledgement | string): string | null {
    return typeof acknowledgement === 'string' ? null : acknowledgement.role;
  }

  acknowledgementText(acknowledgement: LanguageAcknowledgement | string): string {
    return typeof acknowledgement === 'string' ? acknowledgement : acknowledgement.text;
  }

  paragraphSegments(paragraph: string, paragraphIndex: number): Array<{ text: string; url?: string }> {
    const links = (this.about?.links ?? []).filter(link => link.paragraph === paragraphIndex);
    const segments: Array<{ text: string; url?: string }> = [];
    let position = 0;

    while (position < paragraph.length) {
      const next = links
        .filter(link => link.text.length > 0)
        .map(link => ({ ...link, index: paragraph.indexOf(link.text, position) }))
        .filter(link => link.index >= 0)
        .sort((a, b) => a.index - b.index)[0];

      if (!next) {
        segments.push({ text: paragraph.slice(position) });
        break;
      }

      if (next.index > position) {
        segments.push({ text: paragraph.slice(position, next.index) });
      }
      segments.push({ text: next.text, url: next.url });
      position = next.index + next.text.length;
    }

    return segments;
  }
}
