import {
  Fredoka_500Medium,
  Fredoka_600SemiBold,
  Fredoka_700Bold,
  useFonts,
} from '@expo-google-fonts/fredoka';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { readArrivalContext, type ArrivalContext } from './src/analytics/arrival';
import { isLandingArrival } from './src/analytics/attribution';
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
import * as Linking from 'expo-linking';
import {
  completeSessionFromUrl,
  currentProfile,
  signOut,
  subscribeToAuth,
  type Profile,
} from './src/auth/auth';
import { isBackendConfigured } from './src/auth/client';
import categoryData from './src/data/categories/wikipedia-popularity.json';
import {
  cluelessSoloLevelByNumber,
  puzzleForCluelessSoloLevel,
  type CluelessSoloLevel,
} from './src/data/clueless/levels';
import {
  cluelessTeamLevelByNumber,
  puzzleForCluelessTeamLevel,
} from './src/data/clueless/campaign';
import { moreOrLessLevelByNumber } from './src/data/more-or-less/levels';
import { applyMatchUnlocks, LIVE_ROSTER_LABEL, playerCountBucket, type PathGameId } from './src/games/campaign';
import { loadPersonalUnlocked, savePersonalUnlocked } from './src/games/campaignStorage';
import {
  availabilityForCluelessPathLevel,
  completeCluelessPathLevel,
  currentCluelessPathLevel,
  EMPTY_CLUELESS_PATH,
  nextCluelessPathUnlockAt,
  type CluelessPathAvailability,
  type CluelessPathProgress,
} from './src/games/clueless/path';
import {
  loadCluelessPathProgress,
  saveCluelessPathProgress,
} from './src/games/clueless/path-storage';
import { boardForCluelessAssistanceContext } from './src/games/clueless/scoring';
import {
  assistanceContextForHintPolicy,
  type CluelessAssistanceContext,
} from './src/games/clueless/types';
import type { GameState } from './src/games/more-or-less/engine';
import {
  emptyProgress,
  recordSeen,
  resolveRound,
  roundLabel,
  roundMeta,
  snapshotRounds,
  soloCategory,
  type CategorySnapshot,
  type LabelRoundProgress,
} from './src/games/more-or-less/rounds';
import { loadRoundProgress, saveRoundProgress } from './src/games/more-or-less/rounds-storage';
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
import { applyFeedbackSettings, feedback } from './src/native/feedback';
import { loadFeedbackSettings, saveFeedbackSettings } from './src/settings/storage';
import {
  DEFAULT_FEEDBACK_SETTINGS,
  toggleChannel,
  type FeedbackChannel,
  type FeedbackSettings,
} from './src/settings/types';
import { toFeedbackIdentity } from './src/feedback/identity';
import { isFeedbackConfigured } from './src/feedback/submit';
import { joinMatch, postMatchScore } from './src/live/api';
import type { LiveMatchSnapshot } from './src/live/types';
import { parseTeamInviteUrl } from './src/teams/codes';
import { Drawer, type DrawerDestination } from './src/ui/Drawer';
import { AnalyticsConsentPrompt } from './src/ui/AnalyticsConsentPrompt';
import { FeedbackPrompt } from './src/ui/FeedbackPrompt';
import { TopBar } from './src/ui/TopBar';
import { AuthScreen } from './src/ui/screens/AuthScreen';
import { CluelessScreen } from './src/ui/screens/CluelessScreen';
import { GameOverScreen } from './src/ui/screens/GameOverScreen';
import { GameScreen } from './src/ui/screens/GameScreen';
import { GameStartScreen, StartDetail } from './src/ui/screens/GameStartScreen';
import { HubScreen } from './src/ui/screens/HubScreen';
import { LiveLobbyScreen } from './src/ui/screens/LiveLobbyScreen';
import { LivePlayShell } from './src/ui/screens/LivePlayShell';
import { LiveResultsScreen } from './src/ui/screens/LiveResultsScreen';
import { ScoresScreen } from './src/ui/screens/ScoresScreen';
import { TeamsScreen } from './src/ui/screens/TeamsScreen';
import { WordfallScreen } from './src/ui/screens/WordfallScreen';
import { LAPTOP_MAX_WIDTH, isWideLayout } from './src/ui/layout';
import { theme } from './src/ui/theme';
import { ensureWebViewport } from './src/ui/webViewport';

