import { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { proximityColor, radius, shadow, space, theme, type } from './theme';

export type HowToStep = { n: number; title: string; body: string };

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  intro: string;
  steps: HowToStep[];
  /** Optional worked example rendered under the steps. */
  example?: React.ReactNode;
  accent?: string;
};

/**
 * Instructions sheet, shared by every game.
 *
 * Presented as a bottom sheet rather than a centred alert: sheets are reachable
 * with a thumb, and the partial reveal of the screen behind keeps the player
 * anchored in the game instead of feeling interrupted.
 */
export function HowToPlay({
  visible,
  onClose,
  title,
  intro,
  steps,
  example,
  accent = theme.accent,
}: Props) {
  const slide = useRef(new Animated.Value(visible ? 0 : 1)).current;

  useEffect(() => {
    Animated.spring(slide, {
      toValue: visible ? 0 : 1,
      damping: 20,
      stiffness: 180,
      mass: 0.9,
      useNativeDriver: true,
    }).start();
  }, [visible, slide]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [
                { translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [0, 640] }) },
              ],
            },
          ]}
        >
          {/* Grab handle: a visual affordance that this is a dismissible sheet. */}
          <View style={styles.handle} />

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.intro}>{intro}</Text>

            <View style={styles.steps}>
              {steps.map((step) => (
                <View key={step.n} style={styles.step}>
                  <View style={[styles.stepBadge, { backgroundColor: accent }]}>
                    <Text style={styles.stepNum}>{step.n}</Text>
                  </View>
                  <View style={styles.stepBody}>
                    <Text style={styles.stepTitle}>{step.title}</Text>
                    <Text style={styles.stepText}>{step.body}</Text>
                  </View>
                </View>
              ))}
            </View>

            {example && <View style={styles.example}>{example}</View>}
          </ScrollView>

          <Pressable
            style={({ pressed }) => [styles.cta, { backgroundColor: accent }, pressed && styles.pressed]}
            onPress={onClose}
          >
            <Text style={styles.ctaText}>Got it</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
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
          { width: `${Math.max(6, fraction * 100)}%`, backgroundColor: win ? theme.accent : proximityColor(fraction) },
        ]}
      />
      <View style={styles.exContent}>
        <Text style={styles.exWord}>{word}</Text>
        <Text style={styles.exRank}>{win ? '★' : rank?.toLocaleString()}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'rgba(0,0,0,0.62)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.bgElevated,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: theme.edge,
    paddingHorizontal: space.xl,
    paddingBottom: space.xl,
    maxHeight: '86%',
    ...shadow.raised,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: theme.borderStrong,
    alignSelf: 'center',
    marginTop: space.md,
    marginBottom: space.lg,
  },
  content: { paddingBottom: space.lg },
  title: { ...type.display, color: theme.text, fontSize: 28 },
  intro: { ...type.body, color: theme.textMuted, marginTop: space.sm },

  steps: { marginTop: space.xl, gap: space.lg },
  step: { flexDirection: 'row', gap: space.md },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNum: { color: theme.bg, fontSize: 12, fontWeight: '800' },
  stepBody: { flex: 1, gap: 2 },
  stepTitle: { ...type.bodyStrong, color: theme.text },
  stepText: { ...type.caption, color: theme.textMuted },

  example: {
    marginTop: space.xl,
    backgroundColor: theme.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: theme.border,
    padding: space.md,
    gap: 6,
  },
  exRow: {
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: theme.card,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  exBar: { position: 'absolute', left: 0, top: 0, bottom: 0, opacity: 0.9 },
  exContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.md,
  },
  exWord: { ...type.bodyStrong, color: theme.text, fontSize: 14 },
  exRank: { ...type.caption, color: theme.text, fontWeight: '700', fontVariant: ['tabular-nums'] },

  cta: {
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: space.sm,
  },
  ctaText: { color: theme.bg, fontSize: 15, fontWeight: '800', letterSpacing: 0.2 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
});
