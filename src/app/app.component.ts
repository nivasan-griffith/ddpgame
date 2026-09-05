import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { IonApp, IonSplitPane, IonRouterOutlet} from '@ionic/angular/standalone';
import { MenuComponent } from './comps/menu/menu.component';
import { LanguageModuleService } from './services/language-module.service';
import { LanguageThemeService } from './services/language-theme.service';


@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [ CommonModule, IonApp, IonSplitPane, IonRouterOutlet,MenuComponent],
})
export class AppComponent implements OnInit {
  constructor(
    private readonly languageModules: LanguageModuleService,
    private readonly languageTheme: LanguageThemeService
  ) {}

  ngOnInit(): void {
    this.languageModules.loadSelectedModule().subscribe({
      next: module => this.languageTheme.applyManifestTheme(module.manifest),
      error: () => this.languageTheme.applyDefaultTheme()
    });
  }
}
