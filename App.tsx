import { useEffect, useState } from 'react';
import { SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import categoryData from './src/data/categories/wikipedia-popularity.json';
import type { GameState } from './src/game/engine';
import { randomSeed } from './src/game/rng';
import type { Category } from './src/game/types';
import { loadBoard, makeEntryId, recordScore } from './src/scores/storage';
import { EMPTY_BOARD, type ScoreBoard } from './src/scores/types';
import { GameOverScreen } from './src/ui/screens/GameOverScreen';
import { GameScreen } from './src/ui/screens/GameScreen';
import { HomeScreen } from './src/ui/screens/HomeScreen';
import { ScoresScreen } from './src/ui/screens/ScoresScreen';
import { theme } from './src/ui/theme';

const category = categoryData as Category & { provisional?: boolean };

type Screen =
  | { name: 'home' }
  | { name: 'game'; seed: number }
  | { name: 'over'; state: GameState; entryId: string }
  | { name: 'scores'; highlightId?: string };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  const [board, setBoard] = useState<ScoreBoard>(EMPTY_BOARD);

  // Load persisted scores once on mount. Storage is async, so the first paint
  // shows an empty board and fills in — fine, since Home is not score-gated.
  useEffect(() => {
    void loadBoard().then(setBoard);
  }, []);

  const startGame = () => setScreen({ name: 'game', seed: randomSeed() });

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={theme.bg} />

      {screen.name === 'home' && (
        <HomeScreen
          category={category}
          board={board}
          onPlay={startGame}
          onScores={() => setScreen({ name: 'scores' })}
        />
      )}

      {screen.name === 'game' && (
        <GameScreen
          // Remounting per seed guarantees a clean run rather than relying on
          // the reducer's initializer, which React only calls on first mount.
          key={screen.seed}
          category={category}
          seed={screen.seed}
          bestStreak={board.bestStreak}
          onGameOver={async (state) => {
            const entryId = makeEntryId();
            // Persist before navigating so a reload mid-transition cannot lose
            // the run that just finished.
            const next = await recordScore({
              id: entryId,
              streak: state.streak,
              categoryId: category.id,
              playedAt: new Date().toISOString(),
              seed: screen.seed,
            });
            setBoard(next);
            setScreen({ name: 'over', state, entryId });
          }}
        />
      )}

      {screen.name === 'over' && (
        <GameOverScreen
          state={screen.state}
          category={category}
          board={board}
          onPlayAgain={startGame}
          onHome={() => setScreen({ name: 'home' })}
          onScores={() => setScreen({ name: 'scores', highlightId: screen.entryId })}
        />
      )}

      {screen.name === 'scores' && (
        <ScoresScreen
          board={board}
          highlightId={screen.highlightId}
          onBack={() => setScreen({ name: 'home' })}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
});
