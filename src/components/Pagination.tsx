import styled, { css } from 'styled-components';
import { KodemoMenu, Tooltip, formatKeyboardShortcut } from '@kodemo/util';
import { ChevronRightIcon, ChevronLeftIcon } from '@radix-ui/react-icons';
import usePagination from '../hooks/usePagination';

const PaginationButton = styled(KodemoMenu.IconButton)<any>`
  ${(props) =>
    props.disabled &&
    css`
      background-color: transparent !important;
      pointer-events: none;
      touch-action: none;
      opacity: 0.25;
    `}
`;

export default function Pagination() {
  const { previous, next, hasPrevious, hasNext } = usePagination();

  return (
    <>
      {/* <Tooltip.Tip side="bottom" text="Previous step" shortcut={formatKeyboardShortcut('←')}> */}
      <PaginationButton onClick={previous} disabled={!hasPrevious}>
        <ChevronLeftIcon />
      </PaginationButton>
      {/* </Tooltip.Tip> */}
      {/* <Tooltip.Tip side="bottom" text="Next step" shortcut={formatKeyboardShortcut('→')}> */}
      <PaginationButton onClick={next} disabled={!hasNext}>
        <ChevronRightIcon />
      </PaginationButton>
      {/* </Tooltip.Tip> */}
    </>
  );
}
