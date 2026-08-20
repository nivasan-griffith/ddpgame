import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { IonContent, IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBack, arrowForward, infinite, volumeHighOutline } from 'ionicons/icons';
import { LanguageModuleService, ResolvedLanguageWord } from 'src/app/services/language-module.service';
import { UtilsService } from 'src/app/services/utils.service';

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
  isword = true;
  cards: ResolvedLanguageWord[] = [];
  cardcount = 0;
  currentcard = 0;
  prevactive = true;
  nextactive = false;
  card: ResolvedLanguageWord | null = null;
  audionotplaying = true;

  constructor(private languageModules: LanguageModuleService, private utils: UtilsService) {
    addIcons({ volumeHighOutline, arrowForward, arrowBack, infinite });
  }

  ngOnInit(): void {
    this.languageModules.loadSelectedModule().subscribe(module => {
      this.cards = this.utils.shuffleArray([...module.words]);
      this.cardcount = this.cards.length;
      this.setcurrentitem();
    });
  }

  toggleFlip(): void {
    this.flip = this.flip === 'inactive' ? 'active' : 'inactive';
  }

  speak(): void {
    const audioUrl = this.flip === 'inactive' ? this.card?.englishAudioUrl : this.card?.languageAudioUrl;
    if (!audioUrl || (!this.audionotplaying && this.flip === 'active')) {
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
    this.isword = !this.card?.languageAudioUrl;
  }
}
