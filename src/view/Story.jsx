import { getBoundingClientRelativeToParent, getOffsetRelativeToParent, theme } from '@kodemo/util';
import React from 'react';
import styled, { useTheme } from 'styled-components';
import { Effect } from '../data/Effect';
import { TimelineSegment } from '../data/TimelineSegment';
import useKodemoState, {
  DocumentSelectors,
  KodemoStateEqualityFunctions,
  KodemoStateSelectors,
} from '../hooks/useKodemoState';
import useStoryScroller from '../hooks/useStoryScroller';

const StyledRoot = styled.div`
  position: relative;
`;

const StyledRootInner = styled.div`
  display: flex;
  position: relative;
`;

export const INLINE_STYLES = {
  code: {
    fontFamily: "Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace",
    overflowWrap: 'break-word',
    fontSize: '0.95em',
    color: '#444',
  },
  link: {
    color: theme.colors.link,
    textDecoration: 'underline',
    '&:hover': {
      color: theme.colors.linkOver,
    },
  },
};

const StyledContentBase = styled.article`
  position: relative;
  padding-top: var(--ko-story-padding-v);
  padding-left: var(--ko-story-padding-h);
  flex-grow: 1;
  word-break: break-word;

  h1,
  h2,
  h3,
  h4,
  h5,
  h6,
  p,
  div[data-block='true'],
  ul,
  ol,
  blockquote {
    margin: 0;
    margin-top: 1em;
  }

  h1:first-child,
  h2:first-child,
  h3:first-child,
  p:first-child,
  div:first-child {
    margin-top: 0;
  }

  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    line-height: 1.3;
    margin-top: 1.5em;
  }

  h1 {
    font-size: 2em;
  }

  h2 {
    font-size: 1.5em;
    font-weight: 600;
  }

  h3 {
    font-size: 1.25em;
    font-weight: 500;
  }

  h4,
  h5,
  h6 {
    font-size: 1em;
    font-weight: 500;
  }

  blockquote {
    font-style: italic;
    border-left: 4px solid #eee;
    padding-left: 1rem;
  }

  ul,
  ol {
    padding-left: 1.5em;
  }

  ul li,
  ol li {
    margin-left: 0;
  }

  ul li li,
  ul ol li,
  ul li ol,
  ul ol ol {
    margin-left: 0;
  }

  ul * + li,
  ol * + li {
    margin-top: 0.5rem;
  }

  ul ul,
  ul ol,
  ol ul,
  ol ol {
    margin-top: 0.5rem;
  }

  [id] {
    position: relative;
    scroll-margin-top: calc(var(--ko-offset-y) + var(--ko-story-padding-v));
  }

  .ko-anchor {
    position: absolute;
    right: 100%;
    top: 50%;
    line-height: 1;
    padding-right: 0.5rem;
    transform: translateY(-50%);
    font-size: 18px;
    font-weight: normal;
    text-decoration: none;
    color: ${(props) => props.theme.colors.textVeryFaded};
    opacity: 0;
  }

  .ko-anchor:hover {
    opacity: 1;
    color: ${({ theme }) => theme.colors.active};
  }

  [id]:hover > .ko-anchor {
    opacity: 1;
  }

  span[data-effect-id] {
    line-height: 1;
  }

  span[data-effect-id]:not([data-effect-type='invisible']) {
    background-color: ${({ theme }) => theme.colors.bgInactiveEffect};
    cursor: default;
    padding: 1px 4px;
    margin: -1px 0;
    border-radius: 2px;
  }

  span[data-effect-id]:not([data-effect-type='invisible']):hover,
  span[data-effect-id]:not([data-effect-type='invisible']).active,
  span[data-effect-id]:not([data-effect-type='invisible']).editing {
    background-color: ${(props) => props.theme.colors.active};
    color: #fff;

    span {
      color: #fff;
    }
  }

  &:after {
    content: '';
    display: block;
    position: absolute;
    width: var(--timeline-width);
    padding: 1px;
    height: 100%;
    margin: -2px;
    top: 0;
    right: calc(var(--ko-story-padding-h) * -0.5);
    z-index: -1;
  }

  @media only screen and ${(prop) => prop.theme.breakpoints.s} {
    padding-right: 0;
    font-size: 16px; /* 16px is significant because it prevents iOS from zooming in when focusing an input */

    h1 {
      font-size: 1.5em;
    }

    h2 {
      font-size: 1.25em;
      font-weight: 600;
    }

    h3 {
      font-size: 1em;
      font-weight: 500;
    }
  }
`;

export const StyledContent = styled(StyledContentBase)({
  code: INLINE_STYLES.code,
  a: INLINE_STYLES.link,
});

