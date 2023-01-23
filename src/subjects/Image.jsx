import { Slider, SubjectToolbar, theme, Tooltip, useIsSsr, WhiteButton } from '@kodemo/util';
import { EyeClosedIcon, EyeOpenIcon } from '@radix-ui/react-icons';
import anime from 'animejs';
import React from 'react';
import { useInView } from 'react-intersection-observer';
import styled, { css } from 'styled-components';
import useKodemoConfig from '../hooks/useKodemoConfig';
import useKodemoState, { DocumentSelectors, KodemoStateSelectors } from '../hooks/useKodemoState';
import { drawRoundedRect, getOrderedCollectionAsEntries } from '../util/util';
import * as Subject from './Subject';

const ImageToolbar = styled(SubjectToolbar.Root)`
  transition: opacity 0.14s ease;
  opacity: 0.5;

  ${(props) => props.active && 'opacity: 1;'}

  &:hover {
    opacity: 1;
  }
`;
const ImageToolbarContent = SubjectToolbar.Content;

const StyledRevealMarker = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 2px;
  height: 100%;
  background-color: ${(props) => props.theme.colors.bgSubjects};
  background-image: linear-gradient(180deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.2) 100%);
  border-radius: 4px;
  z-index: 3;
  cursor: ew-resize;
  transition: opacity 0.3s ease;
  opacity: ${(props) => (props.visible ? 1 : 0)};

  &:after {
    content: '';
    position: absolute;
    top: 0;
    left: -9px;
    width: 20px;
    height: 100%;
    background-color: transparent;
  }
`;

const StyledRevealLabel = styled.div`
  position: absolute;
  z-index: 4;
  color: rgba(255, 255, 255, 0.5);
  background: rgba(8, 8, 12, 0.3);
  border-radius: 4px;
  padding: 4px 8px;
  text-transform: uppercase;
  font-size: 11px;
  margin: 0rem;
  top: 0;
  left: 0;
  pointer-events: none;
  transition: opacity 0.4s ease, transform 0.4s ease;
  transform: translateX(${(props) => (props.visible ? 0 : -15)}px);
  opacity: ${(props) => (props.visible ? 1 : 0)};

  ${(props) =>
    props.align === 'right' &&
    css`
      left: auto;
      right: 0;
      transform: translateX(${(props) => (props.visible ? 0 : 15)}px);
    `}
`;

const StyledContent = styled(Subject.Content)`
  position: absolute;
  top: 2vmin;
  right: 2vmin;
  bottom: 2vmin;
  left: 2vmin;
  height: auto;

  &:hover + .ko-image-toolbar {
    opacity: 1;
  }
`;

const StyledVersion = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  overflow: hidden;
  display: grid;
  place-items: center;
  opacity: 0;
  transition: transform 0.5s ease, opacity 0.2s ease, visibility 0.2s ease;
  background-color: ${(props) => props.theme.colors.bgSubjects};

  &.past {
    transform: translateX(-50px);
  }

  &.future {
    transform: translateX(50px);
  }

  &.previous.is-comparing {
    z-index: 1;
    opacity: 1;
    transform: none;
    transition: none;
    visibility: visible !important;
  }

  &.active {
    z-index: 2;
    transform: none;
    opacity: 1;
    transition: transform 0.5s ease, opacity 0.5s ease, visibility 0.5s ease;
    box-shadow: 0 0 0 2vmin ${(props) => props.theme.colors.bgSubjects};
  }

  .ko-image-wrapper {
    position: relative;
  }

  img {
    position: absolute;
    object-fit: contain;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    grid-area: 1/1;
  }

  canvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
    opacity: 0;
    transition: opacity 0.25s ease;
  }

  &.active canvas.animate-in {
    opacity: 1;
  }
`;

