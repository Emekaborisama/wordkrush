import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, CreamBox, GlossFace, PanelText, PopupModal, StrokeText } from './components';
import { font, palette, proximityColor, space, tone } from './theme';

export type HowToStep = { n: number; title: string; body: string };

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  intro: string;
  steps: HowToStep[];
  /** Optional worked example rendered under the steps. */
  example?: ReactNode;
  /** Kept so existing call sites compile; step numbers use the kit's teal. */
  accent?: string;
};

/**
 * Instructions, shared by every game: the kit's pop-up with a "How to play"
 * tab, the game named under it, and each step as a cream row led by a glossy
 * number tile.
 */
export function HowToPlay({ visible, onClose, title, intro, steps, example }: Props) {
  const heading = title.replace(/^How to play\s*/i, '') || title;
  return (
    <PopupModal
      visible={visible}
      onClose={onClose}
      title="How to play"
      footer={<Button title="Got it, let’s play" tone="green" size="lg" onPress={onClose} />}
    >
      <PanelText variant="heading">{heading}</PanelText>
      <PanelText>{intro}</PanelText>
      <View style={styles.steps}>
        {steps.map((step) => (
          <CreamBox key={step.n} style={styles.step}>
            <View style={styles.stepRow}>
              <GlossFace tone={tone.teal} lip={3} radius={10} raised={false} faceStyle={styles.numberFace}>
                <StrokeText size={18} stroke={tone.teal.outline} strokeWidth={1.5} depth={1}>
                  {step.n}
                </StrokeText>
              </GlossFace>
              <View style={styles.stepBody}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepText}>{step.body}</Text>
              </View>
            </View>
          </CreamBox>
        ))}
      </View>
      {example ? <CreamBox style={styles.example}>{example}</CreamBox> : null}
    </PopupModal>
  );
}

/** Miniature guess row, so the instructions show the real thing rather than describing it. */
export function ExampleRow({
  word,
  rank,
  fraction,
  win,
}: {
  word: string;
  rank?: number;
  fraction: number;
  win?: boolean;
}) {
  return (
    <View style={styles.exRow}>
      <View
        style={[
          styles.exBar,
          { width: `${Math.max(6, fraction * 100)}%`, backgroundColor: win ? palette.lime : proximityColor(fraction) },
        ]}
      />
      <View style={styles.exContent}>
        <Text style={styles.exWord}>{word}</Text>
        <Text style={win ? styles.exStar : styles.exRank}>{win ? '★' : rank?.toLocaleString()}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  steps: { gap: space.sm },
  step: { paddingVertical: space.sm },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  numberFace: { width: 36, height: 36 },
  stepBody: { flex: 1, gap: 1 },
  stepTitle: { fontFamily: font.black, fontSize: 16, lineHeight: 20, color: palette.ink },
  stepText: { fontFamily: font.body, fontSize: 14, lineHeight: 19, color: palette.inkSoft },
  example: { gap: 6 },
  exRow: {
    height: 34,
    borderRadius: 10,
    backgroundColor: palette.white,
    borderWidth: 1.5,
    borderColor: palette.creamEdge,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  exBar: { position: 'absolute', left: 0, top: 0, bottom: 0, opacity: 0.85 },
  exContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.md,
  },
  exWord: { fontFamily: font.black, fontSize: 15, color: palette.ink },
  exRank: { fontFamily: font.black, fontSize: 13, color: palette.ink, fontVariant: ['tabular-nums'] },
  exStar: { color: palette.ink, fontSize: 14, lineHeight: 18 },
});
