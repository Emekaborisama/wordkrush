import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { captureAnalytics } from '../../analytics/client';
import { LIVE_MAX_PLAYERS, LIVE_MIN_PLAYERS, playerCountBucket } from '../../games/campaign';
import { getGame } from '../../games/registry';
import {
  cancelMatch,
  joinMatch,
  leaveMatch,
  setReady,
  startMatch,
} from '../../live/api';
import { pathRowByNumber } from '../../live/catalog';
import type { LiveMatchSnapshot } from '../../live/types';
import { useMatch } from '../../live/useMatch';
import { Button, FeedbackBanner, Ribbon, RoundIconButton, Surface } from '../components';
import { palette, screen, space, theme, type } from '../theme';

type Props = {
  matchId: string;
  playerId: string;
  onRacing: (snapshot: LiveMatchSnapshot) => void;
  onExit: () => void;
};

export function LiveLobbyScreen({ matchId, playerId, onRacing, onExit }: Props) {
  const { snapshot, error, refresh } = useMatch(matchId);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!snapshot) return;
    const self = snapshot.players.some((player) => player.playerId === playerId);
    if (!self && snapshot.match.status === 'lobby') {
      void joinMatch(matchId).then((result) => {
        if (!result.ok) setActionError(result.error);
        else void refresh();
      });
    }
  }, [snapshot, matchId, playerId, refresh]);

  useEffect(() => {
    if (snapshot?.match.status === 'racing' && snapshot.match.seed != null) {
      onRacing(snapshot);
    }
  }, [snapshot, onRacing]);

  if (!snapshot) {
    return (
      <View style={styles.root}>
        {error ? <FeedbackBanner title="Lobby unavailable" body={error} tone="danger" /> : null}
        <Button title="Back" tone="blue" size="md" onPress={onExit} />
      </View>
    );
  }

  const { match, players } = snapshot;
  const game = getGame(match.gameId);
  const row = pathRowByNumber(match.gameId, match.levelNumber);
  const self = players.find((player) => player.playerId === playerId);
  const isHost = match.hostId === playerId;
  const readyCount = players.filter((player) => player.ready).length;
  const canStart =
    isHost &&
    players.length >= LIVE_MIN_PLAYERS &&
    players.length <= LIVE_MAX_PLAYERS &&
    readyCount === players.length;

  async function toggleReady() {
    setBusy(true);
    setActionError(null);
    const result = await setReady(matchId, !self?.ready);
    setBusy(false);
    if (!result.ok) setActionError(result.error);
  }

  async function handleStart() {
    if (!row) return;
    setBusy(true);
    setActionError(null);
    const result = await startMatch(matchId, row.durationMs);
    setBusy(false);
    if (!result.ok) {
      setActionError(result.error);
      return;
    }
    captureAnalytics('match_started', {
      game_id: match.gameId,
      level_number: match.levelNumber,
      player_count_bucket: playerCountBucket(result.value.players.length),
    });
    onRacing(result.value);
  }

  async function handleLeave() {
    setBusy(true);
    if (isHost) {
      const result = await cancelMatch(matchId);
      setBusy(false);
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
    } else {
      const result = await leaveMatch(matchId);
      setBusy(false);
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
    }
    onExit();
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <RoundIconButton
          icon={<Text style={styles.backGlyph}>‹</Text>}
          accessibilityLabel="Leave lobby"
          onPress={() => void handleLeave()}
          tone="blue"
          size={44}
        />
        <Ribbon
          label={(game?.name ?? 'LOBBY').toUpperCase()}
          color={match.gameId === 'clueless' ? palette.purple : palette.ribbon}
        />
        <View style={styles.headerSpacer} />
      </View>
      <Text style={styles.levelLine}>
        {`${row?.name ?? `Level ${match.levelNumber}`} · ${players.length} of ${LIVE_MAX_PLAYERS}`}
      </Text>
      {actionError ? <FeedbackBanner title="Couldn’t update lobby" body={actionError} tone="danger" /> : null}

      <Surface style={styles.card}>
        {players.map((player) => (
          <View key={player.playerId} style={styles.row}>
            <Text style={styles.name}>
              {player.username}
              {player.playerId === playerId ? ' (you)' : ''}
            </Text>
            <Text style={[styles.ready, player.ready && styles.readyOn]}>
              {player.ready ? 'READY' : 'WAIT'}
            </Text>
          </View>
        ))}
      </Surface>

      <Text style={styles.hint}>
        {players.length < LIVE_MIN_PLAYERS
          ? `Need at least ${LIVE_MIN_PLAYERS} players to start. Up to ${LIVE_MAX_PLAYERS} can race.`
          : players.length >= LIVE_MAX_PLAYERS
            ? `Lobby is full. ${readyCount}/${players.length} ready. The host starts when everyone is ready.`
            : `${readyCount}/${players.length} ready. Up to ${LIVE_MAX_PLAYERS} can race. The host starts when everyone is ready.`}
      </Text>

      <View style={styles.actions}>
        <Button
          title={self?.ready ? 'Unready' : 'Ready up'}
          tone="blue"
          size="md"
          onPress={() => void toggleReady()}
          disabled={busy}
        />
        {isHost ? (
          <Button title="Start race" size="xl" tone="green" onPress={() => void handleStart()} disabled={busy || !canStart} />
        ) : null}
        <Button
          title={isHost ? 'Cancel lobby' : 'Leave'}
          tone="coral"
          size="md"
          onPress={() => void handleLeave()}
          disabled={busy}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...screen.page, paddingHorizontal: space.lg, paddingTop: space.sm, gap: space.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerSpacer: { width: 44 },
  backGlyph: { color: theme.onPill, fontSize: 22, lineHeight: 24, fontWeight: '700' },
  levelLine: { ...type.body, color: theme.text, textAlign: 'center' },
  readyOn: { color: theme.successDim },
  card: { gap: space.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { ...type.bodyStrong, color: theme.text },
  ready: { ...type.overline, color: theme.textDim },
  hint: { ...type.caption, color: theme.textMuted },
  actions: { gap: space.xs, marginTop: 'auto', paddingBottom: space.md },
});
