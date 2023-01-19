import { hasOpenModal } from '@kodemo/util';
import React from 'react';
import useKodemoConfig from './useKodemoConfig';
import useKodemoState, { KodemoStateEqualityFunctions, KodemoStateSelectors } from './useKodemoState';
import useStoryScroller from './useStoryScroller';

export default function usePagination({ bindKeys = false } = {}) {
  const keyboardPagination = useKodemoConfig((state) => state.keyboardPagination);
  const { scrollTo } = useStoryScroller();

  const scrollTop = useKodemoState(KodemoStateSelectors.scrollTop);
  const activeTimelineSegmentId = useKodemoState(KodemoStateSelectors.activeTimelineSegmentId);
  const segments = useKodemoState(
    KodemoStateSelectors.timelineSegments,
    KodemoStateEqualityFunctions.arrayLengthAndOrderById
  );

  // const hasPrevious = segments.length > 1 && activeTimelineSegmentId !== segments[0]?.id;
  const hasPrevious = scrollTop > 0;
  const hasNext = segments.length > 1 && activeTimelineSegmentId !== segments[segments.length - 1]?.id;

  /**
   * Paginate between timeline segments.
   *
   * @param {number} direction -1 for previous, 1 for next
   */
  const paginate = React.useCallback((direction = 1) => {
    const state = useKodemoState.getState();
    const segments = KodemoStateSelectors.timelineSegments(state);
    const activeTimelineSegmentId = KodemoStateSelectors.activeTimelineSegmentId(state);
    const playheadMeasurements = KodemoStateSelectors.playheadMeasurements(state);
    const storyMeasurements = KodemoStateSelectors.storyMeasurements(state);
    const dimensions = KodemoStateSelectors.dimensions(state);
    const scrollContainer = KodemoStateSelectors.scrollContainer(state);
    const scrollTop = KodemoStateSelectors.scrollTop(state);

    // Find the index of the active segment
    const currentIndex = segments.findIndex((segment) => segment.id === activeTimelineSegmentId);

    if (scrollContainer) {
      let nextIndex = currentIndex + direction;
      nextIndex = Math.max(Math.min(nextIndex, segments.length - 1), 0);

      let newScrollTop = currentIndex + direction < 0 ? 0 : segments[nextIndex]?.top || 0;
      newScrollTop = newScrollTop - playheadMeasurements.top + storyMeasurements.top;

      // Ensure that we don't scroll so far that the user misses any
      // of the story
      const maxScrollDistance = (dimensions.height - storyMeasurements.y) * 0.65;
      if (Math.abs(newScrollTop - scrollTop) > maxScrollDistance && Math.abs(nextIndex - currentIndex) === 1) {
        newScrollTop = scrollTop + maxScrollDistance * direction;
      }

      scrollTo(newScrollTop);
    }
  }, []);

  const previous = React.useCallback(() => paginate(-1), []);
  const next = React.useCallback(() => paginate(1), []);

  const handleKeyDown = React.useCallback((event: any) => {
    if (!event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey) {
      const targetIsInput = event.target.matches('input, textarea');
      const targetIsEditable = event.target.closest('[contenteditable]') !== null;

      if (!targetIsInput && !targetIsEditable && !hasOpenModal()) {
        if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
          event.preventDefault();
          previous();
        } else if (event.key === 'ArrowDown' || event.key === 'ArrowRight' || event.key === ' ') {
          event.preventDefault();
          next();
        }
      }
    }
  }, []);

  React.useEffect(() => {
    if (bindKeys && keyboardPagination) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return React.useMemo(() => ({ previous, next, hasPrevious, hasNext }), [previous, next, hasPrevious, hasNext]);
}
