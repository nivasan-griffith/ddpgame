import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { addIcons } from 'ionicons';
import { IonButton, IonContent, IonPopover, IonIcon} from '@ionic/angular/standalone';
import { reloadOutline, arrowForward } from 'ionicons/icons';
import { getRegionDragDropGroups, LanguageModuleService, ResolvedLanguageWord } from 'src/app/services/language-module.service';
import { LanguageThemeService } from 'src/app/services/language-theme.service';
import { UtilsService } from 'src/app/services/utils.service';

interface DropTarget {
  word: ResolvedLanguageWord;
  droppedWord: ResolvedLanguageWord | null;
  imageUrl: string;
  placement: RegionPlacement;
}

interface Point {
  x: number;
  y: number;
}

// interface ShapeTemplate {
//   id: string;
//   name: string;
//   points: Point[];
// }

interface RegionPlacement {
  x: number;
  y: number;
  width: number;
  height: number;
}

// interface Region {
//   points: Point[];
// }


@Component({
  selector: 'app-drag-drop',
  templateUrl: './dragDrop.page.html',
  styleUrls: ['./dragDrop.page.scss'],
  standalone: true,
  imports: [CommonModule, IonButton, IonContent, IonPopover, IonIcon, RouterLink]
})

export class DragDropPage implements OnInit {
  targets: DropTarget[] = [];
  singleImageMode = false;
  isPopovertrueOpen = false;
  isPopoverfalseOpen = false;
  private roundWords: ResolvedLanguageWord[] = [];
  private wordBankWords: ResolvedLanguageWord[] = [];
  private draggedWord: ResolvedLanguageWord | null = null;
  selectedWord: ResolvedLanguageWord | null = null;
  private firstEntry = true;

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

    ionViewWillEnter(): void {
    if (this.firstEntry) {
      this.firstEntry = false;
      return;
    }
    this.loadRound();
  }

  /** Words not currently placed beneath a drawing. */
  get wordBank(): ResolvedLanguageWord[] {
    const placedIds = new Set(
      this.targets
        .filter(target => target.droppedWord)
        .map(target => target.droppedWord!.id)
    );
    return this.wordBankWords.filter(word => !placedIds.has(word.id));
  }

  get canCheck(): boolean {
    return this.targets.length > 0 && this.targets.every(target => target.droppedWord !== null);
  }

