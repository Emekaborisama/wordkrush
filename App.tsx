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
  captureWebPageview,
  identifyAnalytics,
  initializeAnalytics,
  isAnalyticsConfigured,
  registerAnalyticsContext,
  resetAnalytics,
  setAnalyticsConsent as persistAnalyticsConsent,
} from './src/analytics/client';
import {
  levelBucket,
  runCountBucket,
  streakBucket,
  type AnalyticsConsent,
  type AnalyticsEvents,
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
import appConfig from './app.json';
import categoryData from './src/data/categories/wikipedia-popularity.json';
import {
  CLUELESS_SOLO_LEVELS,
  cluelessSoloLevelByNumber,
  puzzleForCluelessSoloLevel,
  type CluelessSoloLevel,
} from './src/data/clueless/levels';
import {
  cluelessTeamLevelByNumber,
  puzzleForCluelessTeamLevel,
} from './src/data/clueless/campaign';
import { labelCategory } from './src/data/more-or-less/labelCategories';
import { labelLevel, labelPath } from './src/data/more-or-less/labelPaths';
import { moreOrLessLevelByNumber } from './src/data/more-or-less/levels';
import {
  bestStreakFor,
  EMPTY_LABEL_PATH,
  isLevelUnlocked,
  levelStars,
  nextLevelNumber,
  recordLevelRun,
  type LabelLevel,
  type LabelPathId,
  type LabelPathProgress,
} from './src/games/more-or-less/labelPath';
import { loadLabelPathProgress, saveLabelPathProgress } from './src/games/more-or-less/labelPath-storage';
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
import { EMPTY_BOARD, isNewBest, needsGlobalSync, type ScoreBoard, type ScoreDirection, type ScoreEntry } from './src/scores/types';
import { loadStreak, markPlayedToday } from './src/streak/storage';
import { dayKey, EMPTY_STREAK, type DailyStreak } from './src/streak/types';
import { applyFeedbackSettings, feedback } from './src/native/feedback';
import { setMusicEnabled, setMusicTrack } from './src/native/music';
import { loadLagosSeen, markLagosSeen } from './src/onboarding/lagos';
import { loadOnboarding, markOnboardingComplete } from './src/onboarding/storage';
import { COMPLETED_ONBOARDING, type OnboardingState } from './src/onboarding/types';
import { chestStatus, claimChest, nextChestDay } from './src/rewards/chest';
import { applyRun, levelProgress } from './src/rewards/progression';
import { loadRewards, saveRewards } from './src/rewards/storage';
import {
  EMPTY_REWARDS,
  type BoostKind,
  type RewardEvent,
  type RewardsState,
  type RunSummary,
} from './src/rewards/types';
import { spend } from './src/rewards/wallet';
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
import { clearExistingMembership } from './src/teams/api';
import { parseTeamInviteUrl } from './src/teams/codes';
import { afterModalClose, CoinsPill, SkyBackground, StreakPill, TopBar } from './src/ui/components';
import { parentOf, type Parent } from './src/ui/navigation';
import {
  clearSharePath,
  installWebHistory,
  noteWebNavigation,
  openedAtLagosPath,
  openedAtPathname,
  syncLagosPath,
} from './src/ui/webHistory';
import { challengeFromShare, challengeVerdict, shareTokenFromPath, type Challenge } from './src/games/more-or-less/challenge';
import { decodeShareData } from './src/games/share-data';
import { LabelLevelCard } from './src/ui/LabelLevelCard';
import { LabelLevelsPopup } from './src/ui/LabelLevelsPopup';
import { GAME_ANIMAL } from './src/ui/fluent';
import type { Stone } from './src/ui/levelTrail';
import { ChallengePopup } from './src/ui/ChallengePopup';
import { MeadowMap } from './src/ui/MeadowMap';
import { MeadowRide, type MeadowHop } from './src/ui/MeadowRide';
import { DanfoRide, type DanfoRideStop } from './src/ui/lagos/DanfoRide';
import { LagosAnnouncement } from './src/ui/lagos/LagosBanner';
import { LagosScreen } from './src/ui/screens/LagosScreen';
import { OnboardingScreen } from './src/ui/screens/OnboardingScreen';
import type { RunReward } from './src/ui/rewards/RunReward';
import { FeedbackPrompt } from './src/ui/FeedbackPrompt';
import { SettingsPopup } from './src/ui/SettingsPopup';
import { AccountScreen } from './src/ui/screens/AccountScreen';
import { CluelessScreen } from './src/ui/screens/CluelessScreen';
import { GameOverScreen } from './src/ui/screens/GameOverScreen';
import { GameScreen } from './src/ui/screens/GameScreen';
import { GameStartScreen, PathRail, StartDetail } from './src/ui/screens/GameStartScreen';
import { HubScreen } from './src/ui/screens/HubScreen';
import { LiveLobbyScreen } from './src/ui/screens/LiveLobbyScreen';
import { LivePlayShell } from './src/ui/screens/LivePlayShell';
import { LiveResultsScreen } from './src/ui/screens/LiveResultsScreen';
import { ScoresScreen } from './src/ui/screens/ScoresScreen';
import { TeamsScreen } from './src/ui/screens/TeamsScreen';
import { WordfallScreen } from './src/ui/screens/WordfallScreen';
import { COLUMN_MAX_WIDTH, isWideLayout } from './src/ui/layout';
import { theme } from './src/ui/theme';
import { ensureWebViewport } from './src/ui/webViewport';
import { useAppFonts } from './src/ui/fonts';

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

/** A More or Less run on one level of a label path. */
type MolLevelRef = { path: LabelPathId; number: number };

/** What a finished level run did for its path, for the result screen. */
type MolLevelResult = MolLevelRef & { cleared: boolean; clearedNow: boolean };

type Screen =
  | { name: 'hub' }
  | { name: 'home'; gameId: string }
  | { name: 'lagos' }
  | {
      name: 'game';
      gameId: string;
      seed: number;
      cluelessLevelNumber?: number;
      live?: LiveRun;
      molLevel?: MolLevelRef;
      /** A friend's challenge: their streak to beat on this seed. */
      challenge?: { target: number };
    }
  | {
      name: 'over';
      gameId: string;
      state: GameState;
      entryId: string;
      isNewBest: boolean;
      boosted: boolean;
      events: RewardEvent[];
      molLevel?: MolLevelResult;
      /** The run's starting seed, so sharing it becomes a challenge. */
      runSeed?: number;
      challenge?: { target: number };
    }
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
    const unlockMeta =
      clueless.nextUnlockAt && clueless.availability === 'waiting'
        ? localUnlockCopy(clueless.nextUnlockAt, clueless.now)
        : level.description;
    // One line each: where you are, the path as cubes, and what clearing it
    // unlocks — no heading repeated under another heading.
    return (
      <>
        <StartDetail
          label={clueless.availability === 'waiting' ? `VAULT ${level.number}` : `LEVEL ${level.number}`}
          title={
            clueless.availability === 'waiting'
              ? `Vault ${level.number} is sealed`
              : level.phase === 'daily'
                ? 'Daily Vault'
                : level.name
          }
          meta={unlockMeta}
          accent={accent}
        />
        <PathRail
          cleared={clueless.progress.completedThrough}
          vaultOpen={level.phase === 'daily' && clueless.availability === 'playable'}
        />
        <StartDetail
          label="YOUR PATH"
          title=""
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
        label="WORDFALL"
        title="Campaign levels"
        meta="A new level drops every Monday"
        accent={accent}
      />
    );
  }
  return null;
}

