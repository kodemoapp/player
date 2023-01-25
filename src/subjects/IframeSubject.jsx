import React from 'react';
import styled from 'styled-components';
import useKodemoState, { DocumentSelectors } from '../hooks/useKodemoState';
import { useInView } from 'react-intersection-observer';
import * as Subject from './Subject';

const StyledContent = styled(Subject.Content)`
  height: 100%;

  .content-wrapper {
    position: relative;
    width: 100%;
    height: 100%;
    border: 2vmin solid transparent;
    transform-origin: 0 0;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  iframe {
    position: absolute;
    object-fit: contain;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    grid-area: 1/1;
    border: 0;
    border-radius: ${({ theme }) => theme.rounding.m};
  }
`;

export const IframeSubject = React.forwardRef((props, forwardRef) => {
  const wrapperRef = React.useRef();
  const iframeRef = React.useRef();
  const subject = useKodemoState((state) => DocumentSelectors.subject(state, props.subjectId));
  const [inViewRef, inView] = useInView();

  const iframeData = Object.values(subject.versions)[0];
  const url = iframeData.value;

  React.useEffect(() => {
    if (inView) {
      if (typeof iframeData.width === 'number' && typeof iframeData.height === 'number') {
        const availableWidth = wrapperRef.current.parentNode.offsetWidth;
        const availableHeight = wrapperRef.current.parentNode.offsetHeight;
        const scale = Math.min(availableWidth / iframeData.width, availableHeight / iframeData.height);
        wrapperRef.current.style.width = iframeData.width + 'px';
        wrapperRef.current.style.height = iframeData.height + 'px';

        // Right now we only scale iframes down to fit, should we scale up?
        wrapperRef.current.style.transform = 'scale(' + Math.min(scale, 1) + ') translate(-50%, -50%)';
      } else {
        wrapperRef.current.style.width = '100%';
        wrapperRef.current.style.height = '100%';
        wrapperRef.current.style.transform = '';
      }
    }
  }, [inView, iframeData.width, iframeData.height]);

  return (
    <StyledContent {...props} ref={inViewRef}>
      <div className="content-wrapper" ref={wrapperRef}>
        <iframe src={url} ref={iframeRef} />
      </div>
    </StyledContent>
  );
});
