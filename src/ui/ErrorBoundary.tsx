import { Component, type ComponentType, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { reportAppError } from '../analytics/observe';
import { font, palette, space } from './theme';

type Props = { children: ReactNode };
type State = { failed: boolean; attempt: number };

/**
 * The root's last line of defence: if a render throws, the player sees a way
 * back instead of a blank screen. Deliberately plain React Native and theme
 * colours, nothing from the component kit, because the kit could be what broke.
 * Scores and progress live in storage, so a reload loses at most the last move.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false, attempt: 0 };

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true };
  }

  componentDidCatch(): void {
    reportAppError('render', true);
  }

  private retry = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.reload();
      return;
    }
    this.setState((state) => ({ failed: false, attempt: state.attempt + 1 }));
  };

  render() {
    if (!this.state.failed) return <View key={this.state.attempt} style={styles.fill}>{this.props.children}</View>;
    return (
      <View style={[styles.fill, styles.screen]} accessibilityRole="alert">
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body}>Your scores and progress are saved. Reload to carry on playing.</Text>
        <Pressable onPress={this.retry} accessibilityRole="button" style={styles.button}>
          <Text style={styles.buttonText}>Reload WordKrush</Text>
        </Pressable>
      </View>
    );
  }
}

/** The app's root, wrapped so a render error ends on a Reload screen. */
export function withErrorBoundary(Inner: ComponentType): ComponentType {
  function Guarded() {
    return (
      <ErrorBoundary>
        <Inner />
      </ErrorBoundary>
    );
  }
  return Guarded;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  screen: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    padding: space.xl,
    backgroundColor: palette.navy,
  },
  title: { fontFamily: font.black, fontSize: 24, color: palette.white, textAlign: 'center' },
  body: { fontFamily: font.body, fontSize: 16, lineHeight: 22, color: palette.white, textAlign: 'center', maxWidth: 320 },
  button: {
    minHeight: 48,
    paddingHorizontal: space.xl,
    borderRadius: 16,
    justifyContent: 'center',
    backgroundColor: palette.gold,
  },
  buttonText: { fontFamily: font.black, fontSize: 18, color: palette.navyDeep },
});