const ImageSubject = React.forwardRef((props, forwardRef) => {
  const subject = useKodemoState((state) => DocumentSelectors.subject(state, props.subjectId));
  const currentEffect = useKodemoState(KodemoStateSelectors.currentEffect);

  const [previousVersionId, setPreviousVersionId] = React.useState(null);
  const [activeVersionId, setActiveVersionId] = React.useState(null);

  // The amount of the previous version that is currently visible,
  // as a percentage of the width of the subject
  const [revealPercent, setRevealPercent] = React.useState(null);

  const [cursor, setCursor] = React.useState(null);
  const [dragging, setDragging] = React.useState(false);

  const contentRef = React.useRef(null);
  const versionsRef = React.useRef({});
  const compareImagesEnabled = useKodemoConfig((state) => state.compareImages);

  // We allow image comparisons if
  // - we're not editing
  // - it's enabled in the Kodemo config
  // - th's enabled (not opted out of) in the document json
  // - there is a previous version to compare to
  const canCompareVersions = !props.editing && compareImagesEnabled && subject.compare !== false && previousVersionId;

  const isComparingVersions = canCompareVersions && revealPercent !== null;
  const hasRevealedAnyPercent = isComparingVersions && revealPercent > 0;

  React.useEffect(() => {
    if (subject && currentEffect && currentEffect.subject === props.subjectId) {
      const versionKeys = Object.keys(subject.versions);

      // Fallback to the first version if the current version is not found
      let newActiveVersionId =
        versionKeys.indexOf(currentEffect.version) === -1 ? versionKeys[0] : currentEffect.version;

      setActiveVersionId(newActiveVersionId);

      // Are we stepping between two versions of this subject?
      if (newActiveVersionId !== activeVersionId) {
        setPreviousVersionId(activeVersionId);
        setRevealPercent(null);
      }
    } else {
      // Forget previous version when subject is deselected
      setPreviousVersionId(null);
    }
  }, [subject?.versions, currentEffect?.subject, currentEffect?.version, props.subjectId]);

  React.useEffect(() => {
    setRevealPercent(null);
  }, [currentEffect?.subject, currentEffect?.version, currentEffect?.payload]);

  React.useImperativeHandle(forwardRef, () => ({
    getActiveVersion: () => versionsRef.current[activeVersionId],
  }));

  const handleMouseDown = React.useCallback(
    (event) => {
      if (canCompareVersions && !event.target.closest('.ko-image-toolbar')) {
        event.preventDefault();
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        handleMouseMove(event);
        setCursor('ew-resize');
        setDragging(true);
      }
    },
    [previousVersionId]
  );

  const handleMouseMove = React.useCallback((event) => {
    event.preventDefault();
    const bounds = contentRef.current.getBoundingClientRect();
    setRevealPercent(Math.max(Math.min((event.clientX - bounds.x) / bounds.width, 1), 0) * 100);
  }, []);

  const handleMouseUp = React.useCallback((event) => {
    event.preventDefault();
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    setCursor(null);
    setDragging(false);
  }, []);

  const clipStyle = React.useMemo(() => {
    if (revealPercent !== null) {
      return {
        clipPath: `inset(-1px -1px -1px ${revealPercent}%)`,
      };
    }
  }, [revealPercent]);

  return (
    <>
      <StyledContent
        className={'ko-image-content'}
        onMouseDown={handleMouseDown}
        {...props}
        ref={contentRef}
        style={{ cursor }}
        isComparingVersions={isComparingVersions && revealPercent > 1 && revealPercent < 99}
      >
        {canCompareVersions && (
          <>
            <StyledRevealLabel visible={hasRevealedAnyPercent && revealPercent > 10}>Before</StyledRevealLabel>
            <StyledRevealLabel visible={(hasRevealedAnyPercent || dragging) && revealPercent < 90} align="right">
              After
            </StyledRevealLabel>
            <StyledRevealMarker
              visible={(hasRevealedAnyPercent && revealPercent < 100) || dragging}
              style={{ left: revealPercent + '%' }}
            />
          </>
        )}

        {Object.entries(subject.versions).map(([id, version], i) => {
          return (
            <ImageVersion
              key={id}
              versionId={id}
              subjectId={props.subjectId}
              subject={subject}
              version={version}
              active={activeVersionId === id}
              isPreviousVersion={previousVersionId === id}
              isComparingVersions={isComparingVersions}
              editing={props.editing}
              style={activeVersionId === id && isComparingVersions ? clipStyle : null}
              ref={(el) => (versionsRef.current[id] = el)}
            />
          );
        })}
      </StyledContent>

      {canCompareVersions && (
        <ImageToolbar className="ko-image-toolbar" active={isComparingVersions}>
          <ImageToolbarContent autoWidth={true}>
            <Slider.Default
              width={320}
              value={[revealPercent]}
              onValueChange={(value) => setRevealPercent(value[0])}
              step={0.5}
              variant="dark"
            />

            <Tooltip.Tip text={hasRevealedAnyPercent ? 'Show current version' : 'Show previous version'}>
              <WhiteButton
                onClick={(event) => {
                  event.preventDefault();
                  if (hasRevealedAnyPercent) {
                    setRevealPercent(null);
                  } else {
                    setRevealPercent(100);
                  }
                }}
              >
                {hasRevealedAnyPercent ? <EyeOpenIcon /> : <EyeClosedIcon />}
              </WhiteButton>
            </Tooltip.Tip>
          </ImageToolbarContent>
        </ImageToolbar>
      )}
    </>
  );
});

