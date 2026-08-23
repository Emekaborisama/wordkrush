/**
 * The expanded view — the run itself.
 *
 * Everything here is a render of what the server said. The one piece of local
 * logic is the reveal beat, which lives in `useDailyRun`.
 */
import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { showShareSheet, showToast } from '@devvit/web/client';
import type { BoardView, ResultView } from '../shared/api';
import { useDailyRun, type GameView } from './hooks/useDailyRun';

const number = (value: number): string => value.toLocaleString('en-US');

function Header({ view, showStreak }: { view: GameView; showStreak: boolean }) {
  return (
    <div className="header">
      <div>
        <div className="wordmark">WordKrush</div>
        <div className="day">{view.dayLabel || 'More or Less'}</div>
      </div>
      {showStreak && (
        <div className="streak">
          {view.streak} <span>streak</span>
        </div>
      )}
    </div>
  );
}

function Board({ board, username }: { board: BoardView; username: string | null }) {
  return (
    <div className="board">
      <div className="board__title">
        Today’s board · {board.players} {board.players === 1 ? 'player' : 'players'}
      </div>
      {board.top.length === 0 ? (
        <div className="board__empty">Nobody has finished a run yet. Go set the bar.</div>
      ) : (
        board.top.map((entry, index) => (
          <div
            key={entry.username}
            className={`board__row${entry.username === username ? ' board__row--you' : ''}`}
          >
            <div className="board__rank">{index + 1}</div>
            <div className="board__name">u/{entry.username}</div>
            <div className="board__score">{entry.streak}</div>
          </div>
        ))
      )}
    </div>
  );
}

async function copyResult(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('Copied — paste it in the comments.');
  } catch {
    // Clipboard access can be refused inside the web view. The block is on
    // screen either way, so the player can still select it by hand.
    showToast('Could not copy. Select the block above instead.');
  }
}

function Result({
  result,
  view,
  onReplay,
}: {
  result: ResultView;
  view: GameView;
  onReplay: () => void;
}) {
  const standing =
    result.rank !== null
      ? `#${result.rank} of ${result.players} today`
      : view.username === null
        ? 'Sign in to Reddit to get on the board'
        : 'Not ranked';

  return (
    <>
      <Header view={view} showStreak={false} />

      <div className="result">
        <div className="result__headline">
          <div className="result__streak">{result.streak}</div>
          <div className="result__caption">
            {result.streak === 1 ? 'correct answer' : 'correct answers'} · {standing}
          </div>
          {!result.recorded && view.username !== null && (
            <div className="result__note">
              Only your first run counts — everyone gets the same questions, so a replay
              already knows the answers.
            </div>
          )}
        </div>

        {result.share !== '' && (
          <>
            <pre className="result__grid">{result.share}</pre>
            <div className="controls">
              <button className="btn btn--primary" onClick={() => void copyResult(result.share)}>
                Copy result
              </button>
              <button
                className="btn"
                onClick={() =>
                  void showShareSheet({ title: 'More or Less — WordKrush', text: result.share })
                }
              >
                Share
              </button>
            </div>
          </>
        )}

        <Board board={view.board} username={view.username} />

        <button className="btn btn--ghost btn--wide" onClick={onReplay}>
          Play again (unranked)
        </button>
      </div>
    </>
  );
}

function Game() {
  const { view, guess, restart, reload } = useDailyRun();
  const { phase } = view;

  if (phase.name === 'loading') {
    return (
      <div className="screen">
        <Header view={view} showStreak={false} />
        <div className="center-note">Loading today’s run…</div>
      </div>
    );
  }

  if (phase.name === 'error') {
    return (
      <div className="screen">
        <Header view={view} showStreak={false} />
        <div className="center-note">{phase.message}</div>
        <button className="btn btn--primary btn--wide" onClick={() => void reload()}>
          Try again
        </button>
      </div>
    );
  }

  if (phase.name === 'over') {
    return (
      <div className="screen">
        <Result result={phase.result} view={view} onReplay={() => void restart()} />
      </div>
    );
  }

  // Narrow once, up front: the two live phases render the same board, and the
  // difference between them is entirely "is the hidden value on screen yet".
  const reveal = phase.name === 'reveal' ? phase : null;
  const round = phase.round;
  const locked = phase.name === 'reveal' || phase.busy;
  const challengerClass = reveal ? (reveal.correct ? 'card--correct' : 'card--wrong') : '';

  return (
    <div className="screen">
      <Header view={view} showStreak />

      <div className="question">
        Does <strong>{round.right.label}</strong> get more or less than{' '}
        <strong>{round.left.label}</strong>?
      </div>

      <div className="cards">
        <div className="card">
          <div className="card__label">{round.left.label}</div>
          <div className="card__value">{number(round.left.value)}</div>
          <div className="card__metric">{view.metricLabel}</div>
        </div>

        <div className="versus">VS</div>

        <div className={`card card--challenger ${challengerClass}`.trim()}>
          <div className="card__label">{round.right.label}</div>
          {reveal ? (
            <>
              <div className="card__value reveal-in">{number(reveal.revealed)}</div>
              {/* Never colour alone: the verdict is also stated. */}
              <div className="card__metric">{reveal.correct ? '✓ Correct' : '✗ Wrong'}</div>
            </>
          ) : (
            <>
              <div className="card__hidden">?</div>
              <div className="card__metric">{view.metricLabel}</div>
            </>
          )}
        </div>
      </div>

      <div className="controls">
        <button className="btn" disabled={locked} onClick={() => void guess('less')}>
          ↓ Less
        </button>
        <button className="btn" disabled={locked} onClick={() => void guess('more')}>
          ↑ More
        </button>
      </div>

      <div className="disclosure">Same questions for everyone · first run counts</div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Game />
  </StrictMode>,
);
