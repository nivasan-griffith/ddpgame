import { Card } from './card';

describe('Card', () => {
  it('should create an instance', () => {
    expect(new Card('word', 'english', 'front.png', 'back.png', 'language.mp3', 'english.mp3')).toBeTruthy();
  });
});
