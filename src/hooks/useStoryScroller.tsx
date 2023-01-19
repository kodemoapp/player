import anime from 'animejs';
import React from 'react';
import useKodemoState, { KodemoStateSelectors } from './useKodemoState';

const useStoryScroller = () => {
  const scrollTo = React.useCallback((newScrollTop: number) => {
    const state = useKodemoState.getState();
    const scrollTop = KodemoStateSelectors.scrollTop(state);
    const scrollContainer = KodemoStateSelectors.scrollContainer(state);

    const storyElement = document.querySelector('.ko-story') as HTMLElement;
    const playheadElement = document.querySelector('.ko-playhead') as HTMLElement;

    newScrollTop = Math.max(newScrollTop, 0);

    if (!scrollContainer || newScrollTop === scrollTop) return;

    scrollContainer.scrollTop = newScrollTop;

    if (storyElement) {
      const currentTranslateY = parseFloat(anime.get(storyElement, 'translateY') as string);

      anime.remove(storyElement);
      anime({
        targets: storyElement,
        translateY: [currentTranslateY + newScrollTop - scrollTop, 0],
        easing: 'easeInOutCubic',
        duration: 700,
      });

      if (playheadElement) {
        anime.remove(playheadElement);
        anime({
          targets: playheadElement,
          translateY: [-(currentTranslateY + newScrollTop - scrollTop), 0],
          easing: 'easeInOutCubic',
          duration: 700,
        });
      }
    }
  }, []);

  const scrollToAnchor = React.useCallback((id: string) => {
    const element = document.getElementById(id);
    if (element) {
      scrollTo(element.offsetTop - 10);
    }
  }, []);

  return {
    scrollTo,
    scrollToAnchor,
  };
};

export default useStoryScroller;
