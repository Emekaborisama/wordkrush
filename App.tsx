import { useEffect, useState } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, View } from 'react-native';
import { currentProfile, signOut, type Profile } from './src/auth/auth';
import { isBackendConfigured } from './src/auth/client';
import categoryData from './src/data/categories/wikipedia-popularity.json';
import type { GameState } from './src/game/engine';
import { randomSeed } from './src/game/rng';
import type { Category } from './src/game/types';
import { todaysPuzzleNumber } from './src/data/clueless';
import { GAMES, getGame } from './src/games/registry';
import { loadBoards, makeEntryId, migrateLegacyScores, recordScore } from './src/scores/storage';
import { EMPTY_BOARD, type ScoreBoard } from './src/scores/types';
import { Drawer, type DrawerDestination } from './src/ui/Drawer';
import { TopBar } from './src/ui/TopBar';
import { AuthScreen } from './src/ui/screens/AuthScreen';
import { CluelessScreen } from './src/ui/screens/CluelessScreen';
import { GameOverScreen } from './src/ui/screens/GameOverScreen';
import { GameScreen } from './src/ui/screens/GameScreen';
import { HomeScreen } from './src/ui/screens/HomeScreen';
import { HubScreen } from './src/ui/screens/HubScreen';
import { ScoresScreen } from './src/ui/screens/ScoresScreen';
import { WordfallScreen } from './src/ui/screens/WordfallScreen';
import { frame, theme } from './src/ui/theme';

const category = categoryData as Category & { provisional?: boolean };
const MORE_OR_LESS = 'more-or-less';

