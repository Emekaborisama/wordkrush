import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { Profile } from '../../auth/auth';
import { getGame } from '../../games/registry';
import {
  loadGlobalLeaderboard,
  type GlobalLeaderboardResult,
  type GlobalScore,
} from '../../scores/global';
import {
  boardForContexts,
  topScores,
  type ScoreBoard,
  type ScoreEntry,
} from '../../scores/types';
import {
  Badge,
  Button,
  EmptyState,
  GameArtwork,
  PressableScale,
  Stat,
  Surface,
} from '../components';
import { font, formatDuration, radius, space, theme, type, withAlpha } from '../theme';

type Props = {
  gameId: string;
  board: ScoreBoard;
  onBack: () => void;
  /** Highlights the run just finished, so a player can find themselves in the list. */
  highlightId?: string;
  profile: Profile | null;
  backendConfigured: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  scoreContexts?: {
    id: string;
    label: string;
    /** Additional local-only aliases retained for backwards compatibility. */
    localAliases?: string[];
  }[];
  initialScoreContext?: string;
  roundsPassed?: number;
};

type BoardTab = 'global' | 'local';
type GlobalState =
  | { status: 'loading'; entries: GlobalScore[] }
  | { status: 'ready'; entries: GlobalScore[] }
  | { status: 'error'; entries: GlobalScore[]; reason: 'unconfigured' | 'unavailable' };

export function ScoresScreen({
  gameId,
  board,
  onBack,
  highlightId,
  profile,
  backendConfigured,
  onSignIn,
  onSignOut,
  scoreContexts,
  initialScoreContext,
  roundsPassed,
}: Props) {
  const game = getGame(gameId);
  const [scoreContext, setScoreContext] = useState(
    initialScoreContext ?? scoreContexts?.[0]?.id,
  );
  const activeContext = scoreContexts?.find((context) => context.id === scoreContext);
  const visibleBoard = activeContext
    ? boardForContexts(
        board,
        [activeContext.id, ...(activeContext.localAliases ?? [])],
        game?.scoreDirection,
      )
    : board;
  const top = topScores(visibleBoard, 10, game?.scoreDirection);
  const scoreNoun = game?.scoreNoun ?? 'rounds';
  const accent = game?.accent ?? theme.accent;
  const [tab, setTab] = useState<BoardTab>(backendConfigured ? 'global' : 'local');
  const [global, setGlobal] = useState<GlobalState>({ status: 'loading', entries: [] });
  const syncedCount = visibleBoard.history.filter((entry) => entry.synced).length;

  useEffect(() => {
    if (tab !== 'global') return;
    let active = true;
    // Context changes must not display Easy rows under an Expert heading while
    // the next request is in flight.
    setGlobal({ status: 'loading', entries: [] });
    void loadGlobalLeaderboard(gameId, 50, scoreContext).then((result) => {
      if (active) setGlobal(globalStateFrom(result));
    });
    return () => {
      active = false;
    };
  }, [gameId, tab, syncedCount, scoreContext]);

  const refreshGlobal = () => {
    setGlobal((current) => ({ status: 'loading', entries: current.entries }));
    void loadGlobalLeaderboard(gameId, 50, scoreContext).then((result) =>
      setGlobal(globalStateFrom(result)),
    );
  };

  const myGlobal = profile
    ? global.entries.find((entry) => entry.playerId === profile.id)
    : undefined;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <GameArtwork gameId={gameId} accent={accent} size={64} raised />
        <View style={styles.headerCopy}>
          <Text style={[type.overline, { color: accent }]}>LEADERBOARDS</Text>
          <Text style={styles.title}>{game?.name ?? 'Your'} scores</Text>
        </View>
      </View>

      <Surface level={1} radius={radius.md} padded={false} style={styles.tabs}>
        <BoardTabButton label="Global" active={tab === 'global'} onPress={() => setTab('global')} />
        <BoardTabButton
          label="On this device"
          active={tab === 'local'}
          onPress={() => setTab('local')}
        />
      </Surface>

      {scoreContexts ? (
        <Surface level={1} radius={radius.md} padded={false} style={styles.tabs}>
          {scoreContexts.map((context) => (
            <BoardTabButton
              key={context.id}
              label={context.label}
              active={scoreContext === context.id}
              onPress={() => setScoreContext(context.id)}
            />
          ))}
        </Surface>
      ) : null}

      <Surface
        level={2}
        borderColor={withAlpha(accent, 0.4)}
        radius={radius.lg}
        style={styles.statsRow}
      >
        <Stat
          value={
            tab === 'global' ? (myGlobal ? `#${myGlobal.rank}` : '—') : visibleBoard.bestStreak
          }
          label={tab === 'global' ? 'YOUR GLOBAL RANK' : `BEST ${scoreNoun.toUpperCase()}`}
          size="lg"
          color={accent}
        />
        <View style={styles.divider} />
        <Stat
          value={tab === 'global' ? visibleBoard.bestStreak : visibleBoard.totalRuns}
          label={tab === 'global' ? 'YOUR LOCAL BEST' : 'RUNS PLAYED'}
          size="lg"
        />
        {tab === 'local' && roundsPassed !== undefined ? (
          <>
            <View style={styles.divider} />
            <Stat value={roundsPassed} label="ROUNDS PASSED" size="lg" color={accent} />
          </>
        ) : null}
      </Surface>

      {tab === 'global' ? (
        <GlobalBoard
          state={global}
          scoreNoun={scoreNoun}
          accent={accent}
          profile={profile}
          gameName={game?.name ?? 'this game'}
          onRefresh={refreshGlobal}
        />
      ) : (
        <LocalBoard
          entries={top}
          scoreNoun={scoreNoun}
          accent={accent}
          highlightId={highlightId}
          gameId={gameId}
          gameName={game?.name ?? 'this game'}
        />
      )}

      <View style={styles.footer}>
        {profile ? (
          <Surface level={1} borderColor={theme.border} radius={radius.md} style={styles.accountRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.accountName}>{profile.username}</Text>
              <Text style={styles.accountNote}>Signed in · eligible runs sync globally</Text>
            </View>
            <Pressable onPress={onSignOut} hitSlop={8} accessibilityRole="button">
              <Text style={styles.signOut}>Sign out</Text>
            </Pressable>
          </Surface>
        ) : backendConfigured ? (
          <Button title="Sign in to join the global board" variant="tonal" color={accent} onPress={onSignIn} />
        ) : null}

        <Text style={styles.footerNote}>
          {tab === 'global'
            ? 'Global ranks show each player’s best run for this game.'
            : 'Local history stays on this device and works offline.'}
        </Text>

        <Button title="Back to all games" variant="outline" onPress={onBack} />
      </View>
    </View>
  );
}

