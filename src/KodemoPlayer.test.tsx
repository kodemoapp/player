// @ts-nocheck

import React from 'react';
import { describe, test, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { KodemoPlayer, useKodemoState } from './KodemoPlayer';
import testJSON from '../docs/test.json';

describe('KodemoPlayer', () => {
  test('Can render without JSON', () => {
    render(<KodemoPlayer></KodemoPlayer>);
    const headingText = screen.queryByText('Heading 1');
    expect(headingText).toBeNull(); // it doesn't exist
  });

  test('Can render with JSON', () => {
    render(<KodemoPlayer json={testJSON}></KodemoPlayer>);

    expect(screen.getByText('Heading 1')).toBeDefined();
  });
});