const snapshot = categoryData as CategorySnapshot;
const category: Category & { provisional?: boolean } = snapshot;
const MORE_OR_LESS = 'more-or-less';
const FIRST_ROUND_ID = snapshotRounds(snapshot)[0]?.id ?? 'round-1';

type LiveRun = {
  matchId: string;
  gameId: PathGameId;
  levelNumber: number;
  seed: number;
  endsAt: string | null;
};

type Screen =
  | { name: 'hub' }
  | { name: 'home'; gameId: string }
  | { name: 'game'; gameId: string; seed: number; cluelessLevelNumber?: number; live?: LiveRun }
  | { name: 'over'; gameId: string; state: GameState; entryId: string }
  | { name: 'scores'; gameId: string; highlightId?: string }
  | { name: 'auth'; returnTo?: 'teams' | 'scores'; returnGameId?: string }
  | { name: 'teams' }
  | { name: 'live-lobby'; matchId: string }
  | {
      name: 'live-results';
      snapshot: LiveMatchSnapshot;
      personalAdvanced: boolean;
      teamAdvanced: boolean;
    };

/**
 * The game-specific block on a start screen. Everything else about the screen
 * is shared; this is the one slot that differs, so a new game adds a case here
 * rather than forking the layout.
 */
function startDetailFor(
  gameId: string,
  category: Category & { provisional?: boolean },
  clueless: {
    progress: CluelessPathProgress;
    currentLevel: CluelessSoloLevel | undefined;
    availability: CluelessPathAvailability;
    nextUnlockAt: Date | null;
    now: Date;
    ready: boolean;
  },
  labelRound?: ReturnType<typeof resolveRound>,
) {
  const accent = getGame(gameId)?.accent ?? theme.accent;
  if (gameId === MORE_OR_LESS) {
    const seen = labelRound?.seenCount ?? 0;
    const total = labelRound?.round.itemIds.length ?? category.items.length;
    return (
      <StartDetail
        label={labelRound ? roundLabel(labelRound) : 'THIS SET'}
        title={`${seen} / ${total} names seen`}
        meta={
          labelRound
            ? roundMeta(labelRound)
            : 'See every name to unlock the next set. It will not change until you do. New sets are added each week.'
        }
        accent={accent}
      />
    );
  }
  if (gameId === 'clueless') {
    if (!clueless.ready) {
      return (
        <StartDetail
          label="SOLO PATH"
          title="Finding your next clue…"
          meta="Your path is safely stored on this device."
          accent={accent}
        />
      );
    }
    if (!clueless.currentLevel) {
      return (
        <StartDetail
          label="DAILY VAULT"
          title="More vaults arrive in an app update"
          meta="You cleared the bundled path. Keep the flame going in the other games meanwhile."
          accent={accent}
        />
      );
    }
    const level = clueless.currentLevel;
    const tutorialRail = [1, 2, 3]
      .map((number) => (number <= clueless.progress.completedThrough ? '●' : '○'))
      .join(' — ');
    const vaultNode = level.phase === 'daily' ? (clueless.availability === 'playable' ? '✦' : '◇') : '◇';
    const unlockMeta =
      clueless.nextUnlockAt && clueless.availability === 'waiting'
        ? localUnlockCopy(clueless.nextUnlockAt, clueless.now)
        : level.description;
    return (
      <>
        <StartDetail
          label={
            clueless.availability === 'waiting'
              ? 'DAILY VAULT · LOCKED'
              : level.phase === 'daily'
                ? 'DAILY VAULT · READY'
                : 'SOLO PATH'
          }
          title={
            clueless.availability === 'waiting'
              ? `Vault ${level.number} is sealed`
              : `Level ${level.number} · ${level.name}`
          }
          meta={unlockMeta}
          accent={accent}
        />
        <StartDetail
          label="YOUR PATH"
          title={`${tutorialRail}  →  ${vaultNode}`}
          meta={
            clueless.progress.completedThrough < 3
              ? 'Clear the three sparks to reach the Daily Vault.'
              : 'One solved vault schedules exactly one more at your next local midnight.'
          }
          accent={accent}
        />
      </>
    );
  }
  if (gameId === 'wordfall') {
    return (
      <StartDetail
        label="THIS WEEK"
        title="Campaign levels"
        meta="A new level drops every Monday"
        accent={accent}
      />
    );
  }
  return null;
}

