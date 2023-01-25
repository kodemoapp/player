// @ts-nocheck

import { countLeadingWhitespace, diffCode } from './code';

describe('code utils', () => {
  test('countLeadingWhitespace', () => {
    expect(countLeadingWhitespace('value')).toBe(0);
    expect(countLeadingWhitespace(' value')).toBe(1);
  });

  test('diffCode', () => {
    const diffAddOneLine = diffCode(`a\nb`, `a\nb\nc`);
    expect(diffAddOneLine.addedLines).toEqual({ 3: true });
    expect(Object.values(diffAddOneLine.pairedLines)).toHaveLength(2);
    expect(Object.values(diffAddOneLine.removedLines)).toHaveLength(0);

    const diffRemoveOneLine = diffCode(`a\nb\nc`, `a\nc`);
    expect(Object.values(diffRemoveOneLine.addedLines)).toHaveLength(0);
    expect(Object.values(diffRemoveOneLine.pairedLines)).toHaveLength(2);
    expect(diffRemoveOneLine.removedLines).toEqual({ 2: true });

    const diffNoDifference = diffCode(`a\nb\nc`, `a\nb\nc`);
    expect(Object.values(diffNoDifference.addedLines)).toHaveLength(0);
    expect(Object.values(diffNoDifference.pairedLines)).toHaveLength(3);
    expect(Object.values(diffNoDifference.removedLines)).toHaveLength(0);
  });
});
