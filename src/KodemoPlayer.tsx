import { theme as defaultTheme, Theme, KodemoMenu, Tooltip, Toast, NotificationsProvider } from '@kodemo/util';
import merge from 'lodash/merge';
import throttle from 'lodash/throttle';
import React, { ReactNode } from 'react';
import styled, { css, ThemeProvider } from 'styled-components';

import PlayerFooter from './components/PlayerFooter';
import Pagination from './components/Pagination';
import SubjectType from './enum/SubjectType';
import KodemoLayout from './enum/KodemoLayout';
import useKodemoConfig, { extendKodemoConfig, IKodemoConfigPartial } from './hooks/useKodemoConfig';
import useKodemoState, { DocumentSelectors, KodemoDocument, KodemoStateSelectors } from './hooks/useKodemoState';
import usePagination from './hooks/usePagination';
import useUpdateEffect from './hooks/useUpdateEffect';
import { Subject } from './subjects';
import * as Story from './view/Story';
import * as Subjects from './view/Subjects';
import * as Timeline from './view/Timeline';
import useStoryScroller from './hooks/useStoryScroller';

export * from './data/CodeHighlights';
export * from './data/Effect';
export * from './data/TimelineSegment';
export * from './hooks/useKodemoConfig';
export * from './hooks/useKodemoState';
export * from './subjects';
export * from './util/file';
export { generateSubjectID, generateVersionID, getOrderedCollectionAsEntries } from './util/util';
export * as Story from './view/Story';
export * as Subjects from './view/Subjects';
export * as Timeline from './view/Timeline';
export {
  useKodemoState,
  useKodemoConfig,
  useUpdateEffect,
  useStoryScroller,
  Pagination,
  PlayerFooter,
  SubjectType,
  KodemoLayout,
  Subject,
  Root,
};

declare module 'styled-components' {
  export interface DefaultTheme {
    timelinePlayheadSize: number;
    timelineSegmentSpacing: number;
  }
}

export const createTheme = (overrideTheme: any) => {
  return merge({}, defaultTheme, overrideTheme, {
    timelinePlayheadSize: 18,
    timelineSegmentSpacing: 20,
  });
};

const StyledRoot = styled.div<{
  layout: KodemoLayout;
}>`
  --ko-story-padding-h: ${(props) => props.theme.storyPaddingH}px;
  --ko-story-padding-v: ${(props) => props.theme.storyPaddingV}px;
  --timeline-padded-width: 2.5em;
  --timeline-width: 8px;

  display: grid;
  grid-template-columns: minmax(500px, 1.25fr) 5fr;
  width: var(--ko-width, 100%);
  height: var(--ko-height, 100%);
  overflow: auto;
  overflow-x: hidden;
  line-height: 1.6;
  font-size: 16px;
  position: relative;
  font-family: -apple-system, BlinkMacSystemFont, Helvetica Neue, sans-serif;
  background-color: ${(props) => props.theme.colors.bgStory};
  color: ${(props) => props.theme.colors.text};

  &,
  * {
    box-sizing: border-box;
  }

  button {
    border: 0;
    cursor: pointer;
    font-family: inherit;
    font-size: inherit;
  }

  // We use cypress for E2E testing, unfortunately it ends up causing
  // the site to scroll in places that wehre it isn't normally possible
  &[data-environment='e2e'] {
    overflow: hidden;
  }
  &[data-environment='e2e'] > * {
    overflow: hidden;
  }
  &[data-environment='e2e'] .ko-story {
    padding-bottom: 0 !important;
  }

  ${(props: any) =>
    props.layout === KodemoLayout.FULL &&
    css`
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
    `}

  @media only screen and ${(props) => props.theme.breakpoints.l} {
    --ko-story-padding-h: ${(props) => props.theme.storyPaddingH * 0.66}px;
    grid-template-columns: minmax(400px, 2fr) 5fr;
    --timeline-padded-width: 2em;
  }

  @media only screen and ${(props) => props.theme.breakpoints.m} {
    --ko-story-padding-h: ${(props) => props.theme.storyPaddingH / 2}px;
    --ko-story-padding-v: ${(props) => props.theme.storyPaddingV / 2}px;
    --timeline-width: 6px;
    --timeline-padded-width: 2.4em;
    font-size: 14px;
    grid-template-columns: minmax(320px, 2fr) 5fr;
  }

  @media only screen and ${(props) => props.theme.breakpoints.s} {
    grid-template-columns: none;
    margin-top: 0vh;
    padding-top: ${(props) => props.theme.subjectsMobileHeight};
  }
`;

