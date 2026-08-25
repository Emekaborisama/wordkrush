/**
 * The feed view — the cover of the post.
 *
 * This is the bundle that renders while someone is scrolling past, so it does
 * no network work at all: the day and the opening matchup were written onto the
 * post as `postData` when it was created, and everything here reads from that.
 * Keep it that way. Anything that needs the server belongs in `game.tsx`.
 */
import './index.css';

import { StrictMode, type MouseEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { context, requestExpandedMode } from '@devvit/web/client';
import { parseSplashData } from '../shared/api';

const splash = parseSplashData(context.postData);

function Splash() {
  const play = (event: MouseEvent<HTMLButtonElement>) => {
    // Must be the trusted native event; Reddit rejects a synthesised one.
    requestExpandedMode(event.nativeEvent, 'game');
  };

  return (
    <div className="splash">
      <div className="splash__day">{splash ? splash.day : 'WordKrush'}</div>

      {splash ? (
        <>
          <h1 className="splash__title">Which one is bigger?</h1>
          <div className="splash__matchup">
            <div className="splash__name">{splash.left}</div>
            <div className="versus">VS</div>
            <div className="splash__name">{splash.right}</div>
          </div>
          <div className="splash__metric">{splash.metric}</div>
        </>
      ) : (
        <>
          <h1 className="splash__title">More or Less</h1>
          <div className="splash__metric">
            Which one is bigger? One tap per round, and the streak is yours to keep.
          </div>
        </>
      )}

      <button className="btn btn--primary btn--wide" onClick={play}>
        Play today’s run
      </button>

      <div className="splash__footer">
        This week’s names. Everyone here plays the same questions. Posted automatically by the
        WordKrush app.
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>,
);
