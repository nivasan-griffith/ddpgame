import { Routes } from '@angular/router';
import { languageSelectionGuard } from './language-selection/language-selection.guard';


export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },

  {
    path: 'games/flipcard',
    loadComponent: () => import('./games/flipcard/flipcard.page').then( m => m.FlipcardPage)
  },
  {
    path: 'home',
    canActivate: [languageSelectionGuard], //Add language selection guard to home route
    loadComponent: () => import('./home/home.page').then( m => m.HomePage)
  },

  {
    path: 'language-selection', 
    loadComponent: () => import('./language-selection/language-selection.page').then( m => m.LanguageSelectionPage)
  },

  {
    path: 'games/quiz',
    loadComponent: () => import('./games/quiz/quiz.page').then( m => m.QuizPage)
  },

  {
    path: 'about',
    loadComponent: () => import('./about/about.page').then( m => m.AboutPage)
  },
  {
    path: 'access-code',
    loadComponent: () => import('./access-code/access-code.page').then(m => m.AccessCodePage)
  },
 
];
