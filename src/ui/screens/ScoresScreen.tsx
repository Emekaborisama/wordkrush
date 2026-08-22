import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Profile } from '../../auth/auth';
import { getGame } from '../../games/registry';
import { topScores, type ScoreBoard } from '../../scores/types';
import { Badge, Button, ScreenHeader, Stat, Surface } from '../components';
import { formatDuration, radius, space, theme, type } from '../theme';

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
};

export function ScoresScreen({
  gameId,
  board,
  onBack,
  highlightId,
  profile,
  backendConfigured,
  onSignIn,
  onSignOut,
}: Props) {
  const top = topScores(board, 10);
  const scoreNoun = getGame(gameId)?.scoreNoun ?? 'rounds';

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <ScreenHeader title={`${getGame(gameId)?.name ?? 'Your'} Scores`} align="center" />
        <View style={styles.statsRow}>
          <Stat value={board.bestStreak} label="BEST" size="lg" color={theme.accent} />
          <Stat value={board.totalRuns} label="RUNS" size="lg" />
        </View>
      </View>

      {top.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No runs yet.</Text>
          <Text style={styles.emptyHint}>Play a game to start your table.</Text>
        </View>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {top.map((entry, i) => {
            const highlighted = entry.id === highlightId;
            return (
              <Surface
                key={entry.id}
                level={highlighted ? 3 : 1}
                borderColor={highlighted ? theme.accent : undefined}
                radius={radius.md}
                style={styles.row}
              >
                <Text style={[styles.rank, i === 0 && styles.rankTop]}>{i + 1}</Text>
                <View style={styles.rowMain}>
                  <Text style={styles.rowStreak}>
                    {entry.streak.toLocaleString('en-US')}
                    {/* The unit as a label rather than prose. "12 streak" and
                        "8,436 rounds" are both wrong, and a small-caps label
                        sidesteps the grammar entirely — it reads correctly for
                        every game's noun. */}
                    <Text style={styles.rowUnit}> {scoreNoun.toUpperCase()}</Text>
                  </Text>
                  <Text style={styles.rowDate}>
                    {formatDate(entry.playedAt)}
                    {entry.durationMs !== undefined && ` · ${formatDuration(entry.durationMs)}`}
                  </Text>
                </View>
                {highlighted && <Badge label="THIS RUN" tone="accent" />}
              </Surface>
            );
          })}
        </ScrollView>
      )}

      <View style={styles.footer}>
        {profile ? (
          <Surface level={1} radius={radius.md} style={styles.accountRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.accountName}>{profile.username}</Text>
              <Text style={styles.accountNote}>Signed in · global board coming soon</Text>
            </View>
            <Pressable onPress={onSignOut}>
              <Text style={styles.signOut}>Sign out</Text>
            </Pressable>
          </Surface>
        ) : backendConfigured ? (
          <Button title="Sign in to save across devices" variant="tonal" onPress={onSignIn} />
        ) : null}

        <Text style={styles.footerNote}>
          Scores are saved on this device and work offline. The global board is not live yet.
        </Text>

        <Button title="Back" variant="outline" onPress={onBack} />
      </View>
    </View>
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
  root: { flex: 1, backgroundColor: theme.bg, padding: 20, gap: space.lg },
  header: { alignItems: 'center', paddingTop: 20, gap: space.lg },
  statsRow: { flexDirection: 'row', gap: 40 },

  list: { flex: 1 },
  listContent: { gap: space.sm, paddingVertical: 4 },
  rowUnit: { ...type.caption, color: theme.textDim, fontWeight: '700', fontSize: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  rank: { color: theme.textDim, fontSize: 16, fontWeight: '800', width: 24, textAlign: 'center' },
  rankTop: { color: theme.accent },
  rowMain: { flex: 1 },
  rowStreak: { color: theme.text, fontSize: 16, fontWeight: '700' },
  rowDate: { color: theme.textDim, fontSize: 11, marginTop: 2 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  emptyText: { color: theme.text, fontSize: 16, fontWeight: '700' },
  emptyHint: { color: theme.textDim, fontSize: 13 },

  footer: { gap: space.sm },
  accountRow: { flexDirection: 'row', alignItems: 'center' },
  accountName: { color: theme.text, fontSize: 14, fontWeight: '700' },
  accountNote: { color: theme.textDim, fontSize: 10, marginTop: 2 },
  signOut: { color: theme.danger, fontSize: 12, fontWeight: '600' },
  footerNote: { color: theme.textDim, fontSize: 11, textAlign: 'center', lineHeight: 16, opacity: 0.8 },
});
