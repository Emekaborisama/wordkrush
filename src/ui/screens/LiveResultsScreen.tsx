import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { getGame } from '../../games/registry';
import { rankMatchScores } from '../../live/ranking';
import type { LiveMatchSnapshot } from '../../live/types';
import { Button, CountryFlag, CreamBox, GlossFace, Panel, PanelText, Rays, ScoreWell, StrokeText } from '../components';
import { font, palette, space, tone, toneFrom, type GlossTone } from '../theme';
import { usePlayerCountries } from '../usePlayerCountries';

type Props = {
  snapshot: LiveMatchSnapshot;
  playerId: string;
  personalAdvanced: boolean;
  teamAdvanced: boolean;
  onDone: () => void;
};

const MEDAL: readonly GlossTone[] = [tone.gold, tone.grey, toneFrom('#D9822B')];

/**
 * Race results as the kit's result pop-up: a red banner on a loss, the teal
 * tab with rays behind on a win, the player's score in a cream pill, and the
 * finishing order as cream rows led by medal discs.
 */
export function LiveResultsScreen({ snapshot, playerId, personalAdvanced, teamAdvanced, onDone }: Props) {
  const { match, players } = snapshot;
  const countries = usePlayerCountries(players.map((player) => player.playerId));
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
      <ScrollView contentContainerStyle={styles.content}>
        <Panel
          title={won ? 'YOU WIN!' : 'RACE OVER'}
          ribbon={won ? 'tab' : 'banner'}
          accessibilityLabel={won ? 'You win' : 'Race over'}
          footer={<Button title="Continue" size="lg" tone="green" onPress={onDone} />}
        >
          <PanelText variant="heading">{game?.name ?? match.gameId}</PanelText>
          <ScoreWell label="YOUR SCORE" value={String(mine?.score ?? 0)} />
          <View style={styles.rows}>
            {ranked.map((row) => {
              const player = players.find((item) => item.playerId === row.playerId);
              const self = row.playerId === playerId;
              const face = MEDAL[row.rank - 1] ?? tone.sky;
              return (
                <CreamBox key={row.playerId} tint={self ? '#FFF3B8' : undefined} style={styles.row}>
                  <View style={styles.rowInner}>
                    <GlossFace tone={face} lip={3} radius={20} raised={false} faceStyle={styles.medal}>
                      <StrokeText size={16} stroke={face.outline} strokeWidth={1.5} depth={1}>
                        {row.rank}
                      </StrokeText>
                    </GlossFace>
                    <View style={styles.flex}>
                      <View style={styles.nameRow}>
                        <CountryFlag code={countries.get(row.playerId)} size={15} />
                        <Text style={styles.name} numberOfLines={1}>
                          {self ? 'You' : player?.username ?? 'Player'}
                        </Text>
                      </View>
                      <Text style={styles.meta}>
                        {row.complete ? 'Complete' : 'Not complete'} · {row.score}
                      </Text>
                    </View>
                  </View>
                </CreamBox>
              );
            })}
          </View>
          <PanelText>
            {`${teamAdvanced ? 'Team path advanced.' : 'Team path stayed put — nobody completed.'} ${
              personalAdvanced ? 'Your path moved up.' : 'Your path did not move. Next solo run is still your own level.'
            }`}
          </PanelText>
        </Panel>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  rays: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' },
  content: {
    paddingHorizontal: space.md,
    paddingTop: space.xl,
    paddingBottom: space.xxl,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  rows: { gap: space.xs },
  row: { paddingVertical: space.xs + 2 },
  rowInner: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  medal: { width: 40, height: 40 },
  flex: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { flexShrink: 1, fontFamily: font.black, fontSize: 16, lineHeight: 20, color: palette.ink },
  meta: { fontFamily: font.body, fontSize: 12, lineHeight: 16, color: palette.inkSoft },
});