/** More or Less' start pop-up goal: the chosen level of the main label path. */
function WorldLevelCard({
  number,
  progress,
  setLine,
  onLevels,
  onCity,
}: {
  number: number;
  progress: LabelPathProgress;
  /** Popularity's weekly set progress, shown on that level only. */
  setLine: string;
  onLevels: () => void;
  onCity: () => void;
}) {
  const levels = labelPath('world');
  const level = levels[number - 1] ?? levels[0];
  if (!level) return null;
  return (
    <LabelLevelCard
      level={level}
      levelCount={levels.length}
      best={bestStreakFor(progress, level.number)}
      extra={level.categoryId === snapshot.id ? setLine : undefined}
      onLevels={onLevels}
      onCity={onCity}
    />
  );
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
  const [fontsLoaded, fontError] = useAppFonts();
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [streak, setStreak] = useState<DailyStreak>(EMPTY_STREAK);
  const [rewards, setRewards] = useState<RewardsState>(EMPTY_REWARDS);
  const [onboarding, setOnboarding] = useState<OnboardingState | null>(null);
  const [chestOpen, setChestOpen] = useState<{ day: number; coins: number } | null>(null);
  const [feedbackSettings, setFeedbackSettings] =
    useState<FeedbackSettings>(DEFAULT_FEEDBACK_SETTINGS);
  const [analyticsConsent, setAnalyticsConsent] = useState<AnalyticsConsent>('granted');
  const [showFeedback, setShowFeedback] = useState(false);
  const [boardsReady, setBoardsReady] = useState(false);
  const [arrivalReady, setArrivalReady] = useState(false);
  const [profileReady, setProfileReady] = useState(false);
  const [streakReady, setStreakReady] = useState(false);
  const [labelProgress, setLabelProgress] = useState<LabelRoundProgress>(() =>
    emptyProgress(FIRST_ROUND_ID),
  );
  const [labelJustPassed, setLabelJustPassed] = useState(false);
  const [labelPaths, setLabelPaths] = useState<Record<LabelPathId, LabelPathProgress>>({
    world: EMPTY_LABEL_PATH,
    lagos: EMPTY_LABEL_PATH,
  });
  // Mirrors `labelPaths` for callbacks that fire between renders (the
  // per-answer streak bank), so two quick answers cannot read a stale copy.
  const labelPathsRef = useRef(labelPaths);
  labelPathsRef.current = labelPaths;
  // Whether this level run made its first clear, banked before game over.
  const runClearedNow = useRef(false);
  // The level a player picked on each path; null follows the first uncleared one.
  const [labelChoice, setLabelChoice] = useState<Record<LabelPathId, number | null>>({ world: null, lagos: null });
  const [levelsOpen, setLevelsOpen] = useState<LabelPathId | null>(null);
  // The meadow map opened from a run's trail: a view of the journey, not a picker.
  const [runMapOpen, setRunMapOpen] = useState(false);
  const [cluelessMapOpen, setCluelessMapOpen] = useState(false);
  const [lagosSeen, setLagosSeen] = useState(true);
  const [lagosAnnouncement, setLagosAnnouncement] = useState(false);
  // The danfo carrying the player to a level; `board` starts it under the cover.
  const [ride, setRide] = useState<(DanfoRideStop & { board: () => void }) | null>(null);
  // The world path's ride: the animal hopping to the next stone.
  const [hop, setHop] = useState<(MeadowHop & { board: () => void }) | null>(null);
  const rideCount = useRef(0);
  // Opened at /isabilagos: skip the welcome and go straight to the route.
  const arrivedAtLagos = useRef(openedAtLagosPath());
  // Opened from a friend's shared result: offer to replay their run.
  const [challengeOffer, setChallengeOffer] = useState<Challenge | null>(() => {
    const token = shareTokenFromPath(openedAtPathname());
    return token ? challengeFromShare(decodeShareData(token)) : null;
  });
  // Finished the welcome in an earlier session: the "NEW" news is for them.
  const returningPlayer = useRef(false);
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
  const rewardsRef = useRef(rewards);
  rewardsRef.current = rewards;
  const boardsRef = useRef(boards);
  boardsRef.current = boards;
  const historyReady = useRef(false);

  const progress = levelProgress(rewards.xp);
  const todayKey = dayKey(new Date());
  const todayChest = chestStatus(rewards, todayKey);
  const todayChestDay = nextChestDay(rewards, todayKey) ?? (rewards.chest.day >= 1 ? rewards.chest.day : 1);
  const hasScoreHistory = Object.values(boards).some((board) => board.totalRuns > 0);
  const showOnboarding =
    onboarding !== null && !onboarding.completed && boardsReady && !hasScoreHistory && !arrivedAtLagos.current;
  const selectedLevel = (path: LabelPathId): number =>
    labelChoice[path] ?? nextLevelNumber(labelPaths[path], labelPath(path).length);

  const dismissOnboarding = () => {
    setOnboarding(COMPLETED_ONBOARDING);
    void markOnboardingComplete();
  };

  const applyParent = (parent: Parent): Screen => {
    if (parent.name === 'hub') return { name: 'hub' };
    if (parent.name === 'home') return { name: 'home', gameId: parent.gameId };
    if (parent.name === 'lagos') return { name: 'lagos' };
    return { name: 'teams' };
  };

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
    // run does (see finishRun below).
    void loadStreak().then((loadedStreak) => {
      setStreak(loadedStreak);
      setStreakReady(true);
    });
    void loadRewards().then(setRewards);
    void loadOnboarding().then((loaded) => {
      returningPlayer.current = loaded.completed;
      setOnboarding(loaded);
    });
    void loadRoundProgress(FIRST_ROUND_ID).then(setLabelProgress);
    void Promise.all([loadLabelPathProgress('world'), loadLabelPathProgress('lagos')]).then(([world, lagos]) =>
      setLabelPaths({ world, lagos }),
    );
    void loadLagosSeen().then((seen) => {
      setLagosSeen(seen);
      if (arrivedAtLagos.current) {
        setScreen({ name: 'lagos' });
        if (!seen) void markLagosSeen();
        setLagosSeen(true);
      }
    });
    void loadCluelessPathProgress().then((progress) => {
      setCluelessPath(progress);
      setCluelessPathReady(true);
    });
    // Sound/vibration switches. Defaults are on, so a slow read just means the
    // first moment of the session uses the defaults rather than nothing.
    void loadFeedbackSettings().then((stored) => {
      setFeedbackSettings(stored);
      applyFeedbackSettings(stored);
      setMusicEnabled(stored.music);
    });
    void initializeAnalytics().then((storedConsent) => {
      setAnalyticsConsent(storedConsent);
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
  /** The category a level plays. Popularity keeps its weekly set. */
  const levelCategory = (ref: MolLevelRef): CategorySnapshot => {
    const level = labelLevel(ref.path, ref.number);
    if (!level || level.categoryId === snapshot.id) return soloPool;
    return labelCategory(level.categoryId) ?? soloPool;
  };
  const molRef = screen.name === 'game' && screen.gameId === MORE_OR_LESS && !screen.live ? screen.molLevel : undefined;
  const molLevel = molRef ? labelLevel(molRef.path, molRef.number) : undefined;
  const molCategory = molRef ? levelCategory(molRef) : soloPool;
  // Popularity's weekly sets only advance on Popularity runs.
  const molTracksSet = molCategory.id === snapshot.id;
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
    if (gameId === MORE_OR_LESS) {
      startLevel('world');
      return;
    }
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

  /** Boards a level of a label path: More or Less' levels or I Sabi Lagos. */
  const startLevel = (path: LabelPathId, number = selectedLevel(path), challenge?: { seed: number; target: number }) => {
    runClearedNow.current = false;
    setLabelJustPassed(false);
    setLabelChoice((current) => ({ ...current, [path]: number }));
    setScreen({
      name: 'game',
      gameId: MORE_OR_LESS,
      seed: challenge?.seed ?? randomSeed(),
      molLevel: { path, number },
      ...(challenge ? { challenge: { target: challenge.target } } : {}),
    });
  };

  /** Plays a friend's run: their seed, their level, their streak to beat. */
  const acceptChallenge = (offer: Challenge) => {
    setChallengeOffer(null);
    clearSharePath();
    if (showOnboarding) dismissOnboarding();
    captureAnalytics('challenge_accepted', { level_number: offer.level });
    startLevel(offer.path, offer.level, { seed: offer.seed, target: offer.target });
  };

  /**
   * Banks a level's clear and best the moment the streak earns them. Waiting
   * for game over lost a clear to anyone who left during the second-chance
   * offer, or mid-run, after "LEVEL CLEARED!".
   */
  const bankLevelStreak = (ref: MolLevelRef, level: LabelLevel, streak: number) => {
    if (streak < level.targetStreak) return;
    const current = labelPathsRef.current[ref.path];
    const recorded = recordLevelRun(current, level, streak);
    if (recorded.progress === current) return;
    if (recorded.clearedNow) {
      runClearedNow.current = true;
      // A first clear moves the start screen on to the next level.
      setLabelChoice((choice) => ({ ...choice, [ref.path]: null }));
    }
    labelPathsRef.current = { ...labelPathsRef.current, [ref.path]: recorded.progress };
    setLabelPaths(labelPathsRef.current);
    void saveLabelPathProgress(ref.path, recorded.progress);
  };

  /** The Clueless solo path as stones: cleared through `completedThrough`, then yours. */
  const cluelessStones = (): Stone[] =>
    CLUELESS_SOLO_LEVELS.map((level) => ({
      number: level.number,
      name: level.name,
      state:
        level.number <= cluelessPath.completedThrough
          ? 'cleared'
          : level.number === currentCluelessLevelNumber
            ? 'current'
            : 'locked',
    }));

  /** A label path as stones for the trail and the meadow map. */
  const pathStones = (path: LabelPathId, playing?: number): Stone[] => {
    const progress = labelPaths[path];
    return labelPath(path).map((level) => {
      const cleared = progress.clearedThrough >= level.number;
      return {
        number: level.number,
        name: level.name,
        state:
          level.number === playing
            ? 'current'
            : cleared
              ? 'cleared'
              : isLevelUnlocked(progress, level.number)
                ? 'open'
                : 'locked',
        stars: cleared ? levelStars(level.targetStreak, bestStreakFor(progress, level.number)) : undefined,
      };
    });
  };

  /**
   * Boards a level with its game's ride: on the Lagos route the danfo pulls
   * in with the stop's name; on the world path the lion hops along the meadow
   * from the stone just cleared. Then the level shows.
   */
  const rideToLevel = (path: LabelPathId, number = selectedLevel(path)) => {
    const level = labelLevel(path, number);
    if (!level) return;
    if (ride || hop) return;
    rideCount.current += 1;
    const lagos = path === 'lagos';
    const stones = pathStones(path, number);
    const from = stones.find((stone) => stone.number === number - 1);
    const to = stones.find((stone) => stone.number === number);
    if (!lagos && from && to) {
      setHop({ key: rideCount.current, from, to, animal: GAME_ANIMAL[MORE_OR_LESS], board: () => startLevel(path, number) });
      return;
    }
    setRide({
      key: rideCount.current,
      eyebrow: lagos ? `STOP ${level.number}` : `LEVEL ${level.number}`,
      title: lagos ? level.stop ?? level.name : level.name,
      subtitle: lagos ? level.name : undefined,
      lagos,
      board: () => startLevel(path, number),
    });
  };

  const openLagos = () => {
    if (!lagosSeen) {
      setLagosSeen(true);
      void markLagosSeen();
    }
    setLagosAnnouncement(false);
    setScreen({ name: 'lagos' });
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
    return installWebHistory(() => {
      let handled = false;
      setScreen((current) => {
        const parent = parentOf(current);
        if (!parent) return current;
        handled = true;
        return applyParent(parent);
      });
      return handled;
    });
  }, []);

  // Whether this player had scores before this session began, read once when
  // the boards load, so a first run today does not make them "returning".
  const scoresAtLaunch = useRef<boolean | null>(null);
  if (boardsReady && scoresAtLaunch.current === null) scoresAtLaunch.current = hasScoreHistory;
  // Set by the first game of the session: the announcement is for arriving at
  // the hub, not for coming back to it from a run.
  const playedThisSession = useRef(false);
  if (screen.name === 'game') playedThisSession.current = true;

  // A returning player hears about I Sabi Lagos once, on the hub, when they
  // arrive. A first visit already has the welcome; it finds the banner later.
  useEffect(() => {
    const returning = returningPlayer.current || scoresAtLaunch.current === true;
    if (lagosSeen || !returning || playedThisSession.current || screen.name !== 'hub') return;
    const timer = setTimeout(() => setLagosAnnouncement(true), 900);
    return () => clearTimeout(timer);
  }, [lagosSeen, boardsReady, screen.name]);


  // The journey maps belong to the run they were opened from.
  useEffect(() => {
    setRunMapOpen(false);
    setCluelessMapOpen(false);
  }, [screen]);

  // The menu groove everywhere but a game; the play groove inside one.
  useEffect(() => {
    setMusicTrack(screen.name === 'game' ? 'play' : 'menu');
  }, [screen.name]);

  useEffect(() => {
    if (!historyReady.current) historyReady.current = true;
    else noteWebNavigation(parentOf(screen) === null);
    // `/isabilagos` names the Lagos route and its runs, so the address a
    // player copies opens it. Set after the push, so the entry before keeps
    // its own address and browser Back returns to `/`, not to Lagos.
    const inLagos =
      screen.name === 'lagos' ||
      ((screen.name === 'game' || screen.name === 'over') && screen.molLevel?.path === 'lagos');
    syncLagosPath(inLagos);
  }, [screen]);

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
      captureWebPageview();
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
    if (!local.history.some((entry) => needsGlobalSync(entry))) return;

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

  const finishRun = async (input: {
    gameId: string;
    direction: ScoreDirection;
    entry: ScoreEntry;
    summary: (fresh: boolean) => RunSummary;
    clueless?: { tutorialCleared: boolean; vaultsSolved: number };
    wordfall?: { campaignCleared: boolean };
    analytics: Omit<AnalyticsEvents['run_completed'], 'is_new_best' | 'boosted'>;
  }): Promise<RunReward> => {
    const previous = boardsRef.current[input.gameId] ?? EMPTY_BOARD;
    const fresh = isNewBest(previous, input.entry.streak, input.direction);
    const today = dayKey(new Date());
    const [nextBoard, nextStreak] = await Promise.all([
      recordScore(input.gameId, { ...input.entry, boosted: input.entry.boosted === true }, input.direction),
      markPlayedToday(today),
    ]);
    boardsRef.current = { ...boardsRef.current, [input.gameId]: nextBoard };
    setBoards((prev) => ({ ...prev, [input.gameId]: nextBoard }));
    setStreak(nextStreak);
    const applied = applyRun(rewardsRef.current, input.summary(fresh), {
      today,
      dailyStreakAfter: nextStreak.current,
      clueless: input.clueless,
      wordfall: input.wordfall,
    });
    rewardsRef.current = applied.state;
    setRewards(applied.state);
    await saveRewards(applied.state);
    captureAnalytics('run_completed', {
      ...input.analytics,
      is_new_best: fresh,
      boosted: input.entry.boosted === true,
    });
    for (const event of applied.events) {
      if (event.kind === 'levelUp') {
        captureAnalytics('player_level_up', { level_bucket: levelBucket(event.to) });
      }
      if (event.kind === 'milestone') {
        captureAnalytics('milestone_reached', { milestone_id: event.id });
      }
    }
    return {
      events: applied.events,
      isNewBest: fresh,
      boosted: input.entry.boosted === true,
    };
  };

  const spendBoost = (kind: BoostKind, gameId: 'more-or-less' | 'clueless' | 'wordfall'): boolean => {
    const result = spend(rewardsRef.current, kind);
    if (!result.ok) return false;
    rewardsRef.current = result.state;
    setRewards(result.state);
    void saveRewards(result.state);
    captureAnalytics('boost_used', { game_id: gameId, boost_kind: kind });
    feedback('boost');
    return true;
  };

  const openChest = () => {
    const today = dayKey(new Date());
    const claimed = claimChest(rewardsRef.current, today);
    if (claimed.events.length === 0) return;
    rewardsRef.current = claimed.state;
    setRewards(claimed.state);
    void saveRewards(claimed.state);
    const day = claimed.state.chest.day;
    if (day === 1 || day === 2 || day === 3 || day === 4 || day === 5 || day === 6 || day === 7) {
      captureAnalytics('daily_chest_claimed', { chest_day: day });
    }
    feedback('chest');
    const coins = claimed.events.reduce((total, event) => (event.kind === 'coins' ? total + event.amount : total), 0);
    setChestOpen({ day, coins });
  };

  // Game and result screens own the whole viewport, as in the kit: a top bar
  // over a live round is a mis-tap waiting to happen, and a result pop-up sits
  // straight on the dimmed board.
  const playing = screen.name === 'game' || screen.name === 'over' || screen.name === 'live-results';
  const showChrome = !playing;
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
  /**
   * Flips one feedback channel. Applied to the effect layer immediately so the
   * tap that turns sound back on is itself audible, then persisted; a failed
   * write costs the preference next launch, not this session.
   */
  const toggleFeedback = (channel: FeedbackChannel) => {
    const next = toggleChannel(feedbackSettings, channel);
    setFeedbackSettings(next);
    applyFeedbackSettings(next);
    setMusicEnabled(next.music);
    void saveFeedbackSettings(next);
    // Demonstrate what was just switched on. Gating happens inside `feedback`,
    // so enabling vibration buzzes without also making noise, and vice versa.
    // Music demonstrates itself by starting.
    if (next[channel] && channel !== 'music') feedback('correct');
  };

  const chromeBack = (): (() => void) | undefined => {
    if (screen.name === 'hub' || screen.name === 'game' || screen.name === 'over') return undefined;
    const parent = parentOf(screen);
    if (!parent) return undefined;
    return () => setScreen(applyParent(parent));
  };

  /** The result screen's level block, with "Next" wired when there is one. */
  const overLevel = (result: MolLevelResult | undefined) => {
    if (!result) return undefined;
    const level = labelLevel(result.path, result.number);
    if (!level) return undefined;
    const next = labelLevel(result.path, result.number + 1);
    return {
      number: level.number,
      label: result.path === 'lagos' ? level.stop ?? level.name : level.name,
      targetStreak: level.targetStreak,
      cleared: result.cleared,
      clearedNow: result.clearedNow,
      lagos: result.path === 'lagos',
      onNext: next ? () => rideToLevel(result.path, next.number) : undefined,
    };
  };

  /**
   * Quick play from the hub's gold button: the game played most recently,
   * More or Less before anything has been played.
   */
  const quickPlayGameId = (): string => {
    let latest: { gameId: string; at: number } | null = null;
    for (const [gameId, board] of Object.entries(boards)) {
      for (const entry of board.history) {
        const at = Date.parse(entry.playedAt);
        if (Number.isFinite(at) && (!latest || at > latest.at)) latest = { gameId, at };
      }
    }
    return latest && getGame(latest.gameId)?.status === 'available' ? latest.gameId : MORE_OR_LESS;
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
      {/* Full-bleed backdrop: the menu sky, or the calmer play sky behind a
          board and its result pop-up. The column sits on top of it. */}
      <SkyBackground variant={playing ? 'play' : 'sky'} />
      <View style={[styles.frame, wide && styles.frameLaptop]}>
        {showChrome && !showOnboarding && (
          <TopBar
            onBack={chromeBack()}
            left={<StreakPill streak={streak} today={todayKey} />}
            right={<CoinsPill coins={rewards.coins} />}
          />
        )}

        {showOnboarding ? (
          <OnboardingScreen
            onPick={(pick) => {
              dismissOnboarding();
              if (pick === 'lagos') {
                openLagos();
                return;
              }
              captureAnalytics('game_selected', { game_id: pick, source: 'first_visit' });
              openGameHome(pick);
            }}
            onExplore={dismissOnboarding}
          />
        ) : null}

        {screen.name === 'hub' && !showOnboarding && (
          <HubScreen
            boards={boards}
            streak={streak}
            chest={todayChest}
            chestDay={todayChestDay}
            chestClaim={chestOpen}
            onOpenChest={openChest}
            onChestClosed={() => setChestOpen(null)}
            level={progress.level}
            levelProgress={progress.fraction}
            labelRoundsPassed={labelProgress.roundsPassed}
            onPlay={(gameId) => {
              captureAnalytics('game_selected', { game_id: gameId, source: 'hub' });
              openGameHome(gameId);
            }}
            onQuickPlay={() => {
              const gameId = quickPlayGameId();
              captureAnalytics('game_selected', { game_id: gameId, source: 'quick_play' });
              openGameHome(gameId);
            }}
            onScores={() => setScreen({ name: 'scores', gameId: MORE_OR_LESS })}
            onSettings={() => setSettingsOpen(true)}
            onTeams={() => setScreen({ name: 'teams' })}
            onAccount={() => setScreen({ name: 'auth' })}
            onLagos={() => {
              captureAnalytics('game_selected', { game_id: MORE_OR_LESS, source: 'hub' });
              openLagos();
            }}
            lagosFresh={!lagosSeen}
          />
        )}

        {screen.name === 'lagos' && (
          <LagosScreen
            levels={labelPath('lagos')}
            progress={labelPaths.lagos}
            selected={selectedLevel('lagos')}
            onSelect={(number) => setLabelChoice((current) => ({ ...current, lagos: number }))}
            onPlay={() => rideToLevel('lagos')}
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
            trail={screen.live ? undefined : { stones: cluelessStones(), onOpen: () => setCluelessMapOpen(true) }}
            levelName={screen.live ? activeTeamCluelessLevel?.name : activeSoloCluelessLevel?.name}
            pathPhase={screen.live ? 'team' : activeSoloCluelessLevel?.phase}
            hintPolicy={screen.live ? 'none' : activeSoloCluelessLevel?.hintPolicy ?? 'none'}
            hint={screen.live ? null : activeSoloCluelessLevel?.hint}
            persist={!screen.live}
            coins={rewards.coins}
            onSpend={screen.live ? undefined : (kind) => spendBoost(kind, 'clueless')}
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
            onWin={async (guessesUsed, assistanceContext, detail) => {
              if (screen.live) {
                await postMatchScore(screen.live.matchId, guessesUsed, true, true);
                return;
              }
              const level = activeSoloCluelessLevel;
              if (!level) return;
              const entryId = makeEntryId();
              const completedAt = new Date();
              const nextPath = completeCluelessPathLevel(cluelessPath, level.number, completedAt);
              await saveCluelessPathProgress(nextPath);
              setCluelessPath(nextPath);
              setCluelessPathNow(completedAt);
              return finishRun({
                gameId: 'clueless',
                direction: 'lower',
                entry: {
                  id: entryId,
                  streak: guessesUsed,
                  categoryId: assistanceContext,
                  playedAt: completedAt.toISOString(),
                  seed: activeCluelessPuzzle.number,
                  boosted: detail.boosted,
                },
                summary: (fresh) => ({
                  gameId: 'clueless',
                  runId: entryId,
                  levelNumber: level.number,
                  phase: level.phase,
                  guesses: guessesUsed,
                  isNewBest: fresh,
                  boosted: detail.boosted,
                }),
                clueless: {
                  tutorialCleared: nextPath.completedThrough >= 3,
                  vaultsSolved: Math.max(0, nextPath.completedThrough - 3),
                },
                analytics: {
                  game_id: 'clueless',
                  outcome: 'win',
                  score: guessesUsed,
                  score_kind: 'guesses_used',
                  puzzle_number: activeCluelessPuzzle.number,
                  level_number: level.number,
                  path_phase: level.phase,
                  assistance_context: assistanceContext,
                  hint_source: level.hintPolicy,
                },
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
            coins={rewards.coins}
            onSpend={screen.live ? undefined : (kind) => spendBoost(kind, 'wordfall')}
            onLevelWon={async (score, levelNumber, elapsedMs, detail) => {
              if (screen.live) {
                await postMatchScore(screen.live.matchId, score, true, true);
                return;
              }
              const entryId = makeEntryId();
              return finishRun({
                gameId: 'wordfall',
                direction: 'higher',
                entry: {
                  id: entryId,
                  streak: score,
                  categoryId: `level-${levelNumber}`,
                  playedAt: new Date().toISOString(),
                  seed: levelNumber,
                  durationMs: elapsedMs,
                  boosted: detail.boosted,
                },
                summary: (fresh) => ({
                  gameId: 'wordfall',
                  runId: entryId,
                  levelNumber,
                  weekly: detail.weekly,
                  outcome: 'win',
                  movesLeft: detail.movesLeft,
                  moves: detail.moves,
                  timeLeftMs: detail.timeLeftMs,
                  timeLimitMs: detail.timeLimitMs,
                  isNewBest: fresh,
                  boosted: detail.boosted,
                }),
                wordfall: { campaignCleared: !detail.weekly && levelNumber >= 11 },
                analytics: {
                  game_id: 'wordfall',
                  outcome: 'win',
                  score,
                  score_kind: 'points',
                  duration_ms: elapsedMs,
                  level_number: levelNumber,
                },
              });
            }}
            onLevelLost={async (score, levelNumber, elapsedMs, detail) => {
              if (screen.live) return;
              const entryId = makeEntryId();
              return finishRun({
                gameId: 'wordfall',
                direction: 'higher',
                entry: {
                  id: entryId,
                  streak: score,
                  categoryId: `level-${levelNumber}`,
                  playedAt: new Date().toISOString(),
                  seed: levelNumber,
                  durationMs: elapsedMs,
                  boosted: detail.boosted,
                },
                summary: (fresh) => ({
                  gameId: 'wordfall',
                  runId: entryId,
                  levelNumber,
                  weekly: detail.weekly,
                  outcome: 'loss',
                  movesLeft: detail.movesLeft,
                  moves: detail.moves,
                  timeLeftMs: detail.timeLeftMs,
                  timeLimitMs: detail.timeLimitMs,
                  isNewBest: fresh,
                  boosted: detail.boosted,
                }),
                analytics: {
                  game_id: 'wordfall',
                  outcome: 'loss',
                  score,
                  score_kind: 'points',
                  duration_ms: elapsedMs,
                  level_number: levelNumber,
                },
              });
            }}
          />
          </LiveMaybe>
        )}

        {screen.name === 'home' && (
          <GameStartScreen
            gameId={screen.gameId}
            onClose={() => setScreen({ name: 'hub' })}
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
                : screen.gameId === MORE_OR_LESS
                  ? `Play level ${selectedLevel('world')}`
                  : undefined
            }
            onRace={() => {
              if (!profile) setScreen({ name: 'auth', returnTo: 'teams', returnGameId: screen.gameId });
              else setScreen({ name: 'teams' });
            }}
            raceDisabled={!isBackendConfigured}
            raceLabel={isBackendConfigured ? 'Race team' : 'Race (offline)'}
            raceHint={
              isBackendConfigured
                ? `A live race is ${LIVE_ROSTER_LABEL} players on the same board.`
                : undefined
            }
            onScores={() => setScreen({ name: 'scores', gameId: screen.gameId })}
            detail={screen.gameId === MORE_OR_LESS ? (
              <WorldLevelCard
                number={selectedLevel('world')}
                progress={labelPaths.world}
                setLine={`${labelResolved.seenCount} / ${labelResolved.round.itemIds.length} names seen in this set`}
                onLevels={() => setLevelsOpen('world')}
                onCity={openLagos}
              />
            ) : startDetailFor(
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
            category={screen.live ? category : molCategory}
            seed={screen.seed}
            bestStreak={
              molRef ? bestStreakFor(labelPaths[molRef.path], molRef.number) : boardFor(screen.gameId).bestStreak
            }
            persist={!screen.live}
            session={
              screen.challenge ? `challenge:${screen.seed}` : molRef ? `level:${molRef.path}:${molRef.number}` : undefined
            }
            rival={screen.challenge?.target}
            trail={
              molRef?.path === 'world'
                ? {
                    stones: pathStones('world', molRef.number),
                    current: molRef.number,
                    animal: GAME_ANIMAL[MORE_OR_LESS],
                    onOpen: () => setRunMapOpen(true),
                  }
                : undefined
            }
            lagos={molRef?.path === 'lagos'}
            levelGoal={
              molLevel && molRef
                ? {
                    target: molLevel.targetStreak,
                    label:
                      molRef.path === 'lagos'
                        ? `STOP ${molLevel.number} · ${(molLevel.stop ?? molLevel.name).toUpperCase()}`
                        : `LEVEL ${molLevel.number} · ${molLevel.name.toUpperCase()}`,
                    // The danfo drives from this stop toward the next one.
                    stop: labelLevel(molRef.path, molRef.number + 1)?.stop ?? molLevel.stop,
                  }
                : undefined
            }
            labelRound={
              // A challenge replays the friend's pairs exactly, so no unseen-first steering.
              screen.live || !molTracksSet || screen.challenge
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
                : molLevel?.band
            }
            targetStreak={
              screen.live
                ? moreOrLessLevelByNumber(screen.live.levelNumber)?.targetStreak
                : undefined
            }
            onScore={
              screen.live
                ? (score, complete) => {
                    const target = moreOrLessLevelByNumber(screen.live!.levelNumber)?.targetStreak ?? 0;
                    void postMatchScore(screen.live!.matchId, score, target > 0 && score >= target, false);
                  }
                : molRef && molLevel
                  ? (score) => bankLevelStreak(molRef, molLevel, score)
                  : undefined
            }
            onDone={
              screen.live
                ? (score, complete) => {
                    const target = moreOrLessLevelByNumber(screen.live!.levelNumber)?.targetStreak ?? 0;
                    void postMatchScore(screen.live!.matchId, score, target > 0 && score >= target, true);
                  }
                : undefined
            }
            onExit={() =>
              screen.live
                ? setScreen({ name: 'teams' })
                : molRef?.path === 'lagos'
                  ? setScreen({ name: 'lagos' })
                  : setScreen({ name: 'home', gameId: screen.gameId })
            }
            coins={rewards.coins}
            onSpend={screen.live ? undefined : (kind) => spendBoost(kind, 'more-or-less')}
            onGameOver={async (state, detail) => {
              if (screen.live) return;
              const entryId = makeEntryId();
              const playedCategory = molCategory;
              let setCleared = false;
              if (molTracksSet) {
                const roundResult = recordSeen(snapshot, labelProgress, state.seenIds);
                setLabelProgress(roundResult.progress);
                setLabelJustPassed(roundResult.justPassed);
                setCleared = roundResult.justPassed;
                await saveRoundProgress(roundResult.progress);
                if (roundResult.justPassed) {
                  captureAnalytics('label_round_passed', {
                    game_id: 'more-or-less',
                    round_id: labelResolved.round.id,
                    rounds_passed: roundResult.progress.roundsPassed,
                    item_count: labelResolved.round.itemIds.length,
                  });
                }
              } else {
                setLabelJustPassed(false);
              }
              let levelResult: MolLevelResult | undefined;
              if (molRef && molLevel) {
                // Usually already banked mid-run (`bankLevelStreak`); this catches the rest.
                const before = labelPathsRef.current[molRef.path];
                const recorded = recordLevelRun(before, molLevel, state.streak);
                if (recorded.progress !== before) {
                  labelPathsRef.current = { ...labelPathsRef.current, [molRef.path]: recorded.progress };
                  setLabelPaths(labelPathsRef.current);
                  await saveLabelPathProgress(molRef.path, recorded.progress);
                }
                const clearedNow = recorded.clearedNow || runClearedNow.current;
                // A first clear moves the start screen on to the next level.
                if (clearedNow) setLabelChoice((current) => ({ ...current, [molRef.path]: null }));
                levelResult = {
                  ...molRef,
                  cleared: state.streak >= molLevel.targetStreak,
                  clearedNow,
                };
              }
              const reward = await finishRun({
                gameId: screen.gameId,
                direction: 'higher',
                entry: {
                  id: entryId,
                  streak: state.streak,
                  categoryId: playedCategory.id,
                  playedAt: new Date().toISOString(),
                  seed: screen.seed,
                  boosted: detail.boosted,
                },
                summary: (fresh) => ({
                  gameId: 'more-or-less',
                  runId: entryId,
                  streak: state.streak,
                  isNewBest: fresh,
                  setCleared,
                  boosted: detail.boosted,
                  ...(molRef && molLevel
                    ? { level: { key: `${molRef.path}:${molRef.number}`, targetStreak: molLevel.targetStreak } }
                    : {}),
                }),
                analytics: {
                  game_id: 'more-or-less',
                  outcome: 'loss',
                  score: state.streak,
                  score_kind: 'streak',
                  category_id: playedCategory.id,
                  relaxed_rounds: state.relaxedRounds,
                  ...(molRef ? { level_number: molRef.number } : {}),
                },
              });
              setScreen({
                name: 'over',
                gameId: screen.gameId,
                state,
                entryId,
                isNewBest: reward.isNewBest,
                boosted: reward.boosted,
                events: reward.events,
                molLevel: levelResult,
                runSeed: screen.seed,
                ...(screen.challenge ? { challenge: screen.challenge } : {}),
              });
              if (screen.challenge && molRef) {
                captureAnalytics('challenge_finished', {
                  level_number: molRef.number,
                  outcome: challengeVerdict(screen.challenge.target, state.streak),
                });
              }
            }}
          />
          </LiveMaybe>
        )}

        {screen.name === 'teams' && (
          <TeamsScreen
            profile={profile}
            pendingInviteCode={pendingInvite}
            onNeedAuth={() => setScreen({ name: 'auth', returnTo: 'teams', returnGameId: activeGameId })}
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
            onDone={async () => {
              setScreen({ name: 'teams' });
            }}
          />
        )}

        {screen.name === 'over' && (
          <GameOverScreen
            state={screen.state}
            category={screen.molLevel ? levelCategory(screen.molLevel) : soloPool}
            board={boardFor(screen.gameId)}
            labelRound={
              screen.molLevel && levelCategory(screen.molLevel).id !== snapshot.id
                ? undefined
                : {
                    roundsPassed: labelProgress.roundsPassed,
                    remaining: labelResolved.remaining,
                    justPassed: labelJustPassed,
                    caughtUp: labelResolved.caughtUp,
                  }
            }
            level={overLevel(screen.molLevel)}
            challengeRun={
              screen.molLevel && screen.runSeed !== undefined
                ? { seed: screen.runSeed, path: screen.molLevel.path, level: screen.molLevel.number }
                : undefined
            }
            rival={screen.challenge?.target}
            isNewBest={screen.isNewBest}
            boosted={screen.boosted}
            events={screen.events}
            onPlayAgain={() => {
              captureAnalytics('game_over_action', {
                game_id: 'more-or-less',
                action: 'play_again',
                streak_bucket: streakBucket(screen.state.streak),
                is_new_best: screen.isNewBest,
              });
              if (screen.molLevel && screen.challenge && screen.runSeed !== undefined) {
                // A rematch: the same friend's pairs, the same streak to beat.
                startLevel(screen.molLevel.path, screen.molLevel.number, { seed: screen.runSeed, target: screen.challenge.target });
              } else if (screen.molLevel) startLevel(screen.molLevel.path, screen.molLevel.number);
              else startGame(screen.gameId);
            }}
            onHome={() => {
              captureAnalytics('game_over_action', {
                game_id: 'more-or-less',
                action: 'home',
                streak_bucket: streakBucket(screen.state.streak),
                is_new_best: screen.isNewBest,
              });
              setScreen(screen.molLevel?.path === 'lagos' ? { name: 'lagos' } : { name: 'hub' });
            }}
            onScores={() => {
              captureAnalytics('game_over_action', {
                game_id: 'more-or-less',
                action: 'scores',
                streak_bucket: streakBucket(screen.state.streak),
                is_new_best: screen.isNewBest,
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
          />
        )}

        {screen.name === 'auth' && (
          <AccountScreen
            profile={profile}
            isRaceIntent={screen.returnTo === 'teams'}
            onAuthed={(p) => {
              identifyAnalytics(p);
              identifiedProfileId.current = p.id;
              setProfile(p);
              if (screen.returnTo === 'teams') setScreen({ name: 'teams' });
              else setScreen({ name: 'scores', gameId: screen.returnGameId ?? MORE_OR_LESS });
            }}
            onSignOut={async () => {
              await signOut();
              captureAnalytics('signed_out', {});
              resetAnalytics();
              identifiedProfileId.current = null;
              setProfile(null);
              registerAnalyticsContext('guest');
            }}
            analyticsConsent={analyticsConsent}
            onToggleAnalytics={(consent) => {
              void persistAnalyticsConsent(consent, 'settings').then(() =>
                setAnalyticsConsent(consent),
              );
            }}
            onSkip={
              screen.returnTo === 'teams'
                ? () => {
                    captureAnalytics('auth_skipped', {});
                    // Back to the game start screen they came from
                    setScreen({ name: 'home', gameId: screen.returnGameId ?? 'wordfall' });
                  }
                : () => {
                    captureAnalytics('auth_skipped', {});
                    setScreen({ name: 'hub' });
                  }
            }
          />
        )}

        {levelsOpen === 'world' ? (
          <MeadowMap
            visible
            title="LEVELS"
            stones={pathStones('world', selectedLevel('world'))}
            current={selectedLevel('world')}
            animal={GAME_ANIMAL[MORE_OR_LESS]}
            onClose={() => setLevelsOpen(null)}
            onSelect={(number) => {
              setLabelChoice((current) => ({ ...current, world: number }));
              setLevelsOpen(null);
            }}
          />
        ) : null}
        {runMapOpen && molRef ? (
          <MeadowMap
            visible
            title="YOUR JOURNEY"
            stones={pathStones(molRef.path, molRef.number)}
            current={molRef.number}
            animal={GAME_ANIMAL[MORE_OR_LESS]}
            onClose={() => setRunMapOpen(false)}
          />
        ) : null}
        {cluelessMapOpen ? (
          <MeadowMap
            visible
            title="YOUR CASES"
            stones={cluelessStones()}
            current={currentCluelessLevelNumber}
            animal={GAME_ANIMAL.clueless}
            onClose={() => setCluelessMapOpen(false)}
          />
        ) : null}
        {levelsOpen === 'lagos' ? (
          <LabelLevelsPopup
            visible
            onClose={() => setLevelsOpen(null)}
            title={levelsOpen === 'lagos' ? 'Stops' : 'Levels'}
            levels={labelPath(levelsOpen)}
            progress={labelPaths[levelsOpen]}
            selected={selectedLevel(levelsOpen)}
            lagos={levelsOpen === 'lagos'}
            onSelect={(number) => {
              const path = levelsOpen;
              setLabelChoice((current) => ({ ...current, [path]: number }));
              setLevelsOpen(null);
            }}
          />
        ) : null}
        <ChallengePopup
          challenge={boardsReady ? challengeOffer : null}
          levelName={challengeOffer ? labelLevel(challengeOffer.path, challengeOffer.level)?.name ?? 'a level' : ''}
          onAccept={() => {
            if (challengeOffer) acceptChallenge(challengeOffer);
          }}
          onDecline={() => {
            setChallengeOffer(null);
            clearSharePath();
          }}
        />
        <LagosAnnouncement
          // One pop-up at a time: iOS will not present a second sibling modal.
          visible={
            lagosAnnouncement &&
            challengeOffer === null &&
            screen.name === 'hub' &&
            !showOnboarding &&
            !settingsOpen &&
            !showFeedback &&
            chestOpen === null &&
            levelsOpen === null
          }
          onEnter={openLagos}
          onLater={() => {
            setLagosAnnouncement(false);
            setLagosSeen(true);
            void markLagosSeen();
          }}
        />
        <SettingsPopup
          visible={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          feedbackSettings={feedbackSettings}
          onToggleFeedback={toggleFeedback}
          signedInAs={profile?.username ?? null}
          onAccount={() => {
            setSettingsOpen(false);
            setScreen({ name: 'auth', returnGameId: activeGameId });
          }}
          onScores={() => {
            setSettingsOpen(false);
            setScreen({ name: 'scores', gameId: activeGameId ?? MORE_OR_LESS });
          }}
          onTeams={() => {
            setSettingsOpen(false);
            setScreen({ name: 'teams' });
          }}
          canSendFeedback={isFeedbackConfigured()}
          onSendFeedback={() => {
            setSettingsOpen(false);
            afterModalClose(() => setShowFeedback(true));
          }}
          version={appConfig.expo.version}
        />
        <FeedbackPrompt
          visible={showFeedback}
          identity={toFeedbackIdentity(profile)}
          onClose={() => setShowFeedback(false)}
        />
        <DanfoRide ride={ride} onCovered={() => ride?.board()} onDone={() => setRide(null)} />
        <MeadowRide ride={hop} onCovered={() => hop?.board()} onDone={() => setHop(null)} />
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
  frame: {
    flex: 1,
    alignSelf: 'stretch',
    width: '100%',
    overflow: 'hidden',
  },
  frameLaptop: {
    maxWidth: COLUMN_MAX_WIDTH,
    alignSelf: 'center',
  },
});
