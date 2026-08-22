import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { LanguageModuleService } from '../services/language-module.service';

export const languageSelectionGuard: CanActivateFn = () => {
  const languageModules = inject(LanguageModuleService);
  const router = inject(Router);

  return languageModules.hasSelectedLanguage() ? true : router.createUrlTree(['/language-selection']);
};
