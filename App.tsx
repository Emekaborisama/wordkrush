import {
  Fredoka_500Medium,
  Fredoka_600SemiBold,
  Fredoka_700Bold,
  useFonts,
} from '@expo-google-fonts/fredoka';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StatusBar, StyleSheet, View } from 'react-native';
import {
  captureAnalytics,
  identifyAnalytics,
  initializeAnalytics,
  isAnalyticsConfigured,
  registerAnalyticsContext,
  resetAnalytics,
  setAnalyticsConsent as persistAnalyticsConsent,
} from './src/analytics/client';
import {
  runCountBucket,
  streakBucket,
  type AnalyticsConsent,
} from './src/analytics/events';
import { currentProfile, signOut, type Profile } from './src/auth/auth';
import { isBackendConfigured } from './src/auth/client';
import categoryData from './src/data/categories/wikipedia-popularity.json';
import { todaysPuzzleNumber } from './src/data/clueless';
import type { GameState } from './src/games/more-or-less/engine';
import type { Category } from './src/games/more-or-less/types';
import { randomSeed } from './src/games/rng';
import { GAMES, getGame } from './src/games/registry';
import { syncPendingScores } from './src/scores/global';
import {
  loadBoards,
  makeEntryId,
  migrateLegacyScores,
  recordScore,
  saveBoard,
} from './src/scores/storage';
import { EMPTY_BOARD, type ScoreBoard } from './src/scores/types';
import { loadStreak, markPlayedToday } from './src/streak/storage';
import { dayKey, EMPTY_STREAK, type DailyStreak } from './src/streak/types';
import { Drawer, type DrawerDestination } from './src/ui/Drawer';
import { AnalyticsConsentPrompt } from './src/ui/AnalyticsConsentPrompt';
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
  | { name: 'auth'; returnGameId?: string };

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Fredoka_500Medium,
    Fredoka_600SemiBold,
    Fredoka_700Bold,
  });
  const [screen, setScreen] = useState<Screen>({ name: 'hub' });
  const [boards, setBoards] = useState<Record<string, ScoreBoard>>({});
  const [profile, setProfile] = useState<Profile | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [streak, setStreak] = useState<DailyStreak>(EMPTY_STREAK);
  const [analyticsConsent, setAnalyticsConsent] = useState<AnalyticsConsent>('unknown');
  const [showAnalyticsPrompt, setShowAnalyticsPrompt] = useState(false);
  const [boardsReady, setBoardsReady] = useState(false);
  const [profileReady, setProfileReady] = useState(false);
  const [streakReady, setStreakReady] = useState(false);
  const [boardsResult, setBoardsResult] = useState<'loaded' | 'fallback'>('loaded');
  const startupAt = useRef(Date.now());
  const openedReported = useRef(false);
  const readyReported = useRef(false);
  const restoredSessionReported = useRef(false);
  const hadRestoredSession = useRef(false);
  const identifiedProfileId = useRef<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        // Carry pre-namespacing scores into the WordKrush comparison bucket before any
        // read, so a returning player never sees an empty history.
        await migrateLegacyScores();
        setBoards(await loadBoards(GAMES));
      } catch {
        setBoardsResult('fallback');
      } finally {
        setBoardsReady(true);
      }
    })();
    // Restoring a session must never block play: failures resolve to null.
    void currentProfile().then((restoredProfile) => {
      hadRestoredSession.current = restoredProfile !== null;
      setProfile(restoredProfile);
      setProfileReady(true);
    });
    // Display only — a visit alone does not extend the streak, finishing a
    // run does (see recordFinish below).
    void loadStreak().then((loadedStreak) => {
      setStreak(loadedStreak);
      setStreakReady(true);
    });
    void initializeAnalytics().then((storedConsent) => {
      setAnalyticsConsent(storedConsent);
      setShowAnalyticsPrompt(storedConsent === 'unknown' && isAnalyticsConfigured);
    });
  }, []);

  const boardFor = (gameId: string) => boards[gameId] ?? EMPTY_BOARD;
  const startGame = (gameId: string) => setScreen({ name: 'game', gameId, seed: randomSeed() });

  useEffect(() => {
    if (analyticsConsent !== 'granted') return;
    const authStatus = profile ? 'signed_in' : 'guest';
    if (profile && identifiedProfileId.current !== profile.id) {
      identifyAnalytics(profile);
      identifiedProfileId.current = profile.id;
    }
    registerAnalyticsContext(authStatus);
    if (!openedReported.current) {
      openedReported.current = true;
      captureAnalytics('app_opened', {
        backend_configured: isBackendConfigured,
        auth_status: authStatus,
      });
    }
  }, [analyticsConsent, profile]);

  useEffect(() => {
    if (
      analyticsConsent === 'granted' &&
      profileReady &&
      hadRestoredSession.current &&
      !restoredSessionReported.current
    ) {
      restoredSessionReported.current = true;
      captureAnalytics('auth_session_restored', { result: 'signed_in' });
    }
  }, [analyticsConsent, profileReady]);

  useEffect(() => {
    if (
      analyticsConsent !== 'granted' ||
      readyReported.current ||
      !boardsReady ||
      !profileReady ||
      !streakReady
    ) {
      return;
    }
    readyReported.current = true;
    captureAnalytics('app_ready', {
      duration_ms: Date.now() - startupAt.current,
      boards_result: boardsResult,
      session_result: profile ? 'signed_in' : 'guest',
    });
  }, [
    analyticsConsent,
    boardsReady,
    profileReady,
    streakReady,
    boardsResult,
    profile,
  ]);

  useEffect(() => {
    if (analyticsConsent !== 'granted') return;
    const gameId = 'gameId' in screen ? screen.gameId : undefined;
    captureAnalytics('screen_viewed', { screen_name: screen.name, game_id: gameId });

    if (screen.name === 'scores') {
      const board = boardFor(screen.gameId);
      captureAnalytics('scores_viewed', {
        game_id: screen.gameId,
        run_count_bucket: runCountBucket(board.totalRuns),
        has_highlight: Boolean(screen.highlightId),
        auth_status: profile ? 'signed_in' : 'guest',
      });
      if (!profile && isBackendConfigured) {
        captureAnalytics('auth_prompt_viewed', {
          game_id: screen.gameId,
          run_count_bucket: runCountBucket(board.totalRuns),
        });
      }
    }
  }, [analyticsConsent, screen, profile]);

  // Opening scores is the retry boundary for global submission. Local writes
  // complete first and remain authoritative; a failed upload stays unsynced
  // and is retried the next time this screen opens.
  useEffect(() => {
    if (!profile || screen.name !== 'scores') return;
    const local = boardFor(screen.gameId);
    if (!local.history.some((entry) => !entry.synced)) return;

    let cancelled = false;
    void syncPendingScores(screen.gameId, local, profile).then(async (synced) => {
      if (cancelled || synced === local) return;
      await saveBoard(screen.gameId, synced);
      if (!cancelled) {
        setBoards((previous) => ({ ...previous, [screen.gameId]: synced }));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [profile, screen]);

  // Every place a run ends and its score is recorded also counts today
  // towards the cross-game daily streak — finishing a run in any game
  // counts, not just opening the app.
  const recordFinish = async <T,>(save: () => Promise<T>): Promise<T> => {
    const [result] = await Promise.all([save(), markPlayedToday(dayKey(new Date())).then(setStreak)]);
    return result;
  };

  // The game screen owns the whole viewport during play, so the chrome is
  // hidden there — a menu bar over a live round is a mis-tap waiting to happen.
  const immersiveGame =
    screen.name === 'home' && (screen.gameId === 'clueless' || screen.gameId === 'wordfall');
  const showChrome = screen.name !== 'game' && !immersiveGame;
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
    else if (to.kind === 'game') {
      captureAnalytics('game_selected', { game_id: to.gameId, source: 'drawer' });
      setScreen({ name: 'home', gameId: to.gameId });
    }
    else if (to.kind === 'scores') setScreen({ name: 'scores', gameId: to.gameId });
    else setScreen({ name: 'auth', returnGameId: activeGameId });
  };

  if (!fontsLoaded && !fontError) {
    return (
      <SafeAreaView style={styles.loading}>
        <StatusBar barStyle="light-content" backgroundColor={theme.bg} />
        <ActivityIndicator color={theme.accent} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={theme.bg} />
      <View style={styles.glowViolet} pointerEvents="none" />
      <View style={styles.glowCoral} pointerEvents="none" />
      <View style={styles.frame}>
        {showChrome && <TopBar onMenu={() => setMenuOpen(true)} />}

        {screen.name === 'hub' && (
          <HubScreen
            boards={boards}
            streak={streak}
            onPlay={(gameId) => {
              captureAnalytics('game_selected', { game_id: gameId, source: 'hub' });
              setScreen({ name: 'home', gameId });
            }}
            onScores={() => setScreen({ name: 'scores', gameId: MORE_OR_LESS })}
          />
        )}

        {screen.name === 'home' && screen.gameId === 'clueless' && (
          <CluelessScreen
            puzzleNumber={todaysPuzzleNumber()}
            onExit={() => setScreen({ name: 'hub' })}
            onWin={async (guessesUsed) => {
              const previous = boardFor('clueless');
              const next = await recordFinish(() =>
                recordScore(
                  'clueless',
                  {
                    id: makeEntryId(),
                    streak: guessesUsed,
                    categoryId: 'clueless',
                    playedAt: new Date().toISOString(),
                    seed: todaysPuzzleNumber(),
                  },
                  'lower',
                ),
              );
              setBoards((prev) => ({ ...prev, clueless: next }));
              captureAnalytics('run_completed', {
                game_id: 'clueless',
                outcome: 'win',
                score: guessesUsed,
                score_kind: 'guesses_used',
                is_new_best: previous.totalRuns === 0 || guessesUsed < previous.bestStreak,
                puzzle_number: todaysPuzzleNumber(),
              });
            }}
          />
        )}

        {screen.name === 'home' && screen.gameId === 'wordfall' && (
          <WordfallScreen
            onExit={() => setScreen({ name: 'hub' })}
            onLevelWon={async (score, levelNumber, elapsedMs) => {
              const previous = boardFor('wordfall');
              const next = await recordFinish(() =>
                recordScore(
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
                ),
              );
              setBoards((prev) => ({ ...prev, wordfall: next }));
              captureAnalytics('run_completed', {
                game_id: 'wordfall',
                outcome: 'win',
                score,
                score_kind: 'points',
                duration_ms: elapsedMs,
                is_new_best: previous.totalRuns === 0 || score > previous.bestStreak,
                level_number: levelNumber,
              });
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
            onExit={() => setScreen({ name: 'home', gameId: screen.gameId })}
            onGameOver={async (state) => {
              const entryId = makeEntryId();
              const previous = boardFor(screen.gameId);
              // Persist before navigating so a reload mid-transition cannot
              // lose the run that just finished.
              const next = await recordFinish(() =>
                recordScore(screen.gameId, {
                  id: entryId,
                  streak: state.streak,
                  categoryId: category.id,
                  playedAt: new Date().toISOString(),
                  seed: screen.seed,
                }),
              );
              setBoards((prev) => ({ ...prev, [screen.gameId]: next }));
              captureAnalytics('run_completed', {
                game_id: 'more-or-less',
                outcome: 'loss',
                score: state.streak,
                score_kind: 'streak',
                is_new_best: previous.totalRuns === 0 || state.streak > previous.bestStreak,
                category_id: category.id,
                relaxed_rounds: state.relaxedRounds,
              });
              setScreen({ name: 'over', gameId: screen.gameId, state, entryId });
            }}
          />
        )}

        {screen.name === 'over' && (
          <GameOverScreen
            state={screen.state}
            category={category}
            board={boardFor(screen.gameId)}
            onPlayAgain={() => {
              captureAnalytics('game_over_action', {
                game_id: 'more-or-less',
                action: 'play_again',
                streak_bucket: streakBucket(screen.state.streak),
                is_new_best: screen.state.streak >= boardFor(screen.gameId).bestStreak,
              });
              startGame(screen.gameId);
            }}
            onHome={() => {
              captureAnalytics('game_over_action', {
                game_id: 'more-or-less',
                action: 'home',
                streak_bucket: streakBucket(screen.state.streak),
                is_new_best: screen.state.streak >= boardFor(screen.gameId).bestStreak,
              });
              setScreen({ name: 'hub' });
            }}
            onScores={() => {
              captureAnalytics('game_over_action', {
                game_id: 'more-or-less',
                action: 'scores',
                streak_bucket: streakBucket(screen.state.streak),
                is_new_best: screen.state.streak >= boardFor(screen.gameId).bestStreak,
              });
              setScreen({ name: 'scores', gameId: screen.gameId, highlightId: screen.entryId });
            }}
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
            onSignIn={() => setScreen({ name: 'auth', returnGameId: screen.gameId })}
            onSignOut={async () => {
              await signOut();
              captureAnalytics('signed_out', {});
              resetAnalytics();
              identifiedProfileId.current = null;
              setProfile(null);
              registerAnalyticsContext('guest');
            }}
          />
        )}

        {screen.name === 'auth' && (
          <AuthScreen
            onAuthed={(p) => {
              identifyAnalytics(p);
              identifiedProfileId.current = p.id;
              setProfile(p);
              setScreen({ name: 'scores', gameId: screen.returnGameId ?? MORE_OR_LESS });
            }}
            onSkip={() => {
              captureAnalytics('auth_skipped', {});
              setScreen({ name: 'hub' });
            }}
          />
        )}

        <Drawer
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          onNavigate={navigate}
          activeGameId={activeGameId}
          activeKind={activeKind}
          signedInAs={profile?.username ?? null}
          analyticsConsent={analyticsConsent}
          onAnalyticsPress={() => {
            if (!isAnalyticsConfigured) return;
            if (analyticsConsent === 'granted') {
              void persistAnalyticsConsent('denied', 'settings').then(() =>
                setAnalyticsConsent('denied'),
              );
            } else {
              setShowAnalyticsPrompt(true);
            }
          }}
        />
        <AnalyticsConsentPrompt
          visible={showAnalyticsPrompt}
          onAllow={() => {
            setShowAnalyticsPrompt(false);
            void persistAnalyticsConsent('granted', 'prompt').then(() =>
              setAnalyticsConsent('granted'),
            );
          }}
          onDecline={() => {
            setShowAnalyticsPrompt(false);
            void persistAnalyticsConsent('denied', 'prompt').then(() =>
              setAnalyticsConsent('denied'),
            );
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // The outer surface fills the window; the inner frame holds the phone-shaped
  // layout and centres it. On a phone the viewport is smaller than the caps, so
  // the frame is a no-op there.
  loading: {
    flex: 1,
    backgroundColor: theme.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safe: {
    flex: 1,
    backgroundColor: theme.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowViolet: {
    position: 'absolute',
    width: 460,
    height: 460,
    borderRadius: 230,
    backgroundColor: theme.accentSecondarySoft,
    top: -250,
    right: -180,
  },
  glowCoral: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: theme.accentSoft,
    bottom: -220,
    left: -170,
  },
  frame: {
    flex: 1,
    width: '100%',
    maxWidth: frame.maxWidth,
    maxHeight: frame.maxHeight,
    backgroundColor: theme.bg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.border,
  },
});
