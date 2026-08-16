import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonContent, IonButton, IonIcon } from '@ionic/angular/standalone';
import { LanguageModuleService } from 'src/app/services/language-module.service';


@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [IonIcon, IonButton, RouterLink,IonContent,  CommonModule, FormsModule]
})
export class HomePage implements OnInit {
  languageName = '';
  constructor(private languageModules: LanguageModuleService) { }

  ngOnInit() {
    this.languageModules.loadSelectedModule().subscribe(module => {
      this.languageName = module.manifest.name;
    });
  }

}
