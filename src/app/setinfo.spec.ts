import { SetInfo } from './setinfo';

describe('SetInfo', () => {
  it('should create an instance', () => {
    expect(new SetInfo('language', 'location', 'credits', [])).toBeTruthy();
  });
});
