import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { Profile } from '../../auth/auth';
import { getGame } from '../../games/registry';
import {
  loadGlobalLeaderboard,
  type GlobalLeaderboardResult,
  type GlobalScore,
} from '../../scores/global';
import { boardForContexts, topScores, type ScoreBoard } from '../../scores/types';
import {
  Badge,
  Button,
  CreamBox,
  CreamText,
  EmptyState,
  GameArtwork,
  GlossFace,
  Panel,
  PanelText,
  Stat,
  StrokeText,
  TabSwitch,
} from '../components';
import { font, formatDuration, palette, space, tone, toneFrom, type GlossTone } from '../theme';

type Props = {
  gameId: string;
  board: ScoreBoard;
  onBack: () => void;
  /** Highlights the run just finished, so a player can find themselves in the list. */
  highlightId?: string;
  profile: Profile | null;
  backendConfigured: boolean;
  onSignIn: () => void;
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

const BOARD_TABS = [
  { id: 'global', label: 'Global' },
  { id: 'local', label: 'On this device' },
] as const;

/** Gold, silver, bronze medal discs; everyone else on sky. */
const MEDAL: readonly GlossTone[] = [tone.gold, tone.grey, toneFrom('#D9822B')];

/**
 * The kit's leaderboard pop-up: tabs as small glossy buttons, the player's
 * standing in two cream boxes, and every run as a cream row led by a medal
 * disc. The X goes back to the hub.
 */
export function ScoresScreen({
  gameId,
  board,
  onBack,
  highlightId,
  profile,
  backendConfigured,
  onSignIn,
  scoreContexts,
  initialScoreContext,
  roundsPassed,
}: Props) {
  const game = getGame(gameId);
  const [scoreContext, setScoreContext] = useState(initialScoreContext ?? scoreContexts?.[0]?.id);
  const activeContext = scoreContexts?.find((context) => context.id === scoreContext);
  const visibleBoard = activeContext
    ? boardForContexts(board, [activeContext.id, ...(activeContext.localAliases ?? [])], game?.scoreDirection)
    : board;
  const top = topScores(visibleBoard, 10, game?.scoreDirection);
  const scoreNoun = game?.scoreNoun ?? 'rounds';
  const accent = game?.accent ?? palette.green;
  const gameName = game?.name ?? 'this game';
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
    void loadGlobalLeaderboard(gameId, 50, scoreContext).then((result) => setGlobal(globalStateFrom(result)));
  };

  const myGlobal = profile ? global.entries.find((entry) => entry.playerId === profile.id) : undefined;

  const footer = (
    <>
      {profile ? null : backendConfigured ? (
        <Button title="Sign in to join the global board" tone="blue" size="md" onPress={onSignIn} />
      ) : null}
      <PanelText>
        {tab === 'global'
          ? 'Global ranks show each player’s best run for this game.'
          : 'Local history stays on this device and works offline.'}
      </PanelText>
    </>
  );

  return (
    <View style={styles.root}>
      <Panel title="Leaderboard" onClose={onBack} closeLabel="Back to all games" scroll footer={footer} style={styles.panel}>
        <View style={styles.gameRow}>
          <GameArtwork gameId={gameId} accent={accent} size={52} />
          <PanelText variant="heading" align="left" style={styles.flex}>
            {gameName}
          </PanelText>
        </View>

        <TabSwitch options={BOARD_TABS} value={tab} onChange={setTab} />
        {scoreContexts ? (
          <TabSwitch
            options={scoreContexts.map((context) => ({ id: context.id, label: context.label }))}
            value={scoreContext}
            onChange={setScoreContext}
          />
        ) : null}

        <View style={styles.stats}>
          <CreamBox style={styles.flex}>
            <Stat
              value={tab === 'global' ? (myGlobal ? `#${myGlobal.rank}` : '—') : visibleBoard.bestStreak}
              label={tab === 'global' ? 'YOUR GLOBAL RANK' : `BEST ${scoreNoun.toUpperCase()}`}
            />
          </CreamBox>
          <CreamBox style={styles.flex}>
            <Stat
              value={tab === 'global' ? visibleBoard.bestStreak : visibleBoard.totalRuns}
              label={tab === 'global' ? 'YOUR LOCAL BEST' : 'RUNS PLAYED'}
            />
          </CreamBox>
          {tab === 'local' && roundsPassed !== undefined ? (
            <CreamBox style={styles.flex}>
              <Stat value={roundsPassed} label="SETS PASSED" />
            </CreamBox>
          ) : null}
        </View>

        {tab === 'global' ? (
          <GlobalRows state={global} scoreNoun={scoreNoun} profile={profile} gameName={gameName} onRefresh={refreshGlobal} />
        ) : top.length === 0 ? (
          <EmptyState
            title="Your first score is waiting"
            body={`Finish a ${gameName} run and it’ll appear here, even when you’re offline.`}
            art={<GameArtwork gameId={gameId} accent={accent} size={54} />}
          />
        ) : (
          <View style={styles.rows}>
            {top.map((entry, index) => (
              <ScoreRow
                key={entry.id}
                rank={index + 1}
                title={`${entry.streak.toLocaleString('en-US')} ${scoreNoun}`}
                detail={`${formatDate(entry.playedAt)}${entry.durationMs !== undefined ? ` · ${formatDuration(entry.durationMs)}` : ''}`}
                highlight={entry.id === highlightId}
                badges={[
                  ...(entry.boosted ? [{ label: 'BOOSTED', tone: 'warning' as const }] : []),
                  ...(entry.id === highlightId ? [{ label: 'THIS RUN', tone: 'danger' as const }] : []),
                ]}
              />
            ))}
          </View>
        )}
      </Panel>
    </View>
  );
}

