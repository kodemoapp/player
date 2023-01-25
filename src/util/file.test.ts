// @ts-nocheck

import { getExtensionFromFilename } from './file';

describe('file utils', () => {
  test('getExtensionFromFilename', () => {
    expect(getExtensionFromFilename('file.js')).toBe('js');
    expect(getExtensionFromFilename('file-final_v2.js')).toBe('js');
    expect(getExtensionFromFilename('åäö.xml')).toBe('xml');
  });
});
