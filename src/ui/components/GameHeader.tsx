import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { palette, space, theme } from '../theme';
import { Ribbon } from './Ribbon';
import { RoundIconButton } from './RoundIconButton';

type Props = {
  title: string;
  subtitle?: string;
  /** Kept so existing call sites compile. The ribbon colour is `ribbon`. */
  accent?: string;
  /** Level ribbon fill. Defaults to the yellow ribbon. Clueless passes purple. */
  ribbon?: string;
  onExit?: () => void;
  onHelp?: () => void;
  leading?: ReactNode;
  trailing?: ReactNode;
  sideWidth?: number;
};

/**
 * In-play header: round back, a level ribbon, round help.
 * The ribbon label is the level line when a screen has one, otherwise the game name.
 */
export function GameHeader({
  title,
  subtitle,
  ribbon = palette.ribbon,
  onExit,
  onHelp,
  leading,
  trailing,
  sideWidth = 52,
}: Props) {
  const label = (subtitle ?? title).toUpperCase();
  return (
    <View style={styles.root}>
      <View style={[styles.side, { width: sideWidth }]}>
        {leading ??
          (onExit ? (
            <RoundIconButton
              icon={<Text style={styles.glyph}>‹</Text>}
              accessibilityLabel="Leave game"
              onPress={onExit}
              tone="blue"
              size={44}
            />
          ) : null)}
      </View>

      <View style={styles.copy}>
        <Ribbon label={label} color={ribbon} />
      </View>

      <View style={[styles.side, styles.trailing, { width: sideWidth }]}>
        {trailing ??
          (onHelp ? (
            <RoundIconButton
              icon={<Text style={styles.glyph}>?</Text>}
              accessibilityLabel="How to play"
              onPress={onHelp}
              tone="purple"
              size={44}
            />
          ) : null)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  side: { width: 52, alignItems: 'flex-start', justifyContent: 'center' },
  trailing: { alignItems: 'flex-end' },
  copy: { flex: 1, alignItems: 'center' },
  glyph: { color: theme.onPill, fontSize: 22, lineHeight: 24, fontWeight: '700' },
});
