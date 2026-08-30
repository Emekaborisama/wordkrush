import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { FeedbackIdentity } from '../feedback/identity';
import {
  captureSurveyEvent,
  newFeedbackOneShotId,
  submitFeedback,
} from '../feedback/submit';
import { FEEDBACK_KINDS, type FeedbackKind } from '../feedback/survey';
import { Button, PressableScale, Surface, TextField } from './components';
import { font, radius, shadow, space, theme, type, withAlpha } from './theme';

type Props = {
  visible: boolean;
  identity: FeedbackIdentity | null;
  onClose: () => void;
};

/**
 * In-app PostHog Surveys prompt. Replaces Userback's hosted widget: same
 * drawer entry, our own UI, responses land as `survey sent` events.
 */
export function FeedbackPrompt({ visible, identity, onClose }: Props) {
  const [kind, setKind] = useState<FeedbackKind>('Bug');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const oneShotId = useRef(newFeedbackOneShotId());

  useEffect(() => {
    if (!visible) return;
    oneShotId.current = newFeedbackOneShotId();
    setKind('Bug');
    setMessage('');
    setBusy(false);
    setError(null);
    setSent(false);
    void captureSurveyEvent('survey shown', {
      identity,
      platform: Platform.OS,
      oneShotId: oneShotId.current,
    });
  }, [visible, identity]);

  const close = () => {
    if (!sent) {
      void captureSurveyEvent('survey dismissed', {
        identity,
        platform: Platform.OS,
        oneShotId: oneShotId.current,
      });
    }
    onClose();
  };

  const send = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const ok = await submitFeedback({
      kind,
      message,
      identity,
      platform: Platform.OS,
      oneShotId: oneShotId.current,
    });
    setBusy(false);
    if (!ok) {
      setError(
        message.trim()
          ? 'Could not send just now. Try again in a moment.'
          : 'Write a little more so we know what to look at.',
      );
      return;
    }
    setSent(true);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Close" />
        <Surface level={3} raised style={styles.card} accessibilityRole="alert">
          {sent ? (
            <>
              <Text style={styles.eyebrow}>SENT</Text>
              <Text style={styles.title}>Thanks</Text>
              <Text style={styles.body}>We read every report.</Text>
              <Button title="Done" onPress={onClose} size="lg" style={styles.send} />
            </>
          ) : (
            <>
              <Text style={styles.eyebrow}>FEEDBACK</Text>
              <Text style={styles.title}>What’s on your mind?</Text>
              <Text style={styles.body}>A bug, an idea, or anything else.</Text>

              <View style={styles.kinds}>
                {FEEDBACK_KINDS.map((option) => {
                  const active = option === kind;
                  return (
                    <PressableScale
                      key={option}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={option}
                      onPress={() => setKind(option)}
                      style={[styles.kind, active && styles.kindActive]}
                    >
                      <Text style={[styles.kindLabel, active && styles.kindLabelActive]}>
                        {option}
                      </Text>
                    </PressableScale>
                  );
                })}
              </View>

              <TextField
                label="Details"
                value={message}
                onChangeText={setMessage}
                placeholder="Tell us what happened…"
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                editable={!busy}
                error={error ?? undefined}
                inputStyle={styles.message}
              />

              <Button
                title={busy ? 'Sending…' : 'Send'}
                onPress={() => void send()}
                size="lg"
                disabled={busy}
                style={styles.send}
              />
              <Button title="Cancel" onPress={close} variant="ghost" size="sm" />
            </>
          )}
        </Surface>
      </KeyboardAvoidingView>
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
    ...shadow.raised,
  },
  eyebrow: { ...type.overline, color: theme.accent },
  title: { ...type.title, color: theme.text, fontSize: 25, marginTop: space.xs },
  body: { ...type.body, color: theme.textMuted, lineHeight: 21, marginTop: space.sm },
  kinds: {
    flexDirection: 'row',
    gap: space.xs,
    marginTop: space.lg,
    marginBottom: space.md,
  },
  kind: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space.sm,
  },
  kindActive: {
    borderColor: theme.accent,
    backgroundColor: withAlpha(theme.accent, 0.16),
  },
  kindLabel: {
    fontFamily: font.semibold,
    fontSize: 13,
    fontWeight: '600',
    color: theme.textMuted,
  },
  kindLabelActive: { color: theme.text },
  message: {
    minHeight: 112,
    paddingVertical: 12,
  },
  send: { marginTop: space.lg },
});
