import React from 'react';
import styled, { css } from 'styled-components';
import useKodemoState, { DocumentSelectors } from '../hooks/useKodemoState';

const StyledRoot = styled.div`
  height: 100%;
  display: none;
  position: relative;

  .ko-subject-version {
    width: 100%;
    height: 100%;
  }

  .ko-subject-version:not(.active) {
    visibility: hidden;
  }

  ${(props) =>
    props.active &&
    css`
      display: flex;
      flex-direction: column;
    `}
`;

const StyledContent = styled.div`
  position: relative;
  height: 100%;
`;

/**
 * This component wraps each individual subject.
 */
export function Root({ children, ...props }) {
  const subject = useKodemoState((state) => DocumentSelectors.subject(state, props.subjectId));
  const currentEffect = useKodemoState((state) => state.currentEffect);
  const active = currentEffect && currentEffect.subject === props.subjectId;

  if (subject) {
    return (
      <StyledRoot
        active={active}
        data-type={subject.type}
        className={`ko-subject ${active ? 'active' : ''}`}
        {...props}
      >
        {children}
      </StyledRoot>
    );
  } else {
    return <></>;
  }
}

export const Content = React.forwardRef((props, forwardRef) => {
  return <StyledContent ref={forwardRef} {...props}></StyledContent>;
});