export const StoryWrapper = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;

  @media only screen and ${(props) => props.theme.breakpoints.s} {
    .ko-menu {
      position: fixed;
      top: auto;
      bottom: 0;
    }
  }
`;

type KodemoPlayerProps = {
  /**
   * The document that we want to render. This document will automatically
   * render as soon as the player is mounted.
   */
  json?: KodemoDocument;

  theme?: Theme;

  /**
   * An optional menu element to render as part of the player.
   */
  menu?: ReactNode;

  /**
   * Used to adjust the behavior of the player in different environments.
   * Setting this to e2e will apply styling to combat a few Cypress
   * scroll quirks.
   */
  environment?: 'e2e';

  /**
   * The width of the player in pixels. Requires layout to be 'responsive'.
   */
  width?: number;

  /**
   * The height of the player in pixels. Requires layout to be 'responsive'.
   */
  height?: number;

  /**
   * The scroll top position to start from when the player is first mounted.
   */
  scrollTop?: number;

  /**
   * Change the player layout. By default, the player will cover the full
   * viewport but you can use this setting to make the player responsive.
   */
  layout?: KodemoLayout;

  children?: React.ReactNode;
  style?: any;
} & IKodemoConfigPartial;

type KodemoPlayerRootProps = {
  children: any;
  style?: any;
} & KodemoPlayerProps;

function Root({
  children,
  environment,
  width,
  height,
  layout = KodemoLayout.FULL,
  style,
  ...props
}: KodemoPlayerRootProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const scrolledRef = React.useRef(false);
  const { setScrollContainer, setScrollTop, setDimensions, setOffset } = useKodemoState.getState();
  const dimensions = useKodemoState(KodemoStateSelectors.dimensions);
  const offset = useKodemoState(KodemoStateSelectors.offset);
  const layoutComplete = useKodemoState((state) => state.layoutComplete);

  const hasExplicitSize = typeof width === 'number' && typeof height === 'number';

  usePagination({ bindKeys: true });

  const updateSize = React.useCallback(() => {
    // 1. Use the full size layout if configured
    if (layout === KodemoLayout.FULL) {
      setDimensions({
        width: typeof window !== 'undefined' ? window.innerWidth : 1000,
        height: typeof window !== 'undefined' ? window.innerHeight : 700,
      });
    }
    // 2. Otherwise look for an explicit width & height
    else if (hasExplicitSize) {
      setDimensions({
        width,
        height,
      });
    }
    // 3. Finally fall back on sizing the player to fit its container
    else {
      if (ref.current && ref.current.parentNode) {
        setDimensions({
          width: (ref.current.parentNode as HTMLElement).offsetWidth,
          height: (ref.current.parentNode as HTMLElement).offsetHeight,
        });
      }
    }
  }, [width, height, hasExplicitSize]);

  const handleResize = React.useCallback(
    throttle(() => {
      if (ref.current) {
        const rootBounds = ref.current?.getBoundingClientRect();
        setOffset({
          x: rootBounds.x,
          y: rootBounds.y,
        });

        updateSize();
      }
    }, 1000 / 10),
    []
  );

  const handleScroll = React.useCallback(
    throttle(() => {
      if (ref.current) {
        const newTop = Math.max(ref.current.scrollTop, 0);
        const newScrolled = newTop > 0;
        // We intentionally ignore negative overflow scroll to avoid
        // deselecting the first timeline segment
        setScrollTop(newTop);

        // Flag to the DOM that we are scrolled down
        if (scrolledRef.current != newScrolled) {
          scrolledRef.current = newScrolled;
          ref.current.setAttribute('data-scrolled', newScrolled.toString());
        }
      }
    }, 1000 / 60), // this needs to fire very frequently for UI to remain in sync
    []
  );

  React.useEffect(() => {
    const scrollContainer = ref.current!;

    setScrollContainer(scrollContainer);

    window.addEventListener('resize', handleResize, { passive: true });
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });

    handleResize();
    handleScroll();

    return () => {
      window.removeEventListener('resize', handleResize);
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Sets an appropriate initial scroll position. Order of priority:
  // 1. Hash link
  // 2. scrollTop prop
  // 3. Reset to 0
  React.useEffect(() => {
    if (layoutComplete) {
      let scrollPosition = 0;

      if (typeof props.scrollTop === 'number' && !isNaN(props.scrollTop)) {
        scrollPosition = props.scrollTop;
      }

      // If there is a hash, scroll it into view now that layout is
      // complete
      const hash = window.location.hash;
      if (hash) {
        const element = document.getElementById(hash.substring(1));
        if (element) {
          element.scrollIntoView();
        } else if (ref.current) {
          ref.current.scrollTop = scrollPosition;
        }
      } else if (ref.current) {
        ref.current.scrollTop = scrollPosition;
      }
    }
  }, [layoutComplete]);

  return (
    <StyledRoot
      ref={ref}
      className="ko-player"
      style={{
        '--ko-height': dimensions.height + 'px',
        '--ko-width': dimensions.width + 'px',
        '--ko-offset-x': offset.x + 'px',
        '--ko-offset-y': offset.y + 'px',
        ...style,
      }}
      layout={layout}
      data-environment={environment}
    >
      {children}
    </StyledRoot>
  );
}

export interface IPlayerRendererProps {
  /**
   * Slot for an optional menu element that should be added next
   * to the story.
   */
  menu?: ReactNode;
}

function PlayerRenderer({ menu }: IPlayerRendererProps) {
  return (
    <>
      <StoryWrapper>
        <>
          {menu}
          <Story.Root>
            <Story.Content></Story.Content>
            <Timeline.Root></Timeline.Root>
          </Story.Root>
        </>
      </StoryWrapper>
      <Subjects.Root>
        <Subjects.Header></Subjects.Header>
        <Subjects.Content></Subjects.Content>
      </Subjects.Root>
    </>
  );
}

export interface IKodemoPlayer {
  getScrollTop: () => number;
}

export const KodemoPlayer = React.forwardRef<IKodemoPlayer, KodemoPlayerProps>(
  ({ json, theme, children, ...props }, forwardRef) => {
    const doc = useKodemoState(DocumentSelectors.document);
    const setDocument = useKodemoState((state) => state.setDocument);
    const currentJSON = React.useRef<any>(null);
    const { scrollTo } = useStoryScroller();

    // Set the document if it has changed. This is done synchronously
    // to allow for SSR.
    if (currentJSON.current !== json && typeof json === 'object') {
      currentJSON.current = json;
      setDocument(json);
    }

    // API
    React.useImperativeHandle(forwardRef, () => ({
      scrollTo: (top: number) => scrollTo(top),
      getScrollTop: () => useKodemoState.getState().scrollTop,
    }));

    React.useEffect(() => {
      extendKodemoConfig({ ...props });
    }, [props]);

    // If a custom renderer is provided, pass props to it
    const childrenWithProps = React.Children.map(children, (child) => {
      if (React.isValidElement(child)) {
        return React.cloneElement(child, { ...props });
      }
      return child;
    });

    if (doc) {
      return (
        <ThemeProvider theme={() => createTheme(theme)}>
          <Tooltip.Provider>
            <Toast.Provider>
              <NotificationsProvider>
                <Root {...props}>{childrenWithProps || <PlayerRenderer {...props}></PlayerRenderer>}</Root>
              </NotificationsProvider>
              <Toast.Viewport />
            </Toast.Provider>
          </Tooltip.Provider>
        </ThemeProvider>
      );
    } else {
      return <></>;
    }
  }
);
