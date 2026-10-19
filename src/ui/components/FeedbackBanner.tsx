import { StyleSheet, Text, View } from 'react-native';
import { font, palette, space, tone as tones, type GlossTone } from '../theme';
import { CreamBox } from './CreamBox';
import { Gradient } from './Gradient';

type Tone = 'success' | 'danger' | 'warning' | 'info';

type Props = {
  title: string;
  body?: string;
  tone?: Tone;
};

const FACE: Record<Tone, GlossTone> = {
  success: tones.green,
  danger: tones.red,
  warning: tones.gold,
  info: tones.blue,
};

const MARK: Record<Tone, string> = { success: '✓', danger: '✕', warning: '!', info: 'i' };

/**
 * Result line under a board: a cream box with a glossy disc that says how it
 * went (green tick, red cross, gold bang) and navy copy beside it.
 */
export function FeedbackBanner({ title, body, tone = 'info' }: Props) {
  const face = FACE[tone];
  return (
    <CreamBox style={styles.box}>
      <View style={styles.row} accessibilityRole="alert">
        <View style={[styles.disc, { borderColor: face.outline }]}>
          <Gradient colors={[face.top, face.bottom]} />
          <Text style={[styles.mark, { textShadowColor: face.outline }]}>{MARK[tone]}</Text>
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>{title}</Text>
          {body ? <Text style={styles.body}>{body}</Text> : null}
        </View>
      </View>
    </CreamBox>
  );
}

const styles = StyleSheet.create({
  box: { paddingVertical: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  disc: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mark: {
    color: palette.white,
    fontFamily: font.black,
    fontSize: 18,
    lineHeight: 22,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  copy: { flex: 1 },
  title: { color: palette.ink, fontFamily: font.black, fontSize: 17, lineHeight: 21 },
  body: { color: palette.inkSoft, fontFamily: font.body, fontSize: 13, lineHeight: 18, marginTop: 1 },
});