function globalStateFrom(result: GlobalLeaderboardResult): GlobalState {
  return result.ok
    ? { status: 'ready', entries: result.entries }
    : { status: 'error', entries: [], reason: result.reason };
}

function BoardTabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      style={[styles.tab, active && styles.tabActive]}
    >
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </PressableScale>
  );
}

function LocalBoard({
  entries,
  scoreNoun,
  accent,
  highlightId,
  gameId,
  gameName,
}: {
  entries: ScoreEntry[];
  scoreNoun: string;
  accent: string;
  highlightId?: string;
  gameId: string;
  gameName: string;
}) {
  if (entries.length === 0) {
    return (
      <View style={styles.empty}>
        <EmptyState
          title="Your first score is waiting"
          body={`Finish a ${gameName} run and it’ll appear here, even when you’re offline.`}
          accent={accent}
          art={<GameArtwork gameId={gameId} accent={accent} size={54} />}
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
      <Text style={[type.overline, styles.listLabel]}>TOP RUNS ON THIS DEVICE</Text>
      {entries.map((entry, index) => {
        const highlighted = entry.id === highlightId;
        return (
          <Surface
            key={entry.id}
            level={highlighted ? 3 : 2}
            borderColor={highlighted ? accent : undefined}
            radius={radius.md}
            style={styles.row}
          >
            <Rank rank={index + 1} accent={accent} />
            <View style={styles.rowMain}>
              <ScoreValue score={entry.streak} scoreNoun={scoreNoun} />
              <Text style={styles.rowDate}>
                {formatDate(entry.playedAt)}
                {entry.durationMs !== undefined && ` · ${formatDuration(entry.durationMs)}`}
              </Text>
            </View>
            {highlighted ? <Badge label="THIS RUN" color={accent} /> : null}
          </Surface>
        );
      })}
    </ScrollView>
  );
}

function GlobalBoard({
  state,
  scoreNoun,
  accent,
  profile,
  gameName,
  onRefresh,
}: {
  state: GlobalState;
  scoreNoun: string;
  accent: string;
  profile: Profile | null;
  gameName: string;
  onRefresh: () => void;
}) {
  if (state.status === 'loading' && state.entries.length === 0) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={accent} size="large" />
        <Text style={styles.loadingText}>Loading global ranks…</Text>
      </View>
    );
  }

  if (state.status === 'error') {
    const unconfigured = state.reason === 'unconfigured';
    return (
      <View style={styles.empty}>
        <EmptyState
          title={unconfigured ? 'Global board needs setup' : 'Couldn’t load global ranks'}
          body={
            unconfigured
              ? 'Online services aren’t configured in this build. Your device scores are still safe.'
              : 'Check your connection and try again. Your local scores are unaffected.'
          }
          accent={accent}
          actionLabel={unconfigured ? undefined : 'Try again'}
          onAction={unconfigured ? undefined : onRefresh}
        />
      </View>
    );
  }

  if (state.entries.length === 0) {
    return (
      <View style={styles.empty}>
        <EmptyState
          title="The board is wide open"
          body={`Be the first player to post a ${gameName} score.`}
          accent={accent}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.list}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl
          refreshing={state.status === 'loading'}
          onRefresh={onRefresh}
          tintColor={accent}
        />
      }
    >
      <Text style={[type.overline, styles.listLabel]}>GLOBAL BESTS</Text>
      {state.entries.map((entry) => {
        const mine = entry.playerId === profile?.id;
        return (
          <Surface
            key={entry.id}
            level={mine ? 3 : 2}
            borderColor={mine ? accent : undefined}
            radius={radius.md}
            style={styles.row}
          >
            <Rank rank={entry.rank} accent={accent} />
            <View style={styles.rowMain}>
              <Text style={styles.playerName} numberOfLines={1}>
                {entry.displayName}
              </Text>
              <Text style={styles.rowDate}>
                {formatDate(entry.playedAt)}
                {entry.durationMs !== null && ` · ${formatDuration(entry.durationMs)}`}
              </Text>
            </View>
            <View style={styles.globalScore}>
              <ScoreValue score={entry.score} scoreNoun={scoreNoun} />
              {mine ? <Badge label="YOU" color={accent} /> : null}
            </View>
          </Surface>
        );
      })}
    </ScrollView>
  );
}

