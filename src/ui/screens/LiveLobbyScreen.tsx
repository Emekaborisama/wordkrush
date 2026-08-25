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
import { Button, FeedbackBanner, ScreenHeader, Surface } from '../components';
import { space, theme, type } from '../theme';

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
        <Button title="Back" variant="ghost" onPress={onExit} />
      </View>
    );
  }

  const { match, players } = snapshot;
  const game = getGame(match.gameId);
  const accent = game?.accent ?? theme.accent;
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
      <ScreenHeader
        eyebrow="LOBBY"
        title={game?.name ?? match.gameId}
        subtitle={`${row?.name ?? `Level ${match.levelNumber}`} · ${players.length} of ${LIVE_MAX_PLAYERS}`}
      />
      {actionError ? <FeedbackBanner title="Couldn’t update lobby" body={actionError} tone="danger" /> : null}

      <Surface style={styles.card}>
        {players.map((player) => (
          <View key={player.playerId} style={styles.row}>
            <Text style={styles.name}>
              {player.username}
              {player.playerId === playerId ? ' (you)' : ''}
            </Text>
            <Text style={[styles.ready, player.ready && { color: accent }]}>
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
          onPress={() => void toggleReady()}
          color={accent}
          disabled={busy}
        />
        {isHost ? (
          <Button title="Start race" onPress={() => void handleStart()} color={accent} disabled={busy || !canStart} />
        ) : null}
        <Button
          title={isHost ? 'Cancel lobby' : 'Leave'}
          variant="ghost"
          onPress={() => void handleLeave()}
          disabled={busy}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg, paddingHorizontal: space.lg, gap: space.md },
  card: { gap: space.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { ...type.bodyStrong, color: theme.text },
  ready: { ...type.overline, color: theme.textDim },
  hint: { ...type.caption, color: theme.textMuted },
  actions: { gap: space.xs, marginTop: 'auto', paddingBottom: space.md },
});
