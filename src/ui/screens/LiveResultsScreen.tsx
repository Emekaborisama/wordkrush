import { StyleSheet, Text, View } from 'react-native';
import { getGame } from '../../games/registry';
import { rankMatchScores } from '../../live/ranking';
import type { LiveMatchSnapshot } from '../../live/types';
import { Button, ScreenHeader, Surface } from '../components';
import { space, theme, type } from '../theme';

type Props = {
  snapshot: LiveMatchSnapshot;
  playerId: string;
  personalAdvanced: boolean;
  teamAdvanced: boolean;
  onDone: () => void;
};

export function LiveResultsScreen({
  snapshot,
  playerId,
  personalAdvanced,
  teamAdvanced,
  onDone,
}: Props) {
  const { match, players } = snapshot;
  const game = getGame(match.gameId);
  const accent = game?.accent ?? theme.accent;
  const ranked = rankMatchScores(
    match.gameId,
    players.map((player) => ({
      playerId: player.playerId,
      score: player.score,
      complete: player.complete,
    })),
  );

  return (
    <View style={styles.root}>
      <ScreenHeader
        eyebrow="RACE OVER"
        title={game?.name ?? match.gameId}
        subtitle={
          ranked.length > 0 && match.gameId === 'more-or-less'
            ? `${players.find((p) => p.playerId === ranked[0].playerId)?.username ?? 'Player'} won · ${ranked[0].score} streak.`
            : `Level ${match.levelNumber}`
        }
      />
      <Surface style={styles.card}>
        {ranked.map((row) => {
          const player = players.find((item) => item.playerId === row.playerId);
          const self = row.playerId === playerId;
          return (
            <View key={row.playerId} style={styles.row}>
              <Text style={[styles.place, self && { color: accent }]}>{row.rank}</Text>
              <View style={styles.body}>
                <Text style={styles.name}>
                  {player?.username ?? 'Player'}
                  {self ? ' (you)' : ''}
                </Text>
                <Text style={styles.meta}>
                  {row.complete ? 'Complete' : 'Not complete'} · {row.score}
                </Text>
              </View>
            </View>
          );
        })}
      </Surface>
      <Text style={styles.hint}>
        {teamAdvanced ? 'Team path advanced.' : 'Team path stayed put — nobody completed.'}{' '}
        {personalAdvanced
          ? 'Your path moved up.'
          : 'Your path did not move. Next solo run is still your own level.'}
      </Text>
      <Button title="Back to team" onPress={onDone} color={accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg, paddingHorizontal: space.lg, gap: space.md },
  card: { gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  place: { ...type.display, color: theme.textDim, fontSize: 28, width: 36, textAlign: 'center' },
  body: { flex: 1 },
  name: { ...type.subtitle, color: theme.text, fontSize: 16 },
  meta: { ...type.caption, color: theme.textMuted, marginTop: 2 },
  hint: { ...type.body, color: theme.textMuted },
});
