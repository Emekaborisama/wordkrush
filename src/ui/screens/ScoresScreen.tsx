import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { topScores, type ScoreBoard } from '../../scores/types';
import { radius, theme } from '../theme';

type Props = {
  board: ScoreBoard;
  onBack: () => void;
  /** Highlights the run just finished, so a player can find themselves in the list. */
  highlightId?: string;
};

export function ScoresScreen({ board, onBack, highlightId }: Props) {
  const top = topScores(board, 10);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Scores</Text>
        <View style={styles.statsRow}>
          <Stat label="BEST" value={board.bestStreak} accent />
          <Stat label="RUNS" value={board.totalRuns} />
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
              <View key={entry.id} style={[styles.row, highlighted && styles.rowHighlight]}>
                <Text style={[styles.rank, i === 0 && styles.rankTop]}>{i + 1}</Text>
                <View style={styles.rowMain}>
                  <Text style={styles.rowStreak}>
                    {entry.streak} {entry.streak === 1 ? 'round' : 'rounds'}
                  </Text>
                  <Text style={styles.rowDate}>{formatDate(entry.playedAt)}</Text>
                </View>
                {highlighted && <Text style={styles.badge}>THIS RUN</Text>}
              </View>
            );
          })}
        </ScrollView>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerNote}>
          Scores are saved on this device. Global ranking is coming — it needs an account so your
          streak can follow you across devices.
        </Text>
        <Pressable style={({ pressed }) => [styles.back, pressed && styles.pressed]} onPress={onBack}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, accent && { color: theme.accent }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
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
  root: { flex: 1, backgroundColor: theme.bg, padding: 20, gap: 16 },
  header: { alignItems: 'center', paddingTop: 20, gap: 16 },
  title: { color: theme.text, fontSize: 28, fontWeight: '900' },
  statsRow: { flexDirection: 'row', gap: 40 },
  stat: { alignItems: 'center' },
  statValue: { color: theme.text, fontSize: 30, fontWeight: '800' },
  statLabel: { color: theme.textDim, fontSize: 10, letterSpacing: 2, fontWeight: '700', marginTop: 2 },

  list: { flex: 1 },
  listContent: { gap: 8, paddingVertical: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: theme.bgElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.border,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowHighlight: { borderColor: theme.accent, backgroundColor: theme.card },
  rank: { color: theme.textDim, fontSize: 16, fontWeight: '800', width: 24, textAlign: 'center' },
  rankTop: { color: theme.accent },
  rowMain: { flex: 1 },
  rowStreak: { color: theme.text, fontSize: 16, fontWeight: '700' },
  rowDate: { color: theme.textDim, fontSize: 11, marginTop: 2 },
  badge: { color: theme.accent, fontSize: 9, fontWeight: '800', letterSpacing: 1 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  emptyText: { color: theme.text, fontSize: 16, fontWeight: '700' },
  emptyHint: { color: theme.textDim, fontSize: 13 },

  footer: { gap: 12 },
  footerNote: { color: theme.textDim, fontSize: 11, textAlign: 'center', lineHeight: 16, opacity: 0.8 },
  back: {
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  backText: { color: theme.textDim, fontSize: 14, fontWeight: '600' },
  pressed: { opacity: 0.75 },
});
