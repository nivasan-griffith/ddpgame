import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { IonContent, IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBack, arrowForward, infinite, volumeHighOutline } from 'ionicons/icons';
import { LanguageModuleService, ResolvedLanguageWord } from 'src/app/services/language-module.service';
import { UtilsService } from 'src/app/services/utils.service';
import { LanguageThemeService } from 'src/app/services/language-theme.service';

@Component({
  selector: 'app-flipcard',
  templateUrl: './flipcard.page.html',
  styleUrls: ['./flipcard.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent, RouterLink, IonIcon, IonButton],
  animations: [
    trigger('flipState', [
      state('active', style({ transform: 'rotateY(179deg)' })),
      state('inactive', style({ transform: 'rotateY(0)' })),
      transition('active => inactive', animate('500ms ease-out')),
      transition('inactive => active', animate('500ms ease-in'))
    ])
  ]
})
export class FlipcardPage implements OnInit {
  flip = 'inactive';
  cards: ResolvedLanguageWord[] = [];
  cardcount = 0;
  currentcard = 0;
  prevactive = true;
  nextactive = false;
  card: ResolvedLanguageWord | null = null;
  audionotplaying = true;
  private firstEntry = true;

  constructor(
    private languageModules: LanguageModuleService,
    public readonly theme: LanguageThemeService,
    private utils: UtilsService
  ) {
    addIcons({ volumeHighOutline, arrowForward, arrowBack, infinite });
  }

  ngOnInit(): void {
    this.loadCards();
  }

  ionViewWillEnter(): void {
    if (this.firstEntry) {
      this.firstEntry = false;
      return;
    }
    this.loadCards();
  }

  private loadCards(): void {
    this.languageModules.loadSelectedModule().subscribe(module => {
      this.theme.applyManifestTheme(module.manifest);
      const playableCards = module.playableWords.filter(word => word.image !== null);
      this.cards = this.utils.shuffleArray([...playableCards]);
      this.cardcount = this.cards.length;
      this.currentcard = 0;
      this.prevactive = true;
      this.nextactive = this.cardcount <= 1;
      this.setcurrentitem();
    });
  }

  toggleFlip(): void {
    this.flip = this.flip === 'inactive' ? 'active' : 'inactive';
  }

  get currentAudioUrl(): string | null {
    return this.flip === 'inactive'
      ? this.card?.englishAudioUrl ?? null
      : this.card?.languageAudioUrl ?? null;
  }

  get canSpeak(): boolean {
    return this.currentAudioUrl !== null;
  }

  speak(): void {
    const audioUrl = this.currentAudioUrl;
    if (!audioUrl || !this.audionotplaying) {
      return;
    }

    this.audionotplaying = false;
    const audio = new Audio(audioUrl);
    audio.onended = () => this.audionotplaying = true;
    audio.onerror = () => this.audionotplaying = true;
    audio.play().catch(() => this.audionotplaying = true);
  }

  next(): void {
    if (this.currentcard >= this.cardcount - 1) {
      return;
    }
    this.currentcard++;
    this.setcurrentitem();
    this.prevactive = this.currentcard === 0;
    this.nextactive = this.currentcard >= this.cardcount - 1;
  }

  previous(): void {
    if (this.currentcard <= 0) {
      return;
    }
    this.currentcard--;
    this.setcurrentitem();
    this.prevactive = this.currentcard === 0;
    this.nextactive = false;
  }

  hideImage(): void {
    if (this.card) {
      this.card.imageUrl = null;
    }
  }

  private setcurrentitem(): void {
    this.flip = 'inactive';
    this.card = this.cards[this.currentcard] ?? null;
  }
}
