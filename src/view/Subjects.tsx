import React from 'react';
import styled, { css } from 'styled-components';
import { Effect } from '../data/Effect';
import { Subject } from '../subjects/index';
import useKodemoState, { DocumentSelectors, KodemoStateSelectors } from '../hooks/useKodemoState';
import useKodemoConfig from '../hooks/useKodemoConfig';
import anime from 'animejs';
import { shallow } from 'zustand/shallow';
import { getOrderedCollectionAsEntries } from '../util/util';

const StyledRoot = styled.div`
  display: flex;
  position: sticky;
  flex-direction: column;
  width: 100%;
  height: 100%;
  top: 0;
  color: #fff;
  overflow: hidden;

  @media only screen and ${(props) => props.theme.breakpoints.s} {
    position: fixed;
    top: var(--ko-offset-y, 0px);
    width: var(--ko-width, 100%);
    height: ${(props) => props.theme.subjectsMobileHeight} !important;
  }
`;

const StyledContent = styled.div`
  position: relative;
  height: 100%;
  background-color: ${(props) => props.theme.colors.bgSubjects};
`;

const StyledHeader = styled.header`
  display: flex;
  width: 100%;
  flex-shrink: 0;
  font-size: ${({ theme }) => theme.fontSize.s};
  background-color: ${(props) => props.theme.colors.bgSubjectsDarker};
  position: relative;
  height: ${({ theme }) => theme.tabHeight}px;
  border-top-left-radius: ${(props) => props.theme.tabBarTopLeftRadius}px;

  @media only screen and ${(props) => props.theme.breakpoints.s} {
    height: ${({ theme }) => theme.tabHeightSmall}px;
    font-size: ${(prop) => prop.theme.fontSize.xs};
  }
`;

const StyledTabs = styled.div`
  display: flex;
  overflow: auto;
`;

const StyledTab = styled.button<{ active: boolean }>`
  display: flex;
  align-items: center;
  padding: 0 1em;
  background-color: transparent;
  color: #fff;
  opacity: 0.5;
  height: ${({ theme }) => theme.tabHeight}px;
  flex-shrink: 0;

  @media only screen and ${(props) => props.theme.breakpoints.s} {
    height: ${({ theme }) => theme.tabHeightSmall}px;
    padding: 0 0.75em;
  }

  &:hover {
    opacity: 1;
  }

  &:first-child {
    border-top-left-radius: ${(props) => props.theme.tabBarTopLeftRadius}px;
  }

  ${(props) =>
    props.active &&
    css`
      opacity: 1;
      background-color: ${(props) => props.theme.colors.bgSubjects};
    `}
`;

export function Root(props: any) {
  const dimensions = useKodemoState(KodemoStateSelectors.dimensions);
  return <StyledRoot className="ko-subjects" style={{ height: dimensions.height }} {...props}></StyledRoot>;
}

export function Content({ children, ...props }: { children?: any }) {
  const getSubjectComponentByType = useKodemoConfig((state) => state.getSubjectComponentByType);
  const subjects = useKodemoState(DocumentSelectors.subjects, shallow);
  const subjectIndex = useKodemoState(DocumentSelectors.subjectIndex, shallow);
  const orderedSubjects = getOrderedCollectionAsEntries(subjects, subjectIndex);

  return (
    <StyledContent {...props}>
      {children
        ? children
        : orderedSubjects.map(([id, subject]) => {
            const SubjectComponent = getSubjectComponentByType(subject.type).component;
            if (SubjectComponent) {
              return (
                <Subject.Root subjectId={id} key={id}>
                  <SubjectComponent subjectId={id}></SubjectComponent>
                </Subject.Root>
              );
            } else {
              console.warn(`Unknown subject type "${subject.type}"`);
              return '';
            }
          })}
    </StyledContent>
  );
}

export function Header({ children, ...props }: { children?: any }) {
  return <StyledHeader {...props}>{children ? children : <Tabs></Tabs>}</StyledHeader>;
}

const Tabs = React.forwardRef<HTMLDivElement, any>(({ children, ...props }, forwardRef) => {
  const subjects = useKodemoState(DocumentSelectors.subjects, shallow);
  const subjectIndex = useKodemoState(DocumentSelectors.subjectIndex, shallow);
  const orderedSubjects = getOrderedCollectionAsEntries(subjects, subjectIndex);

  return (
    <StyledTabs ref={forwardRef} {...props}>
      {children
        ? children
        : orderedSubjects.map(([id]) => {
            // @ts-ignore
            return <Tab subjectId={id} key={id} />;
          })}
    </StyledTabs>
  );
});

export interface TabProps {
  subjectId: string;
  active: boolean;
  children: any;
  [key: string]: any;
}

const Tab = React.forwardRef<any, TabProps>(({ active, subjectId, ...props }, forwardRef) => {
  const tabRef = React.useRef<any>(null);
  const currentEffect = useKodemoState((state) => state.currentEffect);
  const setPreviewEffect = useKodemoState((state) => state.setPreviewEffect);
  const subject = useKodemoState((state) => DocumentSelectors.subject(state, subjectId));

  if (!active && currentEffect && currentEffect.subject === subjectId) {
    active = true;
  }

  const handleClick = React.useCallback(() => {
    setPreviewEffect(Effect.fromJSON({ subject: subjectId }));
  }, []);

  const scrollTabIntoViewIfNeeded = React.useCallback(() => {
    // This is called async so ensure the tab still exists
    if (tabRef.current && tabRef.current.parentNode) {
      const tabLeft = tabRef.current.offsetLeft;
      const tabRight = tabLeft + tabRef.current.offsetWidth;
      const scrollLeft = tabRef.current.parentNode.scrollLeft;
      const scrollWidth = tabRef.current.parentNode.offsetWidth;

      let newScrollLeft;

      if (tabRight > scrollLeft + scrollWidth) {
        newScrollLeft = tabRight - scrollWidth;
      } else if (tabLeft < scrollLeft) {
        newScrollLeft = tabLeft;
      }

      anime.remove(tabRef.current.parentNode);

      if (typeof newScrollLeft === 'number') {
        anime({
          targets: tabRef.current.parentNode,
          easing: 'easeInOutQuint',
          duration: 750,
          scrollLeft: newScrollLeft,
        });
      }
    }
  }, []);

  React.useEffect(() => {
    if (active) {
      setTimeout(scrollTabIntoViewIfNeeded, 1);
    }
  }, [active]);

  React.useImperativeHandle(forwardRef, () => tabRef.current);

  return (
    <StyledTab active={active} onClick={handleClick} data-id={subjectId} ref={tabRef} {...props}>
      {props.children || subject.name}
    </StyledTab>
  );
});

export { Tabs, Tab };
