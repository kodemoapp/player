import styled from 'styled-components';
import useKodemoState, { DocumentSelectors } from '../hooks/useKodemoState';
import * as Subject from './Subject';

const StyledContent = styled(Subject.Content)`
  background: indigo;
  padding: 1rem;
`;

/**
 * This is an example of how to create a custom subject.
 */
export const AbstractSubject = (props) => {
  const subject = useKodemoState((state) => DocumentSelectors.subject(state, props.subjectId));

  return (
    <StyledContent {...props}>
      This is a custom subject with the following data: <pre>{JSON.stringify(subject, null, '  ')}</pre>
    </StyledContent>
  );
};
