import React from 'react';
// import katex from 'katex';
// import 'katex/dist/katex.css';

import * as Subject from './Subject';
import useKodemoState, { DocumentSelectors } from '../hooks/useKodemoState';
import styled from 'styled-components';

const StyledContent = styled(Subject.Content)`
  font-size: 26px;
  height: 100%;

  .ko-subject-version {
    display: grid;
    place-items: center;
  }
`;

const MathSubject = (props) => {
  const subject = useKodemoState((state) => DocumentSelectors.subject(state, props.subjectId));
  const versionsRef = React.useRef([]);

  return (
    <StyledContent>
      {Object.entries(subject.versions).map(([id, version], i) => {
        return (
          <MathSubjectVersion
            key={id}
            versionId={id}
            value={version.value}
            ref={(el) => (versionsRef.current[i] = el)}
          />
        );
      })}
    </StyledContent>
  );
};

const MathSubjectVersion = React.forwardRef(({ value, versionId, ...props }, forwardRef) => {
  const pageElement = React.useRef(null);
  const currentEffect = useKodemoState((state) => state.currentEffect);

  React.useImperativeHandle(forwardRef, () => pageElement.current);

  const classes = ['ko-subject-version'];

  // Trigger math typesetting
  // TODO call this lazily when the code is first shown
  React.useEffect(() => {
    // katex.render(value, pageElement.current);

    return () => {
      pageElement.current.innerHTML = '';
    };
  }, []);

  if (currentEffect && currentEffect.version === versionId) {
    classes.push('active');
  }

  return <div className={classes.join(' ')} ref={pageElement} {...props}></div>;
});

export default MathSubject;
