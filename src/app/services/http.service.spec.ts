import { TestBed } from '@angular/core/testing';

import { HttpService } from './http.service';
import { LanguageModuleService } from './language-module.service';

describe('HttpService', () => {
  let service: HttpService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: LanguageModuleService, useValue: { loadSelectedModule: () => undefined } }
      ]
    });
    service = TestBed.inject(HttpService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