function globalStateFrom(result: GlobalLeaderboardResult): GlobalState {
  return result.ok ? { status: 'ready', entries: result.entries } : { status: 'error', entries: [], reason: result.reason };
}

function GlobalRows({
  state,
  scoreNoun,
  profile,
  gameName,
  onRefresh,
}: {
  state: GlobalState;
  scoreNoun: string;
  profile: Profile | null;
  gameName: string;
  onRefresh: () => void;
}) {
  if (state.status === 'loading' && state.entries.length === 0) {
    return (
      <CreamBox style={styles.loading}>
        <ActivityIndicator color={palette.teal} size="large" />
        <CreamText>Loading global ranks…</CreamText>
      </CreamBox>
    );
  }

  if (state.status === 'error') {
    const unconfigured = state.reason === 'unconfigured';
    return (
      <EmptyState
        title={unconfigured ? 'Global board needs setup' : 'Couldn’t load global ranks'}
        body={
          unconfigured
            ? 'Online services aren’t configured in this build. Your device scores are still safe.'
            : 'Check your connection and try again. Your local scores are unaffected.'
        }
        actionLabel={unconfigured ? undefined : 'Try again'}
        onAction={unconfigured ? undefined : onRefresh}
      />
    );
  }

  if (state.entries.length === 0) {
    return <EmptyState title="The board is wide open" body={`Be the first player to post a ${gameName} score.`} />;
  }

  return (
    <View style={styles.rows}>
      {state.entries.map((entry) => {
        const mine = entry.playerId === profile?.id;
        return (
          <ScoreRow
            key={entry.id}
            rank={entry.rank}
            title={entry.displayName}
            detail={`${entry.score.toLocaleString('en-US')} ${scoreNoun} · ${formatDate(entry.playedAt)}${
              entry.durationMs !== null ? ` · ${formatDuration(entry.durationMs)}` : ''
            }`}
            highlight={mine}
            badges={mine ? [{ label: 'YOU', tone: 'danger' }] : []}
          />
        );
      })}
      <Button title={state.status === 'loading' ? 'Refreshing…' : 'Refresh'} tone="sky" size="sm" onPress={onRefresh} disabled={state.status === 'loading'} />
    </View>
  );
}

function ScoreRow({
  rank,
  title,
  detail,
  highlight,
  badges,
}: {
  rank: number;
  title: string;
  detail: string;
  highlight: boolean;
  badges: { label: string; tone: 'warning' | 'danger' }[];
}) {
  const face = MEDAL[rank - 1] ?? tone.sky;
  return (
    <CreamBox tint={highlight ? '#FFF3B8' : undefined} style={[styles.row, highlight && styles.rowMine]}>
      <View style={styles.rowInner} accessible accessibilityLabel={`Rank ${rank}, ${title}, ${detail}`}>
        <GlossFace tone={face} lip={3} radius={20} raised={false} faceStyle={styles.medal}>
          <StrokeText size={rank > 99 ? 12 : 16} stroke={face.outline} strokeWidth={1.5} depth={1}>
            {rank}
          </StrokeText>
        </GlossFace>
        <View style={styles.flex}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.rowDetail} numberOfLines={1}>
            {detail}
          </Text>
        </View>
        {badges.map((badge) => (
          <Badge key={badge.label} label={badge.label} tone={badge.tone} />
        ))}
      </View>
    </CreamBox>
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
  root: {
    flex: 1,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    paddingHorizontal: space.md,
    paddingTop: space.lg,
    paddingBottom: space.md,
  },
  panel: { flex: 1 },
  gameRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  flex: { flex: 1, minWidth: 0 },
  stats: { flexDirection: 'row', gap: space.sm },
  rows: { gap: space.sm },
  row: { paddingVertical: space.xs + 2, paddingHorizontal: space.sm },
  rowMine: { borderColor: palette.goldDeep },
  rowInner: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  medal: { width: 40, height: 40 },
  rowTitle: { fontFamily: font.black, fontSize: 16, lineHeight: 20, color: palette.ink },
  rowDetail: { fontFamily: font.body, fontSize: 12, lineHeight: 16, color: palette.inkSoft },
  loading: { alignItems: 'center', gap: space.sm, paddingVertical: space.lg },
});
