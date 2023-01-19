import throttle from 'lodash/throttle';
import React from 'react';
import styled, { css, useTheme } from 'styled-components';
import useKodemoState, { KodemoStateEqualityFunctions, KodemoStateSelectors } from '../hooks/useKodemoState';

const StyledRoot = styled.aside`
  display: block;
  position: relative;
  width: var(--timeline-padded-width);
  flex-shrink: 0;

  @media only screen and ${(prop) => prop.theme.breakpoints.s} {
    right: auto;
    left: 0;
  }
`;

const activeSegmentStyles = css`
  background-color: ${(props) => props.theme.colors.active};
  transform: scale(1.2, 1);
`;

const StyledSegment = styled.div<{ active: boolean }>`
  position: absolute;
  display: block;
  width: var(--timeline-width);
  min-height: 10px;
  top: 0;
  left: calc((var(--timeline-padded-width) - var(--timeline-width)) / 2);
  background: ${({ theme }) => theme.colors.bgInactiveEffect};
  border-radius: var(--timeline-width);
  transition: transform 0.2s ease, background-color 0.2s ease;
  transform: scale(0.8, 1);

  &:before {
    content: '';
    display: block;
    position: absolute;
    width: 100%;
    height: 100%;
    padding: calc(var(--timeline-padded-width) * 0.33);
    margin: calc(var(--timeline-padded-width) * -0.33);
  }

  &:hover {
    ${activeSegmentStyles}
  }

  ${(props) => props.active && activeSegmentStyles}
`;

const StyledPlayhead = styled.div`
  position: sticky;
  border: ${(prop) => prop.theme.timelinePlayheadSize / 2}px solid transparent;
  border-right-color: ${(prop) => prop.theme.colors.bgSubjects};
  opacity: 0;
`;