function localUnlockCopy(unlockAt: Date, now: Date): string {
  const remainingMs = Math.max(0, unlockAt.getTime() - now.getTime());
  const totalMinutes = Math.ceil(remainingMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return `Opens in ${hours}h ${minutes}m at your local midnight.`;
  }
  return `Opens in ${Math.max(1, minutes)}m at your local midnight.`;
}

function startFooterFor(gameId: string, category: Category & { provisional?: boolean }) {
  if (gameId === MORE_OR_LESS) {
    return `Wikipedia pageviews${category.provisional ? ' · preview data' : ''} · Works offline`;
  }
  return 'Works offline';
}

function LiveMaybe({
  live,
  playerId,
  onFinished,
  children,
}: {
  live?: LiveRun;
  playerId?: string;
  onFinished: (snapshot: LiveMatchSnapshot) => void;
  children: ReactNode;
}) {
  if (!live || !playerId) return children;
  return (
    <LivePlayShell
      matchId={live.matchId}
      playerId={playerId}
      gameId={live.gameId}
      onFinished={onFinished}
    >
      {children}
    </LivePlayShell>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Fredoka_500Medium,
    Fredoka_600SemiBold,
    Fredoka_700Bold,
  });
  const { width } = useWindowDimensions();
  const wide = isWideLayout(width);
  const [screen, setScreen] = useState<Screen>({ name: 'hub' });
  const [boards, setBoards] = useState<Record<string, ScoreBoard>>({});
  const [cluelessPath, setCluelessPath] =
    useState<CluelessPathProgress>(EMPTY_CLUELESS_PATH);
  const [cluelessPathReady, setCluelessPathReady] = useState(false);
  const [cluelessPathNow, setCluelessPathNow] = useState(() => new Date());
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pendingInvite, setPendingInvite] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [streak, setStreak] = useState<DailyStreak>(EMPTY_STREAK);
  const [feedbackSettings, setFeedbackSettings] =
    useState<FeedbackSettings>(DEFAULT_FEEDBACK_SETTINGS);
  const [analyticsConsent, setAnalyticsConsent] = useState<AnalyticsConsent>('unknown');
  const [showAnalyticsPrompt, setShowAnalyticsPrompt] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [boardsReady, setBoardsReady] = useState(false);
  const [arrivalReady, setArrivalReady] = useState(false);
  const [profileReady, setProfileReady] = useState(false);
  const [streakReady, setStreakReady] = useState(false);
  const [labelProgress, setLabelProgress] = useState<LabelRoundProgress>(() =>
    emptyProgress(FIRST_ROUND_ID),
  );
  const [labelJustPassed, setLabelJustPassed] = useState(false);
  const [boardsResult, setBoardsResult] = useState<'loaded' | 'fallback'>('loaded');
  const startupAt = useRef(Date.now());
  const openedReported = useRef(false);
  const landingReported = useRef(false);
  const arrivalRef = useRef<ArrivalContext>({
    attribution: { entry_source: 'direct', has_utm_campaign: false },
    isWeb: false,
    hasHref: false,
  });
  const readyReported = useRef(false);
  const restoredSessionReported = useRef(false);
  const hadRestoredSession = useRef(false);
  const identifiedProfileId = useRef<string | null>(null);

  useEffect(() => {
    ensureWebViewport();
  }, []);

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
    void (async () => {
      try {
        arrivalRef.current = await readArrivalContext();
      } catch {
        arrivalRef.current = {
          attribution: { entry_source: 'direct', has_utm_campaign: false },
          isWeb: false,
          hasHref: false,
        };
      } finally {
        setArrivalReady(true);
      }
    })();
    void (async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          await completeSessionFromUrl(initialUrl);
          const invite = parseTeamInviteUrl(initialUrl);
          if (invite) setPendingInvite(invite);
        }
        const restoredProfile = await currentProfile();
        hadRestoredSession.current = restoredProfile !== null;
        setProfile(restoredProfile);
      } catch {
        hadRestoredSession.current = false;
        setProfile(null);
      } finally {
        setProfileReady(true);
      }
    })();
    // Display only — a visit alone does not extend the streak, finishing a
    // run does (see recordFinish below).
    void loadStreak().then((loadedStreak) => {
      setStreak(loadedStreak);
      setStreakReady(true);
    });
    void loadRoundProgress(FIRST_ROUND_ID).then(setLabelProgress);
    void loadCluelessPathProgress().then((progress) => {
      setCluelessPath(progress);
      setCluelessPathReady(true);
    });
    // Sound/vibration switches. Defaults are on, so a slow read just means the
    // first moment of the session uses the defaults rather than nothing.
    void loadFeedbackSettings().then((stored) => {
      setFeedbackSettings(stored);
      applyFeedbackSettings(stored);
    });
    void initializeAnalytics().then((storedConsent) => {
      setAnalyticsConsent(storedConsent);
      setShowAnalyticsPrompt(storedConsent === 'unknown' && isAnalyticsConfigured);
    });
  }, []);

  useEffect(() => {
    if (!profileReady || !pendingInvite) return;
    setScreen((current) => (current.name === 'hub' ? { name: 'teams' } : current));
  }, [profileReady, pendingInvite]);

  useEffect(() => {
    if (!cluelessPathReady || screen.name !== 'home' || screen.gameId !== 'clueless') return;
    const now = new Date();
    setCluelessPathNow(now);
    const unlockAt = nextCluelessPathUnlockAt(cluelessPath);
    if (!unlockAt || unlockAt.getTime() <= now.getTime()) return;

    // Refresh the countdown every minute and exactly at local midnight, without
    // depending on a server clock or a background task.
    const nextRefreshAt = Math.min(unlockAt.getTime(), now.getTime() + 60_000);
    const timer = setTimeout(
      () => setCluelessPathNow(new Date()),
      Math.max(1, nextRefreshAt - now.getTime() + 50),
    );
    return () => clearTimeout(timer);
  }, [screen, cluelessPath, cluelessPathReady]);

  useEffect(() => {
    const unsubscribe = subscribeToAuth((next) => {
      setProfile(next);
    });
    const links = Linking.addEventListener('url', ({ url }) => {
      void completeSessionFromUrl(url);
      const invite = parseTeamInviteUrl(url);
      if (invite) {
        setPendingInvite(invite);
        setScreen({ name: 'teams' });
      }
    });
    return () => {
      unsubscribe();
      links.remove();
    };
  }, []);

  const boardFor = (gameId: string) => boards[gameId] ?? EMPTY_BOARD;
  const labelResolved = resolveRound(snapshot, labelProgress);
  const soloPool = soloCategory(snapshot, labelProgress);
  const currentCluelessLevelNumber = currentCluelessPathLevel(cluelessPath);
  const currentCluelessLevel = cluelessSoloLevelByNumber(currentCluelessLevelNumber);
  const currentCluelessAvailability = availabilityForCluelessPathLevel(
    cluelessPath,
    currentCluelessLevelNumber,
    cluelessPathNow,
  );
  const currentCluelessAssistanceContext: CluelessAssistanceContext = currentCluelessLevel
    ? assistanceContextForHintPolicy(currentCluelessLevel.hintPolicy)
    : 'expert';
  const currentCluelessUnlockAt = nextCluelessPathUnlockAt(cluelessPath);
  const openGameHome = (gameId: string) => {
    setScreen({ name: 'home', gameId });
  };
  const startGame = (gameId: string) => {
    if (
      gameId === 'clueless' &&
      (!cluelessPathReady ||
        !currentCluelessLevel ||
        currentCluelessAvailability !== 'playable')
    ) {
      return;
    }
    setLabelJustPassed(false);
    setScreen({
      name: 'game',
      gameId,
      seed: randomSeed(),
      cluelessLevelNumber: gameId === 'clueless' ? currentCluelessLevel?.number : undefined,
    });
  };

  const startLiveRace = (snapshot: LiveMatchSnapshot) => {
    const { match } = snapshot;
    if (match.seed == null) return;
    void joinMatch(match.id);
    setScreen({
      name: 'game',
      gameId: match.gameId,
      seed: match.seed,
      live: {
        matchId: match.id,
        gameId: match.gameId,
        levelNumber: match.levelNumber,
        seed: match.seed,
        endsAt: match.endsAt,
      },
    });
  };

  const completeLiveRace = async (snapshot: LiveMatchSnapshot) => {
    const self = snapshot.players.find((player) => player.playerId === profile?.id);
    const anyone = snapshot.players.some((player) => player.complete);
    const personal = await loadPersonalUnlocked(snapshot.match.gameId);
    const next = applyMatchUnlocks({
      personalUnlocked: personal,
      teamUnlocked: personal,
      levelNumber: snapshot.match.levelNumber,
      playerCompleted: Boolean(self?.complete),
      anyoneCompleted: anyone,
    });
    if (self?.complete) await savePersonalUnlocked(snapshot.match.gameId, next.personalUnlocked);
    captureAnalytics('match_finished', {
      game_id: snapshot.match.gameId,
      level_number: snapshot.match.levelNumber,
      player_count_bucket: playerCountBucket(snapshot.players.length),
      complete: Boolean(self?.complete),
      outcome: self?.complete ? 'win' : 'loss',
    });
    setScreen({
      name: 'live-results',
      snapshot,
      personalAdvanced: Boolean(self?.complete),
      teamAdvanced: anyone,
    });
  };

  useEffect(() => {
    if (analyticsConsent !== 'granted' || !arrivalReady) return;
    const authStatus = profile ? 'signed_in' : 'guest';
    if (profile && identifiedProfileId.current !== profile.id) {
      identifyAnalytics(profile);
      identifiedProfileId.current = profile.id;
    }
    registerAnalyticsContext(authStatus);
    if (!openedReported.current) {
      openedReported.current = true;
      const arrival = arrivalRef.current;
      captureAnalytics('app_opened', {
        backend_configured: isBackendConfigured,
        auth_status: authStatus,
        ...arrival.attribution,
      });
      if (
        !landingReported.current &&
        isLandingArrival({
          isWeb: arrival.isWeb,
          hasHref: arrival.hasHref,
          entry_source: arrival.attribution.entry_source,
        })
      ) {
        landingReported.current = true;
        captureAnalytics('landing_viewed', {
          ...arrival.attribution,
          surface: arrival.isWeb ? 'web' : 'native',
        });
      }
    }
  }, [analyticsConsent, arrivalReady, profile]);

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
  // Every game now plays under `game`, so the one check covers all three.
  const showChrome = screen.name !== 'game';
  const activeSoloCluelessLevel =
    screen.name === 'game' && screen.gameId === 'clueless' && !screen.live
      ? cluelessSoloLevelByNumber(screen.cluelessLevelNumber ?? currentCluelessLevelNumber)
      : undefined;
  const activeTeamCluelessLevel =
    screen.name === 'game' && screen.gameId === 'clueless' && screen.live
      ? cluelessTeamLevelByNumber(screen.live.levelNumber)
      : undefined;
  const activeCluelessPuzzle = activeSoloCluelessLevel
    ? puzzleForCluelessSoloLevel(activeSoloCluelessLevel)
    : activeTeamCluelessLevel
      ? puzzleForCluelessTeamLevel(activeTeamCluelessLevel)
      : undefined;
  const activeGameId = 'gameId' in screen ? screen.gameId : undefined;
  const activeKind: DrawerDestination['kind'] =
    screen.name === 'hub'
      ? 'hub'
      : screen.name === 'scores'
        ? 'scores'
        : screen.name === 'auth'
          ? 'account'
          : screen.name === 'teams' || screen.name === 'live-lobby' || screen.name === 'live-results'
            ? 'teams'
            : 'game';

  /**
   * Flips one feedback channel. Applied to the effect layer immediately so the
   * tap that turns sound back on is itself audible, then persisted; a failed
   * write costs the preference next launch, not this session.
   */
  const toggleFeedback = (channel: FeedbackChannel) => {
    const next = toggleChannel(feedbackSettings, channel);
    setFeedbackSettings(next);
    applyFeedbackSettings(next);
    void saveFeedbackSettings(next);
    // Demonstrate what was just switched on. Gating happens inside `feedback`,
    // so enabling vibration buzzes without also making noise, and vice versa.
    if (next[channel]) feedback('correct');
  };

  const navigate = (to: DrawerDestination) => {
    if (to.kind === 'hub') setScreen({ name: 'hub' });
    else if (to.kind === 'game') {
      captureAnalytics('game_selected', { game_id: to.gameId, source: 'drawer' });
      openGameHome(to.gameId);
    }
    else if (to.kind === 'scores') setScreen({ name: 'scores', gameId: to.gameId });
    else if (to.kind === 'teams') setScreen({ name: 'teams' });
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
    <SafeAreaView style={[styles.safe, wide && styles.safeLaptop]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.bg} />
      <View style={styles.glowViolet} pointerEvents="none" />
      <View style={styles.glowCoral} pointerEvents="none" />
      <View style={[styles.frame, wide && styles.frameLaptop]}>
        {showChrome && <TopBar onMenu={() => setMenuOpen(true)} />}

        {screen.name === 'hub' && (
          <HubScreen
            boards={boards}
            streak={streak}
            labelRoundsPassed={labelProgress.roundsPassed}
            onPlay={(gameId) => {
              captureAnalytics('game_selected', { game_id: gameId, source: 'hub' });
              openGameHome(gameId);
            }}
            onScores={() => setScreen({ name: 'scores', gameId: MORE_OR_LESS })}
          />
        )}

        {screen.name === 'game' && screen.gameId === 'clueless' && activeCluelessPuzzle && (
          <LiveMaybe
            live={screen.live}
            playerId={profile?.id}
            onFinished={(snapshot) => void completeLiveRace(snapshot)}
          >
          <CluelessScreen
            key={screen.live ? `team-${screen.live.levelNumber}` : `solo-${activeSoloCluelessLevel?.number}`}
            puzzleNumber={activeCluelessPuzzle.number}
            levelNumber={screen.live?.levelNumber ?? activeSoloCluelessLevel?.number}
            levelName={screen.live ? activeTeamCluelessLevel?.name : activeSoloCluelessLevel?.name}
            pathPhase={screen.live ? 'team' : activeSoloCluelessLevel?.phase}
            hintPolicy={screen.live ? 'none' : activeSoloCluelessLevel?.hintPolicy ?? 'none'}
            hint={screen.live ? null : activeSoloCluelessLevel?.hint}
            persist={!screen.live}
            onScore={
              screen.live
                ? (score, complete) => {
                    void postMatchScore(screen.live!.matchId, score, complete, complete);
                  }
                : undefined
            }
            onExit={() =>
              screen.live ? setScreen({ name: 'teams' }) : openGameHome('clueless')
            }
            onWin={async (guessesUsed, assistanceContext) => {
              if (screen.live) {
                await postMatchScore(screen.live.matchId, guessesUsed, true, true);
                return;
              }
              const level = activeSoloCluelessLevel;
              if (!level) return;
              const previous = boardForCluelessAssistanceContext(
                boardFor('clueless'),
                assistanceContext,
              );
              const next = await recordFinish(() =>
                recordScore(
                  'clueless',
                  {
                    id: makeEntryId(),
                    streak: guessesUsed,
                    categoryId: assistanceContext,
                    playedAt: new Date().toISOString(),
                    seed: activeCluelessPuzzle.number,
                  },
                  'lower',
                ),
              );
              setBoards((prev) => ({ ...prev, clueless: next }));
              const completedAt = new Date();
              const nextPath = completeCluelessPathLevel(cluelessPath, level.number, completedAt);
              await saveCluelessPathProgress(nextPath);
              setCluelessPath(nextPath);
              setCluelessPathNow(completedAt);
              captureAnalytics('run_completed', {
                game_id: 'clueless',
                outcome: 'win',
                score: guessesUsed,
                score_kind: 'guesses_used',
                is_new_best: previous.totalRuns === 0 || guessesUsed < previous.bestStreak,
                puzzle_number: activeCluelessPuzzle.number,
                level_number: level.number,
                path_phase: level.phase,
                assistance_context: assistanceContext,
                hint_source: level.hintPolicy,
              });
            }}
          />
          </LiveMaybe>
        )}

        {screen.name === 'game' && screen.gameId === 'wordfall' && (
          <LiveMaybe
            live={screen.live}
            playerId={profile?.id}
            onFinished={(snapshot) => void completeLiveRace(snapshot)}
          >
          <WordfallScreen
            live={
              screen.live
                ? {
                    levelNumber: screen.live.levelNumber,
                    seed: screen.live.seed,
                    onScore: (score, complete) => {
                      void postMatchScore(screen.live!.matchId, score, complete, complete);
                    },
                  }
                : undefined
            }
            onExit={() =>
              screen.live ? setScreen({ name: 'teams' }) : setScreen({ name: 'home', gameId: 'wordfall' })
            }
            onLevelWon={async (score, levelNumber, elapsedMs) => {
              if (screen.live) {
                await postMatchScore(screen.live.matchId, score, true, true);
                return;
              }
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
          </LiveMaybe>
        )}

        {screen.name === 'home' && (
          <GameStartScreen
            gameId={screen.gameId}
            board={
              screen.gameId === 'clueless'
                ? boardForCluelessAssistanceContext(
                    boardFor('clueless'),
                    currentCluelessAssistanceContext,
                  )
                : boardFor(screen.gameId)
            }
            onPlay={() => startGame(screen.gameId)}
            playLabel={
              screen.gameId === 'clueless'
                ? !cluelessPathReady
                  ? 'Loading path…'
                  : currentCluelessAvailability === 'waiting'
                    ? 'Vault opens at midnight'
                    : currentCluelessLevel?.phase === 'daily'
                      ? 'Open Daily Vault'
                      : 'Play level'
                : undefined
            }
            onRace={() => {
              if (!profile) setScreen({ name: 'auth', returnTo: 'teams', returnGameId: screen.gameId });
              else setScreen({ name: 'teams' });
            }}
            raceDisabled={!isBackendConfigured}
            raceLabel={isBackendConfigured ? 'Race with team' : 'Race with team (offline)'}
            raceHint={
              isBackendConfigured
                ? `A live race is ${LIVE_ROSTER_LABEL} players on the same board.`
                : undefined
            }
            onScores={() => setScreen({ name: 'scores', gameId: screen.gameId })}
            detail={startDetailFor(
              screen.gameId,
              soloPool,
              {
                progress: cluelessPath,
                currentLevel: currentCluelessLevel,
                availability: currentCluelessAvailability,
                nextUnlockAt: currentCluelessUnlockAt,
                now: cluelessPathNow,
                ready: cluelessPathReady,
              },
              screen.gameId === MORE_OR_LESS ? labelResolved : undefined,
            )}
            footer={startFooterFor(screen.gameId, category)}
            playDisabled={
              screen.gameId === 'clueless' &&
              (!cluelessPathReady ||
                !currentCluelessLevel ||
                currentCluelessAvailability !== 'playable')
            }
          />
        )}

        {screen.name === 'game' && screen.gameId === MORE_OR_LESS && (
          <LiveMaybe
            live={screen.live}
            playerId={profile?.id}
            onFinished={(snapshot) => void completeLiveRace(snapshot)}
          >
          <GameScreen
            // Remounting per seed guarantees a clean run rather than relying on
            // the reducer's initializer, which React only calls on first mount.
            key={screen.seed}
            category={screen.live ? category : soloPool}
            seed={screen.seed}
            bestStreak={boardFor(screen.gameId).bestStreak}
            persist={!screen.live}
            labelRound={
              screen.live
                ? undefined
                : {
                    seenCount: labelResolved.seenCount,
                    total: labelResolved.round.itemIds.length,
                    preferUnseenIds: labelResolved.preferUnseenIds,
                    onSeen: (ids) => {
                      setLabelProgress((prev) => {
                        const result = recordSeen(snapshot, prev, ids, { allowAdvance: false });
                        void saveRoundProgress(result.progress);
                        return result.progress;
                      });
                    },
                  }
            }
            band={
              screen.live
                ? moreOrLessLevelByNumber(screen.live.levelNumber)?.band
                : undefined
            }
            targetStreak={
              screen.live
                ? moreOrLessLevelByNumber(screen.live.levelNumber)?.targetStreak
                : undefined
            }
            onScore={
              screen.live
                ? (score, complete) => {
                    void postMatchScore(screen.live!.matchId, score, complete, false);
                  }
                : undefined
            }
            onDone={
              screen.live
                ? (score, complete) => {
                    void postMatchScore(screen.live!.matchId, score, complete, true);
                  }
                : undefined
            }
            onExit={() =>
              screen.live ? setScreen({ name: 'teams' }) : setScreen({ name: 'home', gameId: screen.gameId })
            }
            onGameOver={async (state) => {
              if (screen.live) {
                const target = moreOrLessLevelByNumber(screen.live.levelNumber)?.targetStreak ?? 0;
                await postMatchScore(
                  screen.live.matchId,
                  state.streak,
                  state.streak >= target,
                  true,
                );
                return;
              }
              const entryId = makeEntryId();
              const previous = boardFor(screen.gameId);
              const roundResult = recordSeen(snapshot, labelProgress, state.seenIds);
              setLabelProgress(roundResult.progress);
              setLabelJustPassed(roundResult.justPassed);
              await saveRoundProgress(roundResult.progress);
              if (roundResult.justPassed) {
                captureAnalytics('label_round_passed', {
                  game_id: 'more-or-less',
                  round_id: labelResolved.round.id,
                  rounds_passed: roundResult.progress.roundsPassed,
                  item_count: labelResolved.round.itemIds.length,
                });
              }
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
          </LiveMaybe>
        )}

        {screen.name === 'teams' && (
          <TeamsScreen
            profile={profile}
            pendingInviteCode={pendingInvite}
            onNeedAuth={() => setScreen({ name: 'auth', returnTo: 'teams' })}
            onOpenLobby={(matchId) => setScreen({ name: 'live-lobby', matchId })}
            onInviteConsumed={() => setPendingInvite(null)}
          />
        )}

        {screen.name === 'live-lobby' && profile && (
          <LiveLobbyScreen
            matchId={screen.matchId}
            playerId={profile.id}
            onRacing={startLiveRace}
            onExit={() => setScreen({ name: 'teams' })}
          />
        )}

        {screen.name === 'live-results' && profile && (
          <LiveResultsScreen
            snapshot={screen.snapshot}
            playerId={profile.id}
            personalAdvanced={screen.personalAdvanced}
            teamAdvanced={screen.teamAdvanced}
            onDone={() => setScreen({ name: 'teams' })}
          />
        )}

        {screen.name === 'over' && (
          <GameOverScreen
            state={screen.state}
            category={soloPool}
            board={boardFor(screen.gameId)}
            labelRound={{
              roundsPassed: labelProgress.roundsPassed,
              remaining: labelResolved.remaining,
              justPassed: labelJustPassed,
              caughtUp: labelResolved.caughtUp,
            }}
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
            scoreContexts={
              screen.gameId === 'clueless'
                ? [
                    { id: 'easy', label: 'Hint at start' },
                    { id: 'standard', label: 'Clue after 15', localAliases: ['clueless'] },
                    { id: 'expert', label: 'No hint' },
                  ]
                : undefined
            }
            initialScoreContext={
              screen.gameId === 'clueless' ? currentCluelessAssistanceContext : undefined
            }
            highlightId={screen.highlightId}
            profile={profile}
            backendConfigured={isBackendConfigured}
            roundsPassed={screen.gameId === MORE_OR_LESS ? labelProgress.roundsPassed : undefined}
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
            profile={profile}
            onAuthed={(p) => {
              identifyAnalytics(p);
              identifiedProfileId.current = p.id;
              setProfile(p);
              if (screen.returnTo === 'teams') setScreen({ name: 'teams' });
              else setScreen({ name: 'scores', gameId: screen.returnGameId ?? MORE_OR_LESS });
            }}
            onSkip={
              screen.returnTo === 'teams'
                ? undefined
                : () => {
                    captureAnalytics('auth_skipped', {});
                    setScreen({ name: 'hub' });
                  }
            }
          />
        )}

        <Drawer
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          onNavigate={navigate}
          activeGameId={activeGameId}
          activeKind={activeKind}
          signedInAs={profile?.username ?? null}
          feedbackSettings={feedbackSettings}
          onToggleFeedback={toggleFeedback}
          canSendFeedback={isFeedbackConfigured()}
          onSendFeedback={() => setShowFeedback(true)}
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
        <FeedbackPrompt
          visible={showFeedback}
          identity={toFeedbackIdentity(profile)}
          onClose={() => setShowFeedback(false)}
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
  loading: {
    flex: 1,
    backgroundColor: theme.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safe: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  safeLaptop: {
    alignItems: 'center',
    paddingHorizontal: 28,
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
    alignSelf: 'stretch',
    width: '100%',
    backgroundColor: theme.bg,
    overflow: 'hidden',
  },
  frameLaptop: {
    maxWidth: LAPTOP_MAX_WIDTH,
    alignSelf: 'center',
    marginHorizontal: 'auto',
  },
});
