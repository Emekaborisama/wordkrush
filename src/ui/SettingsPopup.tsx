import { StyleSheet, View } from 'react-native';
import { canVibrate } from '../native/haptics';
import type { FeedbackChannel, FeedbackSettings } from '../settings/types';
import { Button, CountryFlag, CreamBox, CreamText, GameIcon, PanelText, PopupModal, Toggle } from './components';
import { space, tone } from './theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  feedbackSettings: FeedbackSettings;
  onToggleFeedback: (channel: FeedbackChannel) => void;
  signedInAs: string | null;
  /** The flag beside the player's name; null when hidden or unknown. */
  flag: string | null;
  onFlag: () => void;
  onAccount: () => void;
  onScores: () => void;
  onTeams: () => void;
  canSendFeedback: boolean;
  onSendFeedback: () => void;
  version: string;
};

/**
 * The kit's final Settings pop-up, one control for one control: the Music /
 * SFX switches become Sound / Vibration, Connect becomes Account, the Terms /
 * Privacy pair becomes Scores / Teams, Contact us becomes Send feedback, and
 * the User ID line names the player.
 */
export function SettingsPopup({
  visible,
  onClose,
  feedbackSettings,
  onToggleFeedback,
  signedInAs,
  flag,
  onFlag,
  onAccount,
  onScores,
  onTeams,
  canSendFeedback,
  onSendFeedback,
  version,
}: Props) {
  const knob = (name: 'sound' | 'soundOff' | 'vibrate' | 'music') => (
    <GameIcon name={name} size={22} color={name === 'soundOff' ? tone.red.outline : tone.green.outline} />
  );
  return (
    <PopupModal visible={visible} onClose={onClose} title="Settings" width={360}>
      <CreamBox>
        {/* Switches stay open on toggle: people flip them and want to hear
            the result straight away. */}
        <View style={styles.row}>
          <CreamText variant="teal">Sound</CreamText>
          <Toggle
            value={feedbackSettings.sound}
            onChange={() => onToggleFeedback('sound')}
            accessibilityLabel="Sound"
            onIcon={knob('sound')}
            offIcon={knob('soundOff')}
          />
        </View>
        <View style={styles.row}>
          <CreamText variant="teal">Music</CreamText>
          <Toggle
            value={feedbackSettings.music}
            onChange={() => onToggleFeedback('music')}
            accessibilityLabel="Music"
            onIcon={knob('music')}
            offIcon={knob('music')}
          />
        </View>
        {/* Only where a buzz can actually happen: a switch that visibly does
            nothing is worse than no switch. */}
        {canVibrate() ? (
          <View style={styles.row}>
            <CreamText variant="teal">Vibration</CreamText>
            <Toggle
              value={feedbackSettings.vibration}
              onChange={() => onToggleFeedback('vibration')}
              accessibilityLabel="Vibration"
              onIcon={knob('vibrate')}
              offIcon={knob('vibrate')}
            />
          </View>
        ) : null}
        {/* True because the audio mode mixes (src/native/sound.ts): game
            sounds play over the player's own music instead of pausing it. */}
        <CreamText style={styles.music}>Playing your own music? Switch Music off and it keeps playing under the game sounds.</CreamText>
      </CreamBox>
      <Button
        title={signedInAs ? 'Account' : 'Sign in'}
        tone="blue"
        size="md"
        leading={<GameIcon name="user" size={24} color={tone.blue.outline} />}
        onPress={onAccount}
      />
      <Button
        title="Your flag"
        tone="blue"
        size="md"
        leading={flag ? <CountryFlag code={flag} size={22} /> : <GameIcon name="user" size={24} color={tone.blue.outline} />}
        onPress={onFlag}
      />
      <View style={styles.pair}>
        <Button title="Scores" tone="green" size="md" style={styles.half} onPress={onScores} />
        <Button title="Teams" tone="green" size="md" style={styles.half} onPress={onTeams} />
      </View>
      {canSendFeedback ? (
        <Button
          title="Send feedback"
          tone="gold"
          size="md"
          leading={<GameIcon name="mail" size={24} color={tone.gold.outline} />}
          onPress={onSendFeedback}
        />
      ) : null}
      <PanelText>{`${signedInAs ? `Player ${signedInAs}` : 'Guest'} · v${version}`}</PanelText>
    </PopupModal>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  pair: { flexDirection: 'row', gap: space.sm },
  half: { flex: 1 },
  music: { paddingTop: space.xs, fontSize: 13, lineHeight: 18 },
});