function Rank({ rank, accent }: { rank: number; accent: string }) {
  return (
    <View style={[styles.rank, rank <= 3 && { backgroundColor: withAlpha(accent, 0.15) }]}>
      <Text style={[styles.rankText, rank <= 3 && { color: accent }]}>{rank}</Text>
    </View>
  );
}

function ScoreValue({ score, scoreNoun }: { score: number; scoreNoun: string }) {
  return (
    <Text style={styles.rowStreak}>
      {score.toLocaleString('en-US')}
      <Text style={styles.rowUnit}> {scoreNoun.toUpperCase()}</Text>
    </Text>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const mins = Math.floor((now - d.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg, padding: space.lg, gap: space.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingTop: space.xs },
  headerCopy: { flex: 1 },
  title: { ...type.title, color: theme.text, fontSize: 26, lineHeight: 31, marginTop: 1 },
  tabs: { flexDirection: 'row', padding: 4 },
  tab: {
    flex: 1,
    minHeight: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: { backgroundColor: theme.cardHigh },
  tabText: { color: theme.textDim, fontFamily: font.medium, fontSize: 13, fontWeight: '500' },
  tabTextActive: { color: theme.text, fontFamily: font.semibold, fontWeight: '600' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  divider: { height: 44, width: 1, backgroundColor: theme.border },

  list: { flex: 1 },
  listContent: { gap: space.sm, paddingVertical: space.xs },
  listLabel: { color: theme.textDim, marginBottom: 2 },
  rowUnit: { ...type.caption, color: theme.textDim, fontWeight: '700', fontSize: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  rank: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: theme.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { color: theme.textDim, fontFamily: font.bold, fontSize: 14, fontWeight: '700' },
  rowMain: { flex: 1 },
  playerName: {
    color: theme.text,
    fontFamily: font.semibold,
    fontSize: 15,
    fontWeight: '600',
  },
  globalScore: { alignItems: 'flex-end', gap: 2 },
  rowStreak: { color: theme.text, fontFamily: font.semibold, fontSize: 16, fontWeight: '600' },
  rowDate: { color: theme.textDim, fontFamily: font.medium, fontSize: 11, marginTop: 2 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md },
  loadingText: { ...type.caption, color: theme.textMuted },

  footer: { gap: space.sm },
  accountRow: { flexDirection: 'row', alignItems: 'center' },
  accountName: { color: theme.text, fontFamily: font.bold, fontSize: 14, fontWeight: '700' },
  accountNote: { color: theme.textDim, fontFamily: font.medium, fontSize: 10, marginTop: 2 },
  signOut: { color: theme.danger, fontFamily: font.semibold, fontSize: 12, fontWeight: '600' },
  footerNote: { color: theme.textDim, fontFamily: font.medium, fontSize: 11, textAlign: 'center', lineHeight: 16, opacity: 0.8 },
});
