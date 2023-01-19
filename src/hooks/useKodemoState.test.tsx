// @ts-nocheck

import React from 'react';
import { describe, test, expect } from 'vitest';
import { render, screen, renderHook } from '@testing-library/react';
import { KodemoPlayer, useKodemoState, Effect, KodemoStateSelectors, DOCUMENT_CHANGE_EVENT } from '../KodemoPlayer';
import testJSON from '../../docs/test.json';

const initialSubjectCount = Object.keys(testJSON.subjects).length;
const initialVersionCount = Object.keys(Object.values(testJSON.subjects)[0].versions).length;

describe('useKodemoState', () => {
  test('Initializes state with JSON', () => {
    render(<KodemoPlayer json={testJSON}></KodemoPlayer>);

    const { result } = renderHook(() => useKodemoState.getState());

    // Chec that the base state is correct
    expect(result.current.document).toBeDefined();
    expect(result.current.document.title).toEqual('Untitled');
    expect(Object.keys(result.current.document.subjects)).toHaveLength(initialSubjectCount);
  });

  test('Can add and remove subjects', () => {
    render(<KodemoPlayer json={testJSON}></KodemoPlayer>);

    const { result, rerender } = renderHook(() => useKodemoState.getState());

    // Add subject
    const addSubjectResult = renderHook(() =>
      useKodemoState.getState().addSubject({ type: 'code', value: '' }, { value: '' })
    );
    const addedSubjectId = addSubjectResult.result.current;

    rerender();

    // Subject was added
    expect(Object.keys(result.current.document.subjects)).toHaveLength(initialSubjectCount + 1);

    // Subject was added to index
    expect(result.current.document.subjectIndex).toHaveLength(initialSubjectCount + 1);
    expect(result.current.document.subjectIndex).toContain(addedSubjectId);

    // Remove subject
    renderHook(() => useKodemoState.getState().removeSubject(addedSubjectId));
    rerender();

    // Subject was removed
    expect(Object.keys(result.current.document.subjects)).toHaveLength(initialSubjectCount);
    expect(result.current.document.subjectIndex).toHaveLength(initialSubjectCount);
    expect(result.current.document.subjectIndex).not.toContain(addedSubjectId);

    // Remove all subjects
    renderHook(() => useKodemoState.getState().removeAllSubjects());
    rerender();

    expect(Object.keys(result.current.document.subjects)).toHaveLength(0);
    expect(result.current.document.subjectIndex).toHaveLength(0);
  });

  test('Can add and remove versions', () => {
    render(<KodemoPlayer json={testJSON}></KodemoPlayer>);

    const { result, rerender } = renderHook(() => useKodemoState.getState());
    const subjectId = Object.keys(result.current.document.subjects)[0];

    const subject = () => result.current.document.subjects[subjectId];

    expect(Object.keys(subject().versions)).toHaveLength(initialVersionCount);

    // Add version
    const addSubjectResult = renderHook(() => useKodemoState.getState().addSubjectVersion(subjectId));
    const addedSubjectVersionId = addSubjectResult.result.current;

    rerender();

    // Version was added
    expect(Object.keys(subject().versions)).toHaveLength(initialVersionCount + 1);
    expect(Object.keys(subject().versions)).toContain(addedSubjectVersionId);

    // Version removed to index
    expect(subject().versionIndex).toHaveLength(initialVersionCount + 1);
    expect(subject().versionIndex).toContain(addedSubjectVersionId);

    // Remove version
    renderHook(() => useKodemoState.getState().removeSubjectVersion(subjectId, addedSubjectVersionId));
    rerender();

    // Version was removed
    expect(Object.keys(subject().versions)).toHaveLength(initialVersionCount);
    expect(Object.keys(subject().versions)).not.toContain(addedSubjectVersionId);

    // Version removed to index
    expect(subject().versionIndex).toHaveLength(initialVersionCount);
    expect(subject().versionIndex).not.toContain(addedSubjectVersionId);
  });

  test('Can set current and preview effect', () => {
    render(<KodemoPlayer json={testJSON}></KodemoPlayer>);

    const effect1 = new Effect({ subject: 's1' });
    const effect2 = new Effect({ subject: 's2' });

    // set the actual effect
    let { result } = renderHook(() => {
      useKodemoState.getState().setCurrentEffect(effect1);
      return useKodemoState.getState();
    });
    expect(KodemoStateSelectors.currentEffect(result.current).id).toBe(effect1.id);

    // override with a preview effect
    const previewEffect2Result = renderHook(() => {
      useKodemoState.getState().setPreviewEffect(effect2);
      return useKodemoState.getState();
    });
    expect(KodemoStateSelectors.currentEffect(previewEffect2Result.result.current).id).toBe(effect2.id);

    // clear the preview effect
    const clearPreviewResult = renderHook(() => {
      useKodemoState.getState().clearPreviewEffect(effect2);
      return useKodemoState.getState();
    });
    expect(KodemoStateSelectors.currentEffect(clearPreviewResult.result.current).id).toBe(effect1.id);
  });

  test('Produces patches when document is changed', () => {
    render(<KodemoPlayer json={{}}></KodemoPlayer>);

    renderHook(() => {
      let patches = [];

      useKodemoState.getState().on(DOCUMENT_CHANGE_EVENT, (documentChange) => patches.push(...documentChange.patches));

      const addedSubjectId = useKodemoState.getState().addSubject({ type: 'code', value: '' }, { value: '' });
      useKodemoState.getState().removeSubject(addedSubjectId);

      expect(patches[0].op).toBe(`add`);
      expect(patches[0].value).toBeTypeOf('object');
      expect(patches[0].path.join('/')).toBe(`document/subjects/${addedSubjectId}`);

      expect(patches[1].op).toBe(`add`);
      expect(patches[1].value).toBe(addedSubjectId);
      expect(patches[1].path.join('/')).toBe(`document/subjectIndex/${0}`);

      expect(patches[2].op).toBe(`remove`);
      expect(patches[2].path.join('/')).toBe(`document/subjects/${addedSubjectId}`);

      // expect(patches[3].op).toBe(`remove`);
      // expect(patches[3].path.join('/')).toBe(`document/subjectIndex/${0}`);
    });
  });
});