export function Root(props: any) {
  const { updateTimelineSegments } = useKodemoState.getState();

  const layoutComplete = useKodemoState((state) => state.layoutComplete);
  const segments = useKodemoState(KodemoStateSelectors.timelineSegments);
  const segmentsOrder = useKodemoState(
    KodemoStateSelectors.timelineSegments,
    KodemoStateEqualityFunctions.arrayLengthAndOrderById
  );
  const scrollTop = useKodemoState(KodemoStateSelectors.scrollTop);
  const storyMeasurements = useKodemoState(KodemoStateSelectors.storyMeasurements);
  const storyContentMeasurements = useKodemoState(KodemoStateSelectors.storyContentMeasurements);
  const dimensions = useKodemoState(KodemoStateSelectors.dimensions);
  const playheadFixedTop = useKodemoState(KodemoStateSelectors.playheadFixedTop);
  const activeTimelineSegmentId = useKodemoState(KodemoStateSelectors.activeTimelineSegmentId);

  // Used (sparingly) to force a re-render of all timeline segments
  const [segmentInvalidation, invalidateSegments] = React.useState(0);

  const theme = useTheme();
  const timelineRef = React.useRef<HTMLElement>(null);
  const playheadRef = React.useRef<HTMLDivElement>(null);

  const playheadPosition = React.useRef(0);

  // Changing the active effect is a performance intense operation
  // so we throttle it and make sure to only apply a new effect
  // when it has actually changed
  const updateActiveEffect = React.useCallback(
    throttle(() => {
      const state = useKodemoState.getState();
      const segments = KodemoStateSelectors.timelineSegments(state);
      const scrollTop = KodemoStateSelectors.scrollTop(state);
      const top = scrollTop + playheadPosition.current;
      const firstSegmentOffset = theme.timelinePlayheadSize;

      const segment = segments.find((segment) => {
        if (typeof segment.bottom === 'number') {
          return top < segment.bottom;
        } else {
          return false;
        }
      });

      if (segment && typeof segment.top === 'number') {
        // If we scroll above the first segment
        if (segment === segments[0] && top < segment.top - firstSegmentOffset) {
          state.setCurrentEffect(null);
        }
        // If we're overlapping a segment which isn't already selected
        else if (segment.effect !== state.currentEffect) {
          // Never select invisible segments
          if (typeof segment.bottom === 'number' && segment.bottom - segment.top > 0) {
            state.setCurrentEffect(segment.effect);
          }
        }
      }
    }, 100),
    []
  );

  /**
   * Moves the playhead DOM element to the current position.
   */
  const updatePlayheadPosition = React.useCallback(() => {
    let parentOffsetY = 0;

    if (timelineRef.current) {
      let storyElement = timelineRef.current.closest('.ko-story') as HTMLElement;
      if (storyElement) {
        parentOffsetY = storyElement.offsetTop;
      }
    }

    if (playheadRef.current) {
      playheadRef.current.style.opacity = '1';
      playheadRef.current.style.top = Math.round(parentOffsetY + playheadPosition.current) + 'px';
    }
  }, []);

  /**
   * Calculate the bottom position of each segment. Changes to
   * bottom position are persisted in global timeline state.
   */
  React.useEffect(() => {
    let segmentsDataMap = [];
    let bottom = timelineRef.current!.offsetHeight;

    // Update the state for any segments that have changed
    for (let i = segments.length - 1; i >= 0; i--) {
      const segment = segments[i];
      if (segment.bottom !== bottom) {
        segmentsDataMap.push({ id: segment.id, data: { bottom } });
      }

      if (typeof segment.top === 'number') {
        bottom = segment.top - theme.timelineSegmentSpacing;
      }
    }

    if (segmentsDataMap.length) {
      // Manually invalidate our segments when their measurements
      // change to trigger a check for which segment that should
      // currently be active
      invalidateSegments(segmentInvalidation + 1);

      // Update segments in state
      updateTimelineSegments(segmentsDataMap);
    }
  }, [segments, dimensions, storyContentMeasurements]);

  /**
   * Calculates the placement of our playhead and updates the
   * currently active segment.
   */
  React.useEffect(() => {
    if (layoutComplete) {
      if (segments.length) {
        if (typeof segments[0].bottom !== 'number' || isNaN(segments[0].bottom)) {
          return;
        }
      }

      // Calculate our ideal placement for the playhead
      const offsetTop = storyMeasurements?.top || 0;
      let newValue = Math.min((dimensions.height - offsetTop) * 0.1, 75);

      if (typeof playheadFixedTop === 'number') {
        newValue = playheadFixedTop;
      }

      // If the first segment is above the playhead, move up the
      // playhead to make it reachable
      if (segments.length) {
        const firstSegmentBottom = (segments[0].bottom || 0) - theme.timelinePlayheadSize;

        if (firstSegmentBottom < newValue) {
          // Move the playhead up by the smallest amount possible
          newValue += Math.min(scrollTop + firstSegmentBottom - newValue, 0);
        }
      }

      const positionHasChanged = playheadPosition.current !== newValue;

      // Apply the new playhead position
      if (positionHasChanged) {
        playheadPosition.current = newValue;
        updatePlayheadPosition();
      }

      // Store the playhead measurements in state
      if (positionHasChanged || !useKodemoState.getState().playheadMeasurements) {
        if (playheadRef.current) {
          useKodemoState.setState({ playheadMeasurements: playheadRef.current.getBoundingClientRect() });
        }
      }

      // Update the active effect (this is throttled)
      updateActiveEffect();
    }
  }, [
    segmentInvalidation,
    segmentsOrder,
    activeTimelineSegmentId,
    scrollTop,
    dimensions,
    playheadFixedTop,
    storyMeasurements?.top,
    layoutComplete,
  ]);

  return (
    <StyledRoot ref={timelineRef}>
      <Playhead ref={playheadRef} style={{ visibility: segments.length === 0 ? 'hidden' : 'visible' }}></Playhead>
      {props.children
        ? props.children
        : segmentsOrder.map(({ id }: { id: string }) => {
            return <Segment key={id} segmentId={id} />;
          })}
    </StyledRoot>
  );
}

export const Playhead = React.forwardRef<HTMLDivElement, any>((props, ref) => {
  return <StyledPlayhead ref={ref} className="ko-playhead" {...props}></StyledPlayhead>;
});

export const Segment = React.memo<any>((props: { segmentId: string }) => {
  const { setPreviewEffect, clearPreviewEffect } = useKodemoState.getState();
  const segment = useKodemoState((state) => KodemoStateSelectors.timelineSegment(state, props.segmentId));
  const activeTimelineSegmentId = useKodemoState(KodemoStateSelectors.activeTimelineSegmentId);

  if (segment) {
    const active = activeTimelineSegmentId === segment.id;
    const height = Math.max((segment.bottom || 0) - (segment.top || 0), 0);

    if (height > 0) {
      return (
        <StyledSegment
          active={active}
          className="ko-timeline-segment"
          onMouseOver={() => setPreviewEffect(segment.effect, { delay: 50 })}
          onMouseOut={() => clearPreviewEffect(segment.effect, { delay: 100 })}
          style={{
            top: `${segment.top}px`,
            height: `${height}px`,
          }}
          {...props}
        ></StyledSegment>
      );
    }
  }
});
