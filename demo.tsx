import './demo.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import demoJSON from './docs/tutorial.json';
import { KodemoMenu, Dropdown } from '@kodemo/util';
import { KodemoPlayer, Pagination } from './src/KodemoPlayer';
import { KodemoDocument } from './src/KodemoPlayer';

// @ts-ignore
(window.rr = window.rr || ReactDOM.createRoot(document.getElementById('root')!)).render(
  <React.StrictMode>
    <Demo></Demo>
  </React.StrictMode>
);

export default function Demo() {
  const [json, setJSON] = React.useState<KodemoDocument | undefined>(demoJSON);

  React.useEffect(() => {
    let handleKeyUp = ({ key }) => {
      if (key === '?') {
        setJSON(json === demoJSON ? undefined : demoJSON);
      }
    };

    document.addEventListener('keyup', handleKeyUp);
    return () => {
      document.removeEventListener('keyup', handleKeyUp);
    };
  });

  // const storyHeader = (
  //   <div style={{ background: '#ccc', height: 100, position: 'sticky', top: 0, zIndex: 1 }}>Header Example</div>
  // );

  return (
    <KodemoPlayer
      json={json}
      // layout={KodemoLayout.FIXED}
      // width={1200}
      // height={500}

      // theme={{
      //   colors: {
      //     active: 'red',
      //   },
      // }}

      menu={<Menu />}

      // copyCode={false}
    ></KodemoPlayer>
  );
}

function Menu() {
  return (
    <KodemoMenu.Root getDocumentJSON={() => {}} setDocumentJSON={() => {}} onKeyboardSaveShortcut={() => {}}>
      <KodemoMenu.Dropdown>
        <Dropdown.Item onSelect={() => {}}>Example</Dropdown.Item>
      </KodemoMenu.Dropdown>

      <KodemoMenu.Title editable={false} defaultTitle="Test" />
      <KodemoMenu.RightSlot>
        <Pagination />
      </KodemoMenu.RightSlot>
    </KodemoMenu.Root>
  );
}
