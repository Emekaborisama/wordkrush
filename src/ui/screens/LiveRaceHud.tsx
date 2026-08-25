import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { PathGameId } from '../../games/campaign';
import type { LivePlayer } from '../../live/types';
import { remainingMs } from '../../live/types';
import { formatDuration, space, theme, type, withAlpha } from '../theme';

type Props = {
  gameId: PathGameId;
  endsAt: string | null;
  players: LivePlayer[];
  selfId: string;
};

function scoreLabel(gameId: PathGameId, player: LivePlayer): string {
  if (gameId === 'clueless') {
    return player.complete ? `found · ${player.score}` : `${player.score}`;
  }
  if (gameId === 'wordfall') {
    return player.complete ? `won · ${player.score}` : `${player.score}`;
  }
  return player.complete ? `${player.score} ★` : `${player.score}`;
}

export function LiveRaceHud({ gameId, endsAt, players, selfId }: Props) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);
  const left = remainingMs(endsAt, new Date(now));

  return (
    <View style={styles.root} pointerEvents="none">
      <View style={styles.clock}>
        <Text style={styles.clockLabel}>RACE</Text>
        <Text style={styles.clockValue}>{formatDuration(left)}</Text>
      </View>
      <View style={styles.rivals}>
        {players.map((player) => {
          const self = player.playerId === selfId;
          return (
            <View key={player.playerId} style={[styles.rival, self && styles.self]}>
              <Text style={styles.rivalName} numberOfLines={1}>
                {self ? 'You' : player.username}
              </Text>
              <Text style={styles.rivalScore}>{scoreLabel(gameId, player)}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: space.md,
    paddingTop: space.xs,
    gap: space.xs,
  },
  clock: {
    alignSelf: 'center',
    backgroundColor: withAlpha(theme.bg, 0.72),
    borderRadius: 999,
    paddingHorizontal: space.md,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: space.xs,
  },
  clockLabel: { ...type.overline, color: theme.textDim, fontSize: 9 },
  clockValue: { ...type.subtitle, color: theme.text, fontSize: 16 },
  rivals: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  rival: {
    backgroundColor: withAlpha(theme.card, 0.9),
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    maxWidth: 140,
  },
  self: { borderWidth: 1, borderColor: theme.accent },
  rivalName: { ...type.caption, color: theme.textMuted, fontSize: 10 },
  rivalScore: { ...type.bodyStrong, color: theme.text, fontSize: 12 },
});
