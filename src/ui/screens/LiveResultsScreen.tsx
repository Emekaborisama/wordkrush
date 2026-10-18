import { StyleSheet, Text, View } from 'react-native';
import { getGame } from '../../games/registry';
import { rankMatchScores } from '../../live/ranking';
import type { LiveMatchSnapshot } from '../../live/types';
import { Button, DisplayTitle, Rays, ResultSheet, RoundIconButton, ScoreWell, StarRow } from '../components';
import { screen, space, theme, type } from '../theme';

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
  const ranked = rankMatchScores(
    match.gameId,
    players.map((player) => ({
      playerId: player.playerId,
      score: player.score,
      complete: player.complete,
    })),
  );
  const mine = ranked.find((row) => row.playerId === playerId);
  const won = mine?.rank === 1;

  return (
    <View style={styles.root}>
      {won ? (
        <View style={styles.rays} pointerEvents="none">
          <Rays />
        </View>
      ) : null}
      <View style={styles.stars}>
        <StarRow earned={0} animate={false} />
      </View>
      <ResultSheet
        accessibilityLabel={won ? 'You win' : 'Game over'}
        footer={
          <View style={styles.footer}>
            <Button title="Continue" size="xl" tone="green" onPress={onDone} />
            <View style={styles.roundRow}>
              <RoundIconButton
                icon={<Text style={styles.roundGlyph}>⌂</Text>}
                accessibilityLabel="Back to team"
                onPress={onDone}
                tone="blue"
                size={52}
              />
            </View>
          </View>
        }
      >
        <DisplayTitle>{won ? 'YOU WIN' : 'GAME OVER'}</DisplayTitle>
        <Text style={styles.gameName}>{game?.name ?? match.gameId}</Text>
        <ScoreWell label="YOUR SCORE" value={String(mine?.score ?? 0)} />
        <View style={styles.podium}>
          {ranked.slice(0, 3).map((row) => {
            const player = players.find((item) => item.playerId === row.playerId);
            const self = row.playerId === playerId;
            return (
              <View key={row.playerId} style={[styles.placeCard, row.rank === 1 && styles.placeFirst]}>
                <Text style={styles.placeRank}>{row.rank}</Text>
                <Text style={styles.placeName} numberOfLines={1}>
                  {self ? 'You' : player?.username ?? 'Player'}
                </Text>
                <Text style={styles.placeScore}>{row.score}</Text>
              </View>
            );
          })}
        </View>
        {ranked.slice(3).map((row) => {
          const player = players.find((item) => item.playerId === row.playerId);
          const self = row.playerId === playerId;
          return (
            <View key={row.playerId} style={styles.row}>
              <Text style={styles.place}>{row.rank}</Text>
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
        <Text style={styles.hint}>
          {teamAdvanced ? 'Team path advanced.' : 'Team path stayed put — nobody completed.'}{' '}
          {personalAdvanced
            ? 'Your path moved up.'
            : 'Your path did not move. Next solo run is still your own level.'}
        </Text>
      </ResultSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...screen.playfield, padding: space.md },
  rays: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' },
  stars: { alignItems: 'center', marginBottom: -16, zIndex: 2 },
  footer: { gap: space.sm },
  roundRow: { flexDirection: 'row', justifyContent: 'center' },
  roundGlyph: { color: theme.onPill, fontSize: 22, lineHeight: 26 },
  gameName: { ...type.subtitle, color: theme.text, textAlign: 'center', marginTop: space.sm },
  podium: { width: '100%', flexDirection: 'row', gap: space.sm, marginTop: space.lg },
  placeCard: {
    flex: 1,
    minHeight: 88,
    borderRadius: 16,
    backgroundColor: theme.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.sm,
  },
  placeFirst: { backgroundColor: theme.warningSoft },
  placeRank: { ...type.title, color: theme.text },
  placeName: { ...type.caption, color: theme.text, textAlign: 'center' },
  placeScore: { ...type.bodyStrong, color: theme.text },
  row: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.sm },
  place: { ...type.subtitle, color: theme.text, width: 28, textAlign: 'center' },
  body: { flex: 1 },
  name: { ...type.bodyStrong, color: theme.text },
  meta: { ...type.caption, color: theme.textMuted, marginTop: 2 },
  hint: { ...type.body, color: theme.textMuted, textAlign: 'center', marginTop: space.md },
});
