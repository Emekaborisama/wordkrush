import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { radius, space, theme, type } from './theme';

type Props = {
  visible: boolean;
  onAllow: () => void;
  onDecline: () => void;
};

export function AnalyticsConsentPrompt({ visible, onAllow, onDecline }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDecline}>
      <View style={styles.backdrop}>
        <View style={styles.card} accessibilityRole="alert">
          <Text style={styles.eyebrow}>YOUR PRIVACY</Text>
          <Text style={styles.title}>Help improve WordCrush?</Text>
          <Text style={styles.body}>
            Share anonymous play and reliability events so we can improve game balance,
            cognitive challenges, pattern recognition, and app stability.
          </Text>
          <Text style={styles.detail}>
            We do not send your email, username, guesses, words, item names, or screen recordings.
            You can change this choice from the menu at any time.
          </Text>

          <Pressable
            style={({ pressed }) => [styles.allow, pressed && styles.pressed]}
            onPress={onAllow}
            accessibilityRole="button"
          >
            <Text style={styles.allowText}>ALLOW ANONYMOUS ANALYTICS</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.decline, pressed && styles.pressed]}
            onPress={onDecline}
            accessibilityRole="button"
          >
            <Text style={styles.declineText}>NOT NOW</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: theme.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: theme.border,
    padding: space.xl,
    gap: space.md,
  },
  eyebrow: { ...type.overline, color: theme.accent },
  title: { ...type.title, color: theme.text, fontSize: 23 },
  body: { ...type.body, color: theme.textMuted, lineHeight: 21 },
  detail: { ...type.caption, color: theme.textDim, lineHeight: 17 },
  allow: {
    minHeight: 50,
    borderRadius: radius.md,
    backgroundColor: theme.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: space.sm,
    paddingHorizontal: space.md,
  },
  allowText: { ...type.overline, color: theme.bg, textAlign: 'center' },
  decline: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  declineText: { ...type.overline, color: theme.textDim },
  pressed: { opacity: 0.82 },
});
