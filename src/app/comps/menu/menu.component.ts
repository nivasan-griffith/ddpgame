import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { addIcons } from 'ionicons';
import {  IonMenu, IonContent, IonList, IonListHeader, IonNote, IonMenuToggle, IonItem, IonIcon, IonLabel,  IonRouterLink } from '@ionic/angular/standalone';
import { homeOutline,homeSharp,imagesOutline, imagesSharp,cardOutline,cardSharp,trashOutline,trashSharp,warningOutline,warningSharp,informationCircleOutline,informationCircleSharp} from 'ionicons/icons';
@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss'],
  standalone:true,
  imports:[CommonModule,IonMenu, IonContent, IonList, IonListHeader, IonNote, IonMenuToggle, IonItem, IonIcon, IonLabel,  IonRouterLink,RouterLink]
})
export class MenuComponent  implements OnInit {

  constructor() {
    addIcons({ cardOutline,cardSharp,trashOutline, trashSharp, warningOutline, warningSharp, informationCircleOutline, informationCircleSharp,imagesOutline, imagesSharp, homeOutline,homeSharp,});
   }
  public appPages = [ { title: 'Home', url: '/home', icon: 'home' },
    { title: 'Flip Card', url: '/games/flipcard', icon: 'images' },
    { title: 'Quiz', url: '/games/quiz', icon: 'card' },
    { title: 'About', url: '/about', icon: 'information-circle' },
   
  ];
  ngOnInit() {}

}