  dragStarted(event: DragEvent, word: ResolvedLanguageWord): void {
    this.selectWord(word);
    this.draggedWord = word;
    event.dataTransfer?.setData('text/plain', word.id);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

   selectWord(word: ResolvedLanguageWord): void {
    this.selectedWord = word;
    const sourceTarget = this.targets.find(target => target.droppedWord?.id === word.id);
    if (sourceTarget) sourceTarget.droppedWord = null;
  }

    placeSelectedWord(target: DropTarget): void {
    this.placeWord(target, this.selectedWord);
  }

  private pointInRegion(
    px: number, 
    py: number,
    placement: RegionPlacement
  ): boolean {
    return (
      px >= placement.x &&
      px <= placement.x + placement.width &&
      py >= placement.y &&
      py <= placement.y + placement.height
    );
  }


  private placeWord(target: DropTarget, word: ResolvedLanguageWord | null): void {
    if (!word) return;
    target.droppedWord = word;
    this.selectedWord = null;
  }

   singleImageClick(event: MouseEvent, imgEl: HTMLImageElement): void {
    const point = this.eventToNormalisedPoint(event, imgEl);
    if (!point) return;
    const target = this.targets.find(t => this.pointInRegion(point.x, point.y, t.placement));
    if (target) this.placeSelectedWord(target);
  }

  singleImageDrop(event: DragEvent, imgEl: HTMLImageElement): void {
    event.preventDefault();
    const point = this.eventToNormalisedPoint(event, imgEl);
    if (!point) return;

    const target = this.targets.find(t => this.pointInRegion(point.x, point.y, t.placement));

    if (target) this.placeWord(target, this.draggedWord);
    this.draggedWord = null;
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

  allowDrop(event: DragEvent): void {
    event.preventDefault();
  }

  dropWord(event: DragEvent, target: DropTarget): void {
    event.preventDefault();
    this.placeWord(target, this.draggedWord);
    this.draggedWord = null;
  }

  // check targets so labels don't overlap
  targetsTooClose(
    a: RegionPlacement,
    b: RegionPlacement
  ):  boolean {
    const ax = (a.x + a.width / 2) / 100;
    const ay = (a.y + a.height / 2) / 100;

    const bx = (b.x + b.width / 2) / 100;
    const by = (b.y + b.height / 2) / 100;

    const distance = Math.sqrt(
      Math.pow(ax - bx, 2) +
      Math.pow(ay - by, 2)
      );

    return distance < 0.20;
  }
    
  
  private loadRound(): void {
    this.isPopovertrueOpen = false;
    this.isPopoverfalseOpen = false;
    this.selectedWord = null;
    this.draggedWord = null;
    this.roundWords = [];
    this.wordBankWords = [];
    this.targets = [];
    this.singleImageMode = false;

    this.languageModules.loadSelectedModule().subscribe(module => {
      this.theme.applyManifestTheme(module.manifest);
      const sceneGroups = getRegionDragDropGroups(module.playableWords);
      if (sceneGroups.length > 0) {
        const scene = this.utils.shuffleArray([...sceneGroups])[0]; // to use all words instead of 4 at a time
        // const roundSize = Math.min(4, scene.length);

        const shuffledWords = this.utils.shuffleArray([...scene])
        const selectedWords: ResolvedLanguageWord[] = [];

        for (const word of shuffledWords) {
          if (!word.region) {
            continue;
          }

          const tooClose = selectedWords.some(selectedWord =>
          selectedWord.region && 
          this.targetsTooClose(word.region, selectedWord.region)
          );

          if(!tooClose) {
            selectedWords.push(word);
          } 

          if(selectedWords.length === 4) {
                  break;
          }

        }
        // const selectedWords = this.utils.shuffleArray([...scene]).slice(0, roundSize);
        this.singleImageMode = true;
        this.loadSingleImageRound(selectedWords);
        return;
      }

      this.loadMixAndMatchRound(module.playableWords);
    });
  }

  private loadMixAndMatchRound(words: ResolvedLanguageWord[]): void {
    const usableWords = words.filter(word => word.imageUrl !== null);
    this.roundWords = this.utils.shuffleArray([...usableWords]).slice(0, 4);
    this.targets = this.roundWords.map(word => ({
      word,
      droppedWord: null,
      imageUrl: word.imageUrl!,
      placement: { x: 0, y: 0, width: 1, height: 1 },
    }));
    this.wordBankWords = this.utils.shuffleArray([...this.roundWords]);
  }


  private loadSingleImageRound(words: ResolvedLanguageWord[]): void {
    this.targets = words.map(word => {
      const placement = this.toNormalizedPlacement(word.region!);

      return {
        word,
        droppedWord: null,
        imageUrl: word.imageUrl!,
        placement,
      };
    });
    this.roundWords = this.targets.map(target => target.word);
    this.wordBankWords = this.utils.shuffleArray([...this.roundWords]);
  }

private toNormalizedPlacement(region: {
  x: number;
  y: number;
  width: number;
  height: number;
}): RegionPlacement {
  return {
    x: region.x / 100,
    y: region.y / 100,
    width: region.width / 100,
    height: region.height / 100,
  };
}

  private eventToNormalisedPoint(event: MouseEvent | DragEvent, imgEl: HTMLImageElement): Point | null {
    const rect = imgEl.getBoundingClientRect();
    const naturalRatio = imgEl.naturalWidth / imgEl.naturalHeight;
    const boxRatio = rect.width / rect.height;
    let displayW = rect.width, displayH = rect.height, offsetX = 0, offsetY = 0;

    if (naturalRatio > boxRatio) {
      displayH = rect.width / naturalRatio;
      offsetY = (rect.height - displayH) / 2;
    } else {
      displayW = rect.height * naturalRatio;
      offsetX = (rect.width - displayW) / 2;
    }
    const localX = event.clientX - rect.left - offsetX;
    const localY = event.clientY - rect.top - offsetY;
    if (localX < 0 || localY < 0 || localX > displayW || localY > displayH) return null;
    return { x: localX / displayW, y: localY / displayH };
  }

}
