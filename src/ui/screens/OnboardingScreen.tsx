import { StyleSheet, Text, View } from 'react-native';
import { Button, DisplayTitle } from '../components';
import { Mascot } from '../lottie/Mascot';
import { screen, space, theme, type } from '../theme';

type Props = {
  onPlay: () => void;
  onExplore: () => void;
};

/**
 * One welcome page. Shown once, before any score exists.
 * The promise is the owner's first-run line.
 */
export function OnboardingScreen({ onPlay, onExplore }: Props) {
  return (
    <View style={styles.root}>
      <Mascot size={168} pose="celebrate" />
      <DisplayTitle>Guess right. Keep the streak alive.</DisplayTitle>
      <Text style={styles.body}>Three quick games. One flame. Come back tomorrow.</Text>
      <Button title="Play your first game" size="xl" tone="green" onPress={onPlay} />
      <Button title="Explore games" size="md" tone="blue" onPress={onExplore} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...screen.page,
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.xl,
    gap: space.md,
  },
  body: {
    ...type.body,
    color: theme.textMuted,
    textAlign: 'center',
  },
});