export function Root({ children, ...props }) {
  const storyRef = React.useRef(null);
  const storyInnerRef = React.useRef(null);

  const playheadMeasurements = useKodemoState(KodemoStateSelectors.playheadMeasurements);
  const scrollContainer = useKodemoState(KodemoStateSelectors.scrollContainer);
  const playerDimensions = useKodemoState(KodemoStateSelectors.dimensions);
  const playerOffset = useKodemoState(KodemoStateSelectors.offset);
  const story = useKodemoState(DocumentSelectors.story);
  const segmentsOrder = useKodemoState(
    KodemoStateSelectors.timelineSegments,
    KodemoStateEqualityFunctions.arrayLengthAndOrderById
  );

  const theme = useTheme();

  // Calculate how much we need to be able to overscroll
  // in order to reach the last timeline segment
  React.useEffect(() => {
    const lastSegment = segmentsOrder[segmentsOrder.length - 1];
    if (lastSegment) {
      const viewportHeight = playerDimensions.height + playerOffset.y;
      const padding = viewportHeight - (playheadMeasurements?.top || 0) - theme.timelinePlayheadSize;

      storyRef.current.style.paddingBottom = Math.max(padding, 0) + 'px';
    } else {
      storyRef.current.style.paddingBottom = '';
    }

    // Once we have calculated scroll padding, flag that player layout is complete
    if (!useKodemoState.getState().layoutComplete) {
      useKodemoState.setState({ layoutComplete: true });
    }
  }, [segmentsOrder, playheadMeasurements?.top, playerDimensions, playerOffset?.y]);

  // Calculate story bounding box (including scroll padding)
  React.useEffect(() => {
    useKodemoState.setState({
      storyMeasurements: getBoundingClientRelativeToParent(
        storyRef.current,
        scrollContainer?.parentNode || scrollContainer
      ),
    });
  }, [playerDimensions, theme.storyPaddingH, theme.storyPaddingV]);

  // Calculate story content bounding box (excluding scroll padding)
  React.useEffect(() => {
    useKodemoState.setState({
      storyContentMeasurements: getBoundingClientRelativeToParent(
        storyInnerRef.current,
        scrollContainer?.parentNode || scrollContainer
      ),
    });
  }, [playerDimensions, theme.storyPaddingH, theme.storyPaddingV, story]);

  return (
    <StyledRoot className="ko-story" ref={storyRef} {...props}>
      <StyledRootInner ref={storyInnerRef}>{children}</StyledRootInner>
    </StyledRoot>
  );
}

export function Content(props) {
  const { documentCycle, registerTimelineSegments, unregisterTimelineSegments, setPreviewEffect, clearPreviewEffect } =
    useKodemoState.getState();
  const story = useKodemoState(DocumentSelectors.story);
  const ref = React.useRef(null);
  const { scrollToAnchor } = useStoryScroller();

  function handleMouseOver(event) {
    const effectElement = event.target.closest('[data-effect-id]:not([data-effect-type="invisible"])');
    if (effectElement && event.target.nodeName === 'SPAN') {
      setPreviewEffect(Effect.fromHTMLElement(event.target), { delay: 50 });
    }
  }

  function handleMouseOut(event) {
    const effectElement = event.target.closest('[data-effect-id]:not([data-effect-type="invisible"])');
    if (effectElement && event.target.nodeName === 'SPAN') {
      clearPreviewEffect(Effect.fromHTMLElement(event.target));
    }
  }

  /**
   * Generate a clickable anchor element for each heading.
   */
  const generateAnchors = React.useCallback(() => {
    ref.current
      .querySelectorAll(
        'h1:not(.ko-has-anchor), h2:not(.ko-has-anchor), h3:not(.ko-has-anchor), h4:not(.ko-has-anchor), h5:not(.ko-has-anchor), h6:not(.ko-has-anchor)'
      )
      .forEach((element) => {
        const anchor = document.createElement('a');
        anchor.className = 'ko-anchor';
        anchor.href = '#' + element.id;
        anchor.innerHTML = '#';
        element.appendChild(anchor);

        // Smooth scroll to the anchor
        anchor.addEventListener('click', (event) => {
          event.preventDefault();
          history.replaceState(null, null, anchor.href);
          scrollToAnchor(element.id);
        });

        element.classList.add('ko-has-anchor');
      });
  }, []);

  React.useEffect(() => {
    const effectElements = ref.current.querySelectorAll('[data-effect-id]');
    const segments = Array.from(effectElements).map((effectElement) => {
      return new TimelineSegment({
        effect: Effect.fromHTMLElement(effectElement),
        measure: () => ({ top: getOffsetRelativeToParent(effectElement, ref.current).y }),
      });
    });

    generateAnchors();

    registerTimelineSegments(segments);

    return () => {
      unregisterTimelineSegments(segments);
    };
  }, [story, documentCycle]);

  return (
    <StyledContent
      ref={ref}
      className="ko-story-content"
      onMouseOver={(e) => handleMouseOver(e)}
      onMouseOut={(e) => handleMouseOut(e)}
      dangerouslySetInnerHTML={{ __html: story }}
    ></StyledContent>
  );
}
