import { Component, OnInit } from '@angular/core';
import { CommonModule, NgFor } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonPopover, IonRadioGroup, IonRadio, IonList, IonItem, IonContent, IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBack, arrowForward, volumeHighOutline } from 'ionicons/icons';
import { LanguageModuleService, ResolvedLanguageWord } from 'src/app/services/language-module.service';
import { UtilsService } from 'src/app/services/utils.service';

@Component({
  selector: 'app-quiz',
  templateUrl: './quiz.page.html',
  styleUrls: ['./quiz.page.scss'],
  standalone: true,
  imports: [CommonModule, NgFor, FormsModule, IonPopover, IonRadioGroup, IonRadio, IonList, IonItem, IonContent, RouterLink, IonIcon, IonButton]
})
export class QuizPage implements OnInit {
  quiz: ResolvedLanguageWord[] = [];
  cards: ResolvedLanguageWord[] = [];
  question: ResolvedLanguageWord | null = null;
  currentquestion = 0;
  prevactive = true;
  nextactive = false;
  options: ResolvedLanguageWord[] = [];
  isPopovertrueOpen = false;
  isPopoverfalseOpen = false;
  radval = '';
  private firstEntry = true;

  constructor(private languageModules: LanguageModuleService, private utils: UtilsService) {
    addIcons({ volumeHighOutline, arrowForward, arrowBack });
  }

  ngOnInit(): void {
    this.loadQuestions();
  }

  ionViewWillEnter(): void {
    if (this.firstEntry) {
      this.firstEntry = false;
      return;
    }
    this.loadQuestions();
  }

  private loadQuestions(): void {
    this.languageModules.loadSelectedModule().subscribe(module => {
      const playableCards = module.playableWords.filter(word => word.image !== null);
      this.cards = playableCards;
      this.quiz = this.utils.shuffleArray([...playableCards]);
      this.currentquestion = 0;
      this.prevactive = true;
      this.configureQuestion();
      this.nextactive = this.quiz.length <= 1;
    });
  }

  speak(audioUrl: string | null): void {
    if (!audioUrl) {
      return;
    }
    const audio = new Audio(audioUrl);
    audio.play().catch(() => undefined);
  }

  next(): void {
    this.clearpopover();
    if (this.currentquestion >= this.quiz.length - 1) {
      return;
    }
    this.currentquestion++;
    this.configureQuestion();
    this.prevactive = this.currentquestion === 0;
    this.nextactive = this.currentquestion >= this.quiz.length - 1;
  }

  previous(): void {
    this.clearpopover();
    if (this.currentquestion <= 0) {
      return;
    }
    this.currentquestion--;
    this.configureQuestion();
    this.prevactive = this.currentquestion === 0;
    this.nextactive = false;
  }

  clearpopover(): void {
    this.isPopovertrueOpen = false;
    this.isPopoverfalseOpen = false;
  }

  itemSelected(event: { detail: { value: string } }): void {
    if (event.detail.value === this.question?.word) {
      this.isPopovertrueOpen = true;
      const audio = new Audio('assets/audio/clapping.mp3');
      audio.play().catch(() => undefined);
    } else {
      this.isPopoverfalseOpen = true;
    }
  }

  hideImage(): void {
    if (this.question) {
      this.question.imageUrl = null;
    }
  }

  private configureQuestion(): void {
    this.radval = '';
    this.question = this.quiz[this.currentquestion] ?? null;
    if (!this.question) {
      this.options = [];
      return;
    }

    const distractors = this.utils.shuffleArray(
      this.cards.filter(word => word.id !== this.question?.id)
    ).slice(0, 3);
    this.options = this.utils.shuffleArray([...distractors, this.question]);
  }
}
