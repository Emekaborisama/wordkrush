import { StyleSheet, View } from 'react-native';
import type { Challenge } from '../games/more-or-less/challenge';
import { Button, GameIcon, PanelText, PopupModal } from './components';
import { CatMascot } from './mascot/CatMascot';
import { tone } from './theme';

/**
 * A friend's shared result, opened: their streak, the level they played, and
 * the dare. Accepting replays their exact pairs (same seed, same order).
 */
export function ChallengePopup({
  challenge,
  levelName,
  onAccept,
  onDecline,
}: {
  challenge: Challenge | null;
  levelName: string;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <PopupModal
      visible={challenge !== null}
      onClose={onDecline}
      title="CHALLENGE!"
      ribbon="banner"
      footer={
        <>
          <Button
            title="Accept challenge"
            tone="green"
            size="lg"
            leading={<GameIcon name="play" size={24} color={tone.green.outline} />}
            onPress={onAccept}
          />
          <Button title="Not now" tone="sky" size="sm" onPress={onDecline} />
        </>
      }
    >
      <View style={styles.hero}>
        <CatMascot size={104} mood="cheer" />
      </View>
      <PanelText variant="heading">{`Beat a streak of ${challenge?.target ?? 0}`}</PanelText>
      <PanelText>{`A friend played Higher or Lower: ${levelName}. You get the same pairs in the same order. Can you go one better?`}</PanelText>
    </PopupModal>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center' },
});