type Screen =
  | { name: 'hub' }
  | { name: 'home'; gameId: string }
  | { name: 'game'; gameId: string; seed: number }
  | { name: 'over'; gameId: string; state: GameState; entryId: string }
  | { name: 'scores'; gameId: string; highlightId?: string }
  | { name: 'auth' };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'hub' });
  const [boards, setBoards] = useState<Record<string, ScoreBoard>>({});
  const [profile, setProfile] = useState<Profile | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    void (async () => {
      // Carry pre-namespacing scores into the More or Less bucket before any
      // read, so a returning player never sees an empty history.
      await migrateLegacyScores();
      setBoards(await loadBoards(GAMES));
    })();
    // Restoring a session must never block play: failures resolve to null.
    void currentProfile().then(setProfile);
  }, []);

  const boardFor = (gameId: string) => boards[gameId] ?? EMPTY_BOARD;
  const startGame = (gameId: string) => setScreen({ name: 'game', gameId, seed: randomSeed() });

  // The game screen owns the whole viewport during play, so the chrome is
  // hidden there — a menu bar over a live round is a mis-tap waiting to happen.
  const showChrome = screen.name !== 'game';
  const activeGameId = 'gameId' in screen ? screen.gameId : undefined;
  const activeKind: DrawerDestination['kind'] =
    screen.name === 'hub'
      ? 'hub'
      : screen.name === 'scores'
        ? 'scores'
        : screen.name === 'auth'
          ? 'account'
          : 'game';

  const navigate = (to: DrawerDestination) => {
    if (to.kind === 'hub') setScreen({ name: 'hub' });
    else if (to.kind === 'game') setScreen({ name: 'home', gameId: to.gameId });
    else if (to.kind === 'scores') setScreen({ name: 'scores', gameId: to.gameId });
    else setScreen({ name: 'auth' });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={theme.bg} />
      <View style={styles.frame}>
        {showChrome && <TopBar onMenu={() => setMenuOpen(true)} />}

        {screen.name === 'hub' && (
          <HubScreen
            boards={boards}
            onPlay={(gameId) => setScreen({ name: 'home', gameId })}
            onScores={() => setScreen({ name: 'scores', gameId: MORE_OR_LESS })}
          />
        )}

        {screen.name === 'home' && screen.gameId === 'clueless' && (
          <CluelessScreen
            puzzleNumber={todaysPuzzleNumber()}
            onWin={async (guessesUsed) => {
              const next = await recordScore(
                'clueless',
                {
                  id: makeEntryId(),
                  streak: guessesUsed,
                  categoryId: 'clueless',
                  playedAt: new Date().toISOString(),
                  seed: todaysPuzzleNumber(),
                },
                'lower',
              );
              setBoards((prev) => ({ ...prev, clueless: next }));
            }}
          />
        )}

        {screen.name === 'home' && screen.gameId === 'wordfall' && (
          <WordfallScreen
            onLevelWon={async (score, levelNumber, elapsedMs) => {
              const next = await recordScore(
                'wordfall',
                {
                  id: makeEntryId(),
                  streak: score,
                  categoryId: `level-${levelNumber}`,
                  playedAt: new Date().toISOString(),
                  seed: levelNumber,
                  durationMs: elapsedMs,
                },
                'higher',
              );
              setBoards((prev) => ({ ...prev, wordfall: next }));
            }}
          />
        )}

        {screen.name === 'home' && screen.gameId === MORE_OR_LESS && (
          <HomeScreen
            category={category}
            board={boardFor(screen.gameId)}
            onPlay={() => startGame(screen.gameId)}
            onScores={() => setScreen({ name: 'scores', gameId: screen.gameId })}
          />
        )}

        {screen.name === 'game' && (
          <GameScreen
            // Remounting per seed guarantees a clean run rather than relying on
            // the reducer's initializer, which React only calls on first mount.
            key={screen.seed}
            category={category}
            seed={screen.seed}
            bestStreak={boardFor(screen.gameId).bestStreak}
            onGameOver={async (state) => {
              const entryId = makeEntryId();
              // Persist before navigating so a reload mid-transition cannot
              // lose the run that just finished.
              const next = await recordScore(screen.gameId, {
                id: entryId,
                streak: state.streak,
                categoryId: category.id,
                playedAt: new Date().toISOString(),
                seed: screen.seed,
              });
              setBoards((prev) => ({ ...prev, [screen.gameId]: next }));
              setScreen({ name: 'over', gameId: screen.gameId, state, entryId });
            }}
          />
        )}

        {screen.name === 'over' && (
          <GameOverScreen
            state={screen.state}
            category={category}
            board={boardFor(screen.gameId)}
            onPlayAgain={() => startGame(screen.gameId)}
            onHome={() => setScreen({ name: 'hub' })}
            onScores={() =>
              setScreen({ name: 'scores', gameId: screen.gameId, highlightId: screen.entryId })
            }
          />
        )}

        {screen.name === 'scores' && (
          <ScoresScreen
            gameId={screen.gameId}
            board={boardFor(screen.gameId)}
            highlightId={screen.highlightId}
            profile={profile}
            backendConfigured={isBackendConfigured}
            onBack={() => setScreen({ name: 'hub' })}
            onSignIn={() => setScreen({ name: 'auth' })}
            onSignOut={async () => {
              await signOut();
              setProfile(null);
            }}
          />
        )}

        {screen.name === 'auth' && (
          <AuthScreen
            onAuthed={(p) => {
              setProfile(p);
              setScreen({ name: 'scores', gameId: MORE_OR_LESS });
            }}
            onSkip={() => setScreen({ name: 'hub' })}
          />
        )}

        <Drawer
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          onNavigate={navigate}
          activeGameId={activeGameId}
          activeKind={activeKind}
          signedInAs={profile?.username ?? null}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // The outer surface fills the window; the inner frame holds the phone-shaped
  // layout and centres it. On a phone the viewport is smaller than the caps, so
  // the frame is a no-op there.
  safe: { flex: 1, backgroundColor: theme.bgElevated, alignItems: 'center', justifyContent: 'center' },
  frame: {
    flex: 1,
    width: '100%',
    maxWidth: frame.maxWidth,
    maxHeight: frame.maxHeight,
    backgroundColor: theme.bg,
    overflow: 'hidden',
  },
});
