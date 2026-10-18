import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { captureAnalytics } from '../../analytics/client';
import { LIVE_MAX_PLAYERS, LIVE_MIN_PLAYERS, playerCountBucket } from '../../games/campaign';
import { getGame } from '../../games/registry';
import { cancelMatch, joinMatch, leaveMatch, setReady, startMatch } from '../../live/api';
import { pathRowByNumber } from '../../live/catalog';
import type { LiveMatchSnapshot } from '../../live/types';
import { useMatch } from '../../live/useMatch';
import { Badge, Button, CreamBox, FeedbackBanner, Panel, PanelText } from '../components';
import { font, palette, space } from '../theme';

type Props = {
  matchId: string;
  playerId: string;
  onRacing: (snapshot: LiveMatchSnapshot) => void;
  onExit: () => void;
};

/**
 * Race lobby as a kit pop-up: the game on the tab, the level and head count
 * under it, each racer as a cream row with a READY / WAIT tag, then Ready up,
 * the host's green Start race, and a red way out. The X leaves too.
 */
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
      <ScrollView contentContainerStyle={styles.content}>
        <Panel title="Race lobby" onClose={onExit} closeLabel="Back">
          {error ? (
            <FeedbackBanner title="Lobby unavailable" body={error} tone="danger" />
          ) : (
            <PanelText>Finding the lobby…</PanelText>
          )}
          <Button title="Back" tone="blue" size="md" onPress={onExit} />
        </Panel>
      </ScrollView>
    );
  }

  const { match, players } = snapshot;
  const game = getGame(match.gameId);
  const row = pathRowByNumber(match.gameId, match.levelNumber);
  const self = players.find((player) => player.playerId === playerId);
  const isHost = match.hostId === playerId;
  const readyCount = players.filter((player) => player.ready).length;
  const canStart =
    isHost && players.length >= LIVE_MIN_PLAYERS && players.length <= LIVE_MAX_PLAYERS && readyCount === players.length;

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
    <ScrollView contentContainerStyle={styles.content}>
      <Panel title={game?.name ?? 'Race lobby'} onClose={() => void handleLeave()} closeLabel="Leave lobby">
        <PanelText variant="heading">{row?.name ?? `Level ${match.levelNumber}`}</PanelText>
        <PanelText>{`${players.length} of ${LIVE_MAX_PLAYERS} racers`}</PanelText>
        {actionError ? <FeedbackBanner title="Couldn’t update lobby" body={actionError} tone="danger" /> : null}

        <View style={styles.rows}>
          {players.map((player) => (
            <CreamBox key={player.playerId} style={styles.row}>
              <View style={styles.rowInner}>
                <Text style={styles.name} numberOfLines={1}>
                  {player.username}
                  {player.playerId === playerId ? ' (you)' : ''}
                </Text>
                <Badge label={player.ready ? 'READY' : 'WAIT'} tone={player.ready ? 'success' : 'neutral'} />
              </View>
            </CreamBox>
          ))}
        </View>

        <PanelText>
          {players.length < LIVE_MIN_PLAYERS
            ? `Need at least ${LIVE_MIN_PLAYERS} players to start. Up to ${LIVE_MAX_PLAYERS} can race.`
            : players.length >= LIVE_MAX_PLAYERS
              ? `Lobby is full. ${readyCount}/${players.length} ready. The host starts when everyone is ready.`
              : `${readyCount}/${players.length} ready. Up to ${LIVE_MAX_PLAYERS} can race. The host starts when everyone is ready.`}
        </PanelText>

        <Button
          title={self?.ready ? 'Unready' : 'Ready up'}
          tone="blue"
          size="md"
          onPress={() => void toggleReady()}
          disabled={busy}
        />
        {isHost ? (
          <Button title="Start race" size="lg" tone="green" onPress={() => void handleStart()} disabled={busy || !canStart} />
        ) : null}
        <Button
          title={isHost ? 'Cancel lobby' : 'Leave'}
          tone="red"
          size="md"
          onPress={() => void handleLeave()}
          disabled={busy}
        />
      </Panel>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: space.md,
    paddingTop: space.lg,
    paddingBottom: space.xxl,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  rows: { gap: space.xs },
  row: { paddingVertical: space.xs + 2 },
  rowInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  name: { flex: 1, fontFamily: font.black, fontSize: 16, color: palette.ink },
});
