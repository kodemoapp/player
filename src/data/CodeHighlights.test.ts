// @ts-nocheck

import { CodeHighlights } from './CodeHighlights';

describe('CodeHighlights', () => {
  test('fromString', () => {
    expect(CodeHighlights.fromString('1-2, 4, 6-7').toString()).toBe('1-2, 4, 6-7');
    expect(CodeHighlights.fromString('0, 4').toArray()).toEqual([true, undefined, undefined, undefined, true]);
  });

  test('toggleLines', () => {
    const highlights = new CodeHighlights();

    highlights.toggleLines(3, 4);
    highlights.toggleLines(9, 10);
    expect(highlights.toString()).toBe('3-4, 9-10');

    highlights.toggleLines(3, 4);
    expect(highlights.toString()).toBe('9-10');

    highlights.deactivateLines(9, 9);
    expect(highlights.toString()).toBe('10');
  });
});
