import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';
import type { FeedbackIdentity } from '../feedback/identity';
import { captureSurveyEvent, newFeedbackOneShotId, submitFeedback } from '../feedback/submit';
import { FEEDBACK_KINDS, type FeedbackKind } from '../feedback/survey';
import { Button, PanelText, PopupModal, TabSwitch, TextField } from './components';

type Props = {
  visible: boolean;
  identity: FeedbackIdentity | null;
  onClose: () => void;
};

/**
 * In-app PostHog Surveys prompt as the kit's pop-up ("Contact us"): the kind
 * as small glossy tabs, a cream text box, a green Send. Responses land as
 * `survey sent` events.
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
    <PopupModal
      visible={visible}
      onClose={close}
      title={sent ? 'Thanks!' : 'Feedback'}
      // A tap outside must not throw away a half-written report.
      dismissable={!busy && message.trim().length === 0}
      footer={
        sent ? (
          <Button title="Done" tone="green" size="lg" onPress={onClose} />
        ) : (
          <>
            <Button title={busy ? 'Sending…' : 'Send'} tone="green" size="lg" onPress={() => void send()} disabled={busy} />
            <Button title="Cancel" tone="red" size="sm" onPress={close} />
          </>
        )
      }
    >
      {sent ? (
        <PanelText variant="heading">We read every report.</PanelText>
      ) : (
        <>
          <PanelText variant="heading">What’s on your mind?</PanelText>
          <PanelText>A bug, an idea, or anything else.</PanelText>
          <TabSwitch
            options={FEEDBACK_KINDS.map((option) => ({ id: option, label: option }))}
            value={kind}
            onChange={setKind}
          />
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
        </>
      )}
    </PopupModal>
  );
}

const styles = StyleSheet.create({
  message: { minHeight: 112, paddingVertical: 12 },
});
