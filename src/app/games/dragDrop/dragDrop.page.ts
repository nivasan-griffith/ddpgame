import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { addIcons } from 'ionicons';
import { IonButton, IonContent, IonPopover, IonIcon} from '@ionic/angular/standalone';
import { reloadOutline, arrowForward } from 'ionicons/icons';
import { LanguageModuleService, ResolvedLanguageWord } from 'src/app/services/language-module.service';
import { LanguageThemeService } from 'src/app/services/language-theme.service';
import { UtilsService } from 'src/app/services/utils.service';

interface DropTarget {
  word: ResolvedLanguageWord;
  droppedWord: ResolvedLanguageWord | null;
}

@Component({
  selector: 'app-drag-drop',
  templateUrl: './dragDrop.page.html',
  styleUrls: ['./dragDrop.page.scss'],
  standalone: true,
  imports: [CommonModule, IonButton, IonContent, IonPopover, IonIcon, RouterLink]
})

export class DragDropPage implements OnInit {
  targets: DropTarget[] = [];
  isPopovertrueOpen = false;
  isPopoverfalseOpen = false;
  private roundWords: ResolvedLanguageWord[] = [];
  private draggedWord: ResolvedLanguageWord | null = null;
  selectedWord: ResolvedLanguageWord | null = null;

  constructor(
    private languageModules: LanguageModuleService,
    public readonly theme: LanguageThemeService,
    private utils: UtilsService
  ) {
    addIcons({ reloadOutline, arrowForward });
  }

  ngOnInit(): void {
    this.loadRound();
  }

  /** Words not currently placed beneath a drawing. */
  get wordBank(): ResolvedLanguageWord[] {
    const placedIds = new Set(
      this.targets
        .filter(target => target.droppedWord)
        .map(target => target.droppedWord!.id)
    );
    return this.roundWords.filter(word => !placedIds.has(word.id));
  }

  get canCheck(): boolean {
    return this.targets.length === 4 && this.targets.every(target => target.droppedWord !== null);
  }

  dragStarted(event: DragEvent, word: ResolvedLanguageWord): void {
    this.selectWord(word);
    this.draggedWord = word;
    event.dataTransfer?.setData('text/plain', word.id);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  allowDrop(event: DragEvent): void {
    event.preventDefault();
  }

  dropWord(event: DragEvent, target: DropTarget): void {
    event.preventDefault();
    this.placeWord(target, this.draggedWord);
    this.draggedWord = null;
  }

  selectWord(word: ResolvedLanguageWord): void {
    this.selectedWord = word;
    const sourceTarget = this.targets.find(target => target.droppedWord?.id === word.id);
    if (sourceTarget) sourceTarget.droppedWord = null;
  }

  placeSelectedWord(target: DropTarget): void {
    this.placeWord(target, this.selectedWord);
  }

  private placeWord(target: DropTarget, word: ResolvedLanguageWord | null): void {
    if (!word) return;
    target.droppedWord = word;
    this.selectedWord = null;
  }

  checkAnswers(): void {
    if (!this.canCheck) return;

    const allCorrect = this.targets.every(target => target.droppedWord?.id === target.word.id);
    if (allCorrect) {
      this.isPopovertrueOpen = true;
      new Audio('assets/audio/clapping.mp3').play().catch(() => undefined);
    } else {
      this.isPopoverfalseOpen = true;
  }
  }

  restartRound(): void {
    this.isPopovertrueOpen = false;
    this.isPopoverfalseOpen = false;

    //clear the dragged words from the pictures
    this.targets.forEach(target => {
      target.droppedWord = null;
    });

    this.selectedWord = null;
  }


  nextRound(): void {
    this.isPopovertrueOpen = false;
    this.selectedWord = null;
    this.draggedWord = null;
    this.loadRound();
  }


  private loadRound(): void {
    this.languageModules.loadSelectedModule().subscribe(module => {
      this.theme.applyManifestTheme(module.manifest);
      const usableWords = module.playableWords.filter(word => word.imageUrl !== null);
      this.roundWords = this.utils.shuffleArray([...usableWords]).slice(0, 4);
      this.targets = this.roundWords.map(word => ({ word, droppedWord: null }));
    });
  }
}
