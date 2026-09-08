import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { addIcons } from 'ionicons';
import {  IonMenu, IonContent, IonList, IonListHeader, IonNote, IonMenuToggle, IonItem, IonIcon, IonLabel,  IonRouterLink } from '@ionic/angular/standalone';
import { homeOutline,homeSharp,imagesOutline, imagesSharp,cardOutline,cardSharp,trashOutline,trashSharp,warningOutline,warningSharp,informationCircleOutline,informationCircleSharp,languageOutline,languageSharp} from 'ionicons/icons';
@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss'],
  standalone:true,
  imports:[CommonModule,IonMenu, IonContent, IonList, IonListHeader, IonNote, IonMenuToggle, IonItem, IonIcon, IonLabel,  IonRouterLink,RouterLink]
})
export class MenuComponent {

  constructor() {
    addIcons({ cardOutline,cardSharp,trashOutline, trashSharp, warningOutline, warningSharp, informationCircleOutline, informationCircleSharp,imagesOutline, imagesSharp, homeOutline,homeSharp,languageOutline,languageSharp,});
   }
  public appPages = [ { title: 'Home', url: '/home', icon: 'home' },
    { title: 'Languages', url: '/language-selection', icon: 'language', queryParams: { configure: true } },
    { title: 'Flip Card', url: '/games/flipcard', icon: 'images' },
    { title: 'Quiz', url: '/games/quiz', icon: 'card' },
    { title: 'About', url: '/about', icon: 'information-circle' },
   
  ];
}
