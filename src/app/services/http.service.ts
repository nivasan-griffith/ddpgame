import { Injectable } from '@angular/core';

import { LanguageModuleService } from './language-module.service';

@Injectable({
  providedIn: 'root'
})
export class HttpService {
  constructor(private languageModules: LanguageModuleService) { }

  getSelectedLanguageModule() {
    return this.languageModules.loadSelectedModule();
  }
}
