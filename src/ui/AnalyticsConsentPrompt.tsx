import { Modal, StyleSheet, Text, View } from 'react-native';
import { Button, Surface } from './components';
import { font, radius, shadow, space, theme, type } from './theme';

type Props = {
  visible: boolean;
  onAllow: () => void;
  onDecline: () => void;
};

export function AnalyticsConsentPrompt({ visible, onAllow, onDecline }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDecline}>
      <View style={styles.backdrop}>
        <Surface level={3} raised style={styles.card} accessibilityRole="alert">
          <View style={styles.privacyMark}>
            <Text style={styles.privacyCheck}>✓</Text>
          </View>
          <Text style={styles.eyebrow}>PRIVATE BY DEFAULT</Text>
          <Text style={styles.title}>Help improve WordKrush?</Text>
          <Text style={styles.body}>
            Share anonymous play and reliability events so we can tune game balance and fix
            problems faster.
          </Text>
          <Text style={styles.detail}>
            We do not send your email, username, guesses, words, item names, or screen recordings.
            You can change this choice from the menu at any time.
          </Text>

          <Button
            title="Allow anonymous analytics"
            onPress={onAllow}
            size="lg"
            style={styles.allow}
          />
          <Button
            title="Not now"
            onPress={onDecline}
            variant="ghost"
            size="sm"
          />
        </Surface>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: theme.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    padding: space.xl,
    alignItems: 'center',
    ...shadow.raised,
  },
  privacyMark: {
    width: 58,
    height: 64,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    backgroundColor: theme.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.lg,
  },
  privacyCheck: { color: theme.bg, fontFamily: font.bold, fontSize: 27, fontWeight: '700' },
  eyebrow: { ...type.overline, color: theme.accent, textAlign: 'center' },
  title: { ...type.title, color: theme.text, fontSize: 25, marginTop: space.xs, textAlign: 'center' },
  body: { ...type.body, color: theme.textMuted, lineHeight: 21, marginTop: space.md, textAlign: 'center' },
  detail: { ...type.caption, color: theme.textDim, lineHeight: 17, marginTop: space.sm, textAlign: 'center' },
  allow: { marginTop: space.lg },
});
