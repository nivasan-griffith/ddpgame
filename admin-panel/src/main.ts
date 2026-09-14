import { bootstrapApplication } from '@angular/platform-browser';
import { APP_INITIALIZER } from '@angular/core';
import { AppComponent } from './app/app.component';
import { AppConfigService } from './app/services/app-config.service';

const loadAppConfig = (config: AppConfigService) => () => config.load();

bootstrapApplication(AppComponent, {
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: loadAppConfig,
      deps: [AppConfigService],
      multi: true,
    },
  ],
}).catch(error => console.error(error));
