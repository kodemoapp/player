import styled from 'styled-components';

const StyledPlayerFooter = styled.footer`
  position: absolute;
  bottom: 1rem;
  right: 1rem;
  font-size: ${({ theme }) => theme.fontSize.s};
  color: rgba(255, 255, 255, 0.5);
  pointer-events: none;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 10px;

  & > * {
    opacity: 0.5;
  }

  a {
    pointer-events: auto;
  }
  a:hover {
    opacity: 1;
  }

  @media only screen and ${(props) => props.theme.breakpoints.m} {
    display: none;
  }
`;

export default function PlayerFooter({ packageJSON }: { packageJSON: any }) {
  return (
    <StyledPlayerFooter>
      <a href="https://github.com/KodemoApp/feedback" target="_blank">
        Share feedback
      </a>
      <span>&bull;</span>
      <span>{packageJSON.name + ' ' + packageJSON.version}</span>
    </StyledPlayerFooter>
  );
}
