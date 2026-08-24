import { Quizoption } from './quizoption';

describe('Quizoption', () => {
  it('should create an instance', () => {
    expect(new Quizoption('audio.mp3', 'word')).toBeTruthy();
  });
});
