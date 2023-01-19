import React from 'react';
import ReactDOM from 'react-dom/client';
import '../../../assets/global.css';
import json from '../../../docs/docs-player.json';
import { KodemoPlayer, Story, Subjects, Timeline, useKodemoState, DocumentSelectors } from '../src/KodemoPlayer';

// @ts-ignore
(window.rr = window.rr || ReactDOM.createRoot(document.getElementById('root'))).render(
  <React.StrictMode>
    <PlayerWithHeader />
  </React.StrictMode>
);

function PlayerWithHeader() {
  return (
    <KodemoPlayer json={json}>
      <>
        <div>
          <div style={{ background: '#ccc', height: 100, position: 'sticky', top: 0, zIndex: 1, textAlign: 'center' }}>
            Header Example
          </div>
          <Story.Root>
            <Story.Content></Story.Content>
            <Timeline.Root></Timeline.Root>
          </Story.Root>
        </div>
        <Subjects.Root>
          <Subjects.Header></Subjects.Header>
          <Subjects.Content></Subjects.Content>
        </Subjects.Root>
      </>
    </KodemoPlayer>
  );
}

function FlippedPlayer() {
  return (
    <KodemoPlayer json={json} style={{ gridTemplateColumns: '5fr minmax(500px, 1.25fr)' }}>
      <>
        <Subjects.Root>
          <Subjects.Content></Subjects.Content>
          <Subjects.Header></Subjects.Header>
        </Subjects.Root>
        <Story.Root>
          <Story.Content></Story.Content>
          <Timeline.Root></Timeline.Root>
        </Story.Root>
      </>
    </KodemoPlayer>
  );
}
