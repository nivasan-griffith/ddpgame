import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { LanguageManifest, LanguageThemeAssets, LanguageThemeTokens } from './language-module.service';

@Injectable({ providedIn: 'root' })
export class LanguageThemeService {
  private readonly defaultTokens: LanguageThemeTokens = {
    primaryBackground: '#f7edd9',
    buttonBackground: '#5b6e5b',
    buttonText: '#ffffff',
    primaryText: '#1d281d',
    linkHover: '#8a4b2d',
    accent: '#8a4b2d',
    surface: '#fff8ed'
  };
  private readonly defaultAssets: LanguageThemeAssets = {
    hero: 'assets/icon/icon-only.png',
    topLeftTrim: 'assets/corneronly.png',
    bottomRightTrim: 'assets/corneronly.png',
    navigationIcon: 'assets/dots-maroon.png',
    bulletIcon: 'assets/dot.png',
    successIcon: 'assets/accent.png',
    retryIcon: 'assets/accent.png'
  };
  private assets: LanguageThemeAssets = this.defaultAssets;

  constructor(@Inject(DOCUMENT) private readonly document: Document) {}

  applyManifestTheme(manifest: LanguageManifest): void {
    const tokens = { ...this.defaultTokens, ...manifest.theme?.tokens };
    this.assets = { ...this.defaultAssets, ...manifest.theme?.assets };
    const style = this.document.documentElement.style;

    style.setProperty('--primary-bg', tokens.primaryBackground);
    style.setProperty('--button-bg', tokens.buttonBackground);
    style.setProperty('--button-text', tokens.buttonText);
    style.setProperty('--primary-text', tokens.primaryText);
    style.setProperty('--link-hover', tokens.linkHover);
    style.setProperty('--theme-accent', tokens.accent);
    style.setProperty('--theme-surface', tokens.surface);
    style.setProperty('--theme-bullet-icon', `url("${this.assets.bulletIcon}")`);
  }

  asset(name: keyof LanguageThemeAssets): string {
    return this.assets[name];
  }

  applyDefaultTheme(): void {
    this.applyManifestTheme({
      id: 'default',
      name: 'Default',
      version: '1.0.0',
      data: '',
      games: [],
      theme: { tokens: this.defaultTokens, assets: this.defaultAssets }
    });
  }
}
