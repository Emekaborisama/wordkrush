import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { LevelTrail } from '../components/LevelTrail';
import type { Stone } from '../levelTrail';
import { MeadowRide, type MeadowHop } from '../MeadowRide';
import { CAT_MOODS } from '../mascot/art';
import { CatMascot, type CatReaction } from '../mascot/CatMascot';
import { ChestReveal } from '../rewards/ChestReveal';
import { StreakPopup } from '../rewards/StreakPopup';
import { font, palette, space } from '../theme';

const STONES: Stone[] = [
  { number: 1, state: 'cleared', stars: 3, name: 'Kitchen' },
  { number: 2, state: 'cleared', stars: 2, name: 'Garden' },
  { number: 3, state: 'current', name: 'Library' },
  { number: 4, state: 'locked', name: 'Market' },
  { number: 5, state: 'locked', name: 'Harbour' },
];

/** The cat in every mood, and every place it lives. `?kit=mascot`. */
export function MascotKit() {
  const [reaction, setReaction] = useState<CatReaction | null>(null);
  const [streakOpen, setStreakOpen] = useState(false);
  const [ride, setRide] = useState<MeadowHop | null>(null);
  const today = '2026-11-07';
  return (
    <View style={styles.root}>
      <View style={styles.row}>
        {CAT_MOODS.map((mood) => (
          <View key={mood} style={styles.cell}>
            <CatMascot size={110} mood={mood} />
            <Text style={styles.label}>{mood}</Text>
          </View>
        ))}
        <View style={styles.cell}>
          <CatMascot size={110} onPress={() => undefined} reaction={reaction} />
          <Text style={styles.label}>tap me</Text>
        </View>
      </View>
      <View style={styles.row}>
        <Button title="Cheer" tone="green" size="sm" fullWidth={false} onPress={() => setReaction({ key: Date.now(), mood: 'cheer' })} />
        <Button title="Oops" tone="red" size="sm" fullWidth={false} onPress={() => setReaction({ key: Date.now(), mood: 'oops' })} />
        <Button title="Streak pop-up" tone="gold" size="sm" fullWidth={false} onPress={() => setStreakOpen(true)} />
        <Button
          title="Level walk"
          tone="blue"
          size="sm"
          fullWidth={false}
          onPress={() => setRide({ key: Date.now(), from: { ...STONES[1], state: 'cleared' }, to: { ...STONES[2], state: 'current' } })}
        />
      </View>
      <LevelTrail stones={STONES} current={3} progress={0.6} reaction={reaction} />
      <View style={styles.chest}>
        <ChestReveal day={3} coins={30} visible />
      </View>
      <StreakPopup
        visible={streakOpen}
        streak={{ current: 4, longest: 9, lastPlayedDate: today }}
        today={today}
        claimed={['flame-3']}
        onClose={() => setStreakOpen(false)}
        onPlay={() => setStreakOpen(false)}
      />
      <MeadowRide ride={ride} onCovered={() => undefined} onDone={() => setRide(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.md },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, alignItems: 'flex-end' },
  cell: { alignItems: 'center', gap: 4 },
  label: { fontFamily: font.heavy, fontSize: 13, color: palette.white },
  chest: { backgroundColor: palette.coral, borderRadius: 22, padding: space.md, maxWidth: 380 },
});