const ImageVersion = React.forwardRef(
  (
    { active, isPreviousVersion, isComparingVersions, value, subject, version, subjectId, versionId, ...props },
    forwardRef
  ) => {
    const ssr = useIsSsr();
    const dimensions = useKodemoState(KodemoStateSelectors.dimensions);
    const currentEffect = useKodemoState(KodemoStateSelectors.currentEffect);

    const wrapperRef = React.useRef();
    const imageRef = React.useRef();
    const canvasRef = React.useRef();
    const contextRef = React.useRef();

    const wasInViewRef = React.useRef(false);
    const [inViewRef, inView] = useInView();

    const [naturalImageSize, setNaturalImageSize] = React.useState({ width: 0, height: 0 });
    const [availableBounds, setAvailableBounds] = React.useState({ x: 0, y: 0, width: 0, height: 0 });
    const [imageBounds, setImageBounds] = React.useState({ x: 0, y: 0, width: 0, height: 0 });
    const [dpr] = React.useState(ssr ? 1 : window.devicePixelRatio);

    const [highlightRect, setHighlightRect] = React.useState();
    const animatedHighlightRect = React.useRef(null);

    const handleImageLoaded = React.useCallback(() => {
      setNaturalImageSize({ width: imageRef.current.naturalWidth, height: imageRef.current.naturalHeight });
    });

    const paintHighlightRect = () => {
      if (!inView || !animatedHighlightRect.current || !canvasRef.current) return;

      const context = contextRef.current;
      const width = canvasRef.current.width;
      const height = canvasRef.current.height;
      const lineWidth = 8;

      const rect = {
        x: animatedHighlightRect.current.x * imageBounds.width * dpr,
        y: animatedHighlightRect.current.y * imageBounds.height * dpr,
        width: animatedHighlightRect.current.width * imageBounds.width * dpr,
        height: animatedHighlightRect.current.height * imageBounds.height * dpr,
      };

      rect.x += (imageBounds.x - availableBounds.x) * dpr;
      rect.y += (imageBounds.y - availableBounds.y) * dpr;

      context.clearRect(0, 0, width, height);

      // Fill the whole canvas with semi-transparent black
      context.fillStyle = theme.colors.bgHighlightOverlay;
      context.fillRect(0, 0, width, height);

      // Cut out the highlight rect
      context.save();
      drawRoundedRect(context, rect.x, rect.y, rect.width, rect.height, lineWidth);
      context.globalCompositeOperation = 'destination-out';
      context.fillStyle = '#000';
      context.fill();
      context.restore();

      // Draw a stroke around the highlight rect
      context.lineWidth = lineWidth;
      context.strokeStyle = '#fff';
      context.stroke();
    };

    React.useEffect(() => {
      // Will fail in testing context
      contextRef.current = canvasRef.current.getContext('2d');
      contextRef.current.scale(dpr, dpr);
    }, []);

    React.useEffect(() => {
      if (currentEffect && currentEffect.subject === subjectId) {
        setHighlightRect(currentEffect.getImageHighlights()[0]);
      } else if (highlightRect) {
        setHighlightRect(null);
      }
    }, [currentEffect?.subject, currentEffect?.payload]);

    // Keep track of the natural image size
    React.useEffect(() => {
      // Prefer an explicit width/height from the document data
      if (typeof version.width === 'number' && typeof version.height === 'number') {
        setNaturalImageSize({ width: version.width, height: version.height });
      }
      // ... fall back on measuring
      else {
        if (imageRef.current.complete) {
          handleImageLoaded();
        } else {
          imageRef.current.addEventListener('load', handleImageLoaded);
        }
      }

      return () => imageRef.current && imageRef.current.removeEventListener('load', handleImageLoaded);
    }, [imageRef.current]);

    // Resize the image to fit the available space
    React.useEffect(() => {
      if (inView) {
        const availableBounds = wrapperRef.current.parentNode.getBoundingClientRect();

        const ratio = Math.min(
          availableBounds.width / naturalImageSize.width,
          availableBounds.height / naturalImageSize.height
        );

        wrapperRef.current.style.maxWidth = naturalImageSize.width + 'px';
        wrapperRef.current.style.maxHeight = naturalImageSize.height + 'px';

        wrapperRef.current.style.width = naturalImageSize.width * ratio + 'px';
        wrapperRef.current.style.height = naturalImageSize.height * ratio + 'px';

        canvasRef.current.width = availableBounds.width * dpr;
        canvasRef.current.height = availableBounds.height * dpr;

        setAvailableBounds(availableBounds);
        setImageBounds(imageRef.current.getBoundingClientRect());
      }

      wasInViewRef.current = inView;
    }, [inView, naturalImageSize.width, naturalImageSize.height, dimensions.width, dimensions.height]);

    React.useEffect(() => {
      anime.remove(animatedHighlightRect.current);

      // Only animate if we're in view
      if (inView && highlightRect) {
        // If there is no prior highlight rect, paint the new
        // rect immediately
        if (animatedHighlightRect.current === null || props.editing) {
          animatedHighlightRect.current = { ...highlightRect };
          paintHighlightRect();
        }
        // ... otherwise animate to the new rect
        else {
          anime({
            targets: animatedHighlightRect.current,
            easing: 'easeInOutQuint',
            duration: 750,
            update: paintHighlightRect,

            x: highlightRect.x,
            y: highlightRect.y,
            width: highlightRect.width,
            height: highlightRect.height,
            right: highlightRect.right,
            bottom: highlightRect.bottom,
          });

          paintHighlightRect();
        }
      }
      // If the highlight rect is removed, we should not use it
      // as a start point for any future animation
      else {
        animatedHighlightRect.current = null;
      }
    }, [inView, highlightRect]);

    React.useEffect(() => {
      paintHighlightRect();
    }, [imageBounds]);

    React.useImperativeHandle(forwardRef, () => ({
      getImageElement: () => imageRef.current,
      setHighlightRect,
    }));

    const className = ['ko-subject-version'];

    // Are we the active subject?
    if (subject && currentEffect && currentEffect.subject === subjectId) {
      const orderedVersions = getOrderedCollectionAsEntries(subject.versions, subject.versionIndex);
      const versionKeys = orderedVersions.map(([id]) => id);
      const thisVersionIndex = versionKeys.indexOf(versionId);
      const activeVersionIndex = versionKeys.indexOf(currentEffect.version);

      if (active) {
        className.push('active');
      } else if (activeVersionIndex !== -1 && activeVersionIndex !== thisVersionIndex) {
        if (thisVersionIndex > activeVersionIndex) {
          className.push('future');
        } else {
          className.push('past');
        }
      }
    }

    if (isPreviousVersion) {
      className.push('previous');

      if (isComparingVersions) {
        className.push('is-comparing');
      }
    }

    return (
      <StyledVersion ref={inViewRef} className={className} {...props}>
        <canvas ref={canvasRef} className={highlightRect ? 'animate-in' : ''}></canvas>
        <div className="ko-image-wrapper" ref={wrapperRef}>
          <img src={version.value} ref={imageRef} />
        </div>
      </StyledVersion>
    );
  }
);

export default ImageSubject;
