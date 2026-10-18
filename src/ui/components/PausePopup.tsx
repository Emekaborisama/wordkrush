import { StyleSheet, View } from 'react-native';
import { space } from '../theme';
import { Button } from './Button';
import { PanelText, PopupModal } from './Panel';

/**
 * What the gold gear in a game's booster dock opens: the kit's pop-up with
 * Resume first, then help, then the way out. Leaving keeps the run saved
 * wherever the game already saves it.
 */
export function PausePopup({
  visible,
  onResume,
  onHelp,
  onLeave,
  leaveLabel = 'Leave game',
  note,
}: {
  visible: boolean;
  onResume: () => void;
  onHelp?: () => void;
  onLeave: () => void;
  leaveLabel?: string;
  /** One line under the title, e.g. "Your run is saved." */
  note?: string;
}) {
  return (
    <PopupModal visible={visible} onClose={onResume} title="Paused" width={340}>
      {note ? <PanelText>{note}</PanelText> : null}
      <View style={styles.actions}>
        <Button title="Resume" tone="green" size="lg" onPress={onResume} />
        {onHelp ? <Button title="How to play" tone="blue" size="md" onPress={onHelp} /> : null}
        <Button title={leaveLabel} tone="red" size="md" onPress={onLeave} />
      </View>
    </PopupModal>
  );
}

const styles = StyleSheet.create({
  actions: { gap: space.sm },
});
