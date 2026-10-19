import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { PathGameId } from '../../games/campaign';
import type { LivePlayer } from '../../live/types';
import { remainingMs } from '../../live/types';
import { font, formatDuration, palette, space } from '../theme';

type Props = {
  gameId: PathGameId;
  endsAt: string | null;
  players: LivePlayer[];
  selfId: string;
};

/** The last ten seconds turn the clock red, like Block King's timer. */
const URGENT_MS = 10_000;

function scoreLabel(gameId: PathGameId, player: LivePlayer): string {
  if (gameId === 'clueless') {
    return player.complete ? `found · ${player.score}` : `${player.score}`;
  }
  if (gameId === 'wordfall') {
    return player.complete ? `won · ${player.score}` : `${player.score}`;
  }
  return player.complete ? `${player.score} ★` : `${player.score}`;
}

/**
 * Race strip over a live board: a cream clock pill that turns red near the
 * end, and a chip per racer (gold rim on you).
 */
export function LiveRaceHud({ gameId, endsAt, players, selfId }: Props) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);
  const left = remainingMs(endsAt, new Date(now));
  const urgent = left <= URGENT_MS;

  return (
    <View style={styles.root} pointerEvents="none">
      <View style={[styles.clock, urgent && styles.clockUrgent]}>
        <Text style={[styles.clockLabel, urgent && styles.onRed]}>RACE</Text>
        <Text style={[styles.clockValue, urgent && styles.onRed]}>{formatDuration(left)}</Text>
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
  root: { paddingHorizontal: space.md, paddingTop: space.xs, gap: space.xs },
  clock: {
    alignSelf: 'center',
    backgroundColor: palette.creamFill,
    borderRadius: 999,
    borderWidth: 2.5,
    borderColor: palette.creamEdge,
    paddingHorizontal: space.md,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: space.xs,
  },
  clockUrgent: { backgroundColor: palette.red, borderColor: palette.redDeep },
  clockLabel: { fontFamily: font.heavy, fontSize: 11, letterSpacing: 1, color: palette.inkSoft },
  clockValue: { fontFamily: font.black, fontSize: 18, color: palette.ink, fontVariant: ['tabular-nums'] },
  onRed: { color: palette.white },
  rivals: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  rival: {
    backgroundColor: palette.creamFill,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: palette.creamEdge,
    paddingHorizontal: 10,
    paddingVertical: 3,
    maxWidth: 140,
  },
  self: { borderColor: palette.goldDeep, backgroundColor: '#FFF3B8' },
  rivalName: { fontFamily: font.heavy, fontSize: 11, color: palette.inkSoft },
  rivalScore: { fontFamily: font.black, fontSize: 13, color: palette.ink },
});
