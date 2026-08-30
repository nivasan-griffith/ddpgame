import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent,IonList,IonItem } from '@ionic/angular/standalone';
import { RouterLink } from '@angular/router';
import { LanguageThemeService } from '../services/language-theme.service';
import { LanguageModuleService } from '../services/language-module.service';

@Component({
  selector: 'app-about',
  templateUrl: './about.page.html',
  styleUrls: ['./about.page.scss'],
  standalone: true,
  imports: [RouterLink,IonContent,IonList,IonItem, CommonModule, FormsModule]
})
export class AboutPage implements OnInit {

  constructor(
    private readonly languageModules: LanguageModuleService,
    public readonly theme: LanguageThemeService
  ) { }

  ngOnInit() {
    this.languageModules.loadSelectedModule().subscribe(module => {
      this.theme.applyManifestTheme(module.manifest);
    });
  }

}
