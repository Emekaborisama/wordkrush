import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { GameIcon } from '../icons/GameIcon';
import { space, tone } from '../theme';
import { RibbonTitle } from './RibbonTitle';
import { SquareButton } from './SquareButton';

type Props = {
  title: string;
  subtitle?: string;
  /** Kept so existing call sites compile; the kit's title tab is teal. */
  accent?: string;
  /** Tab fill override. */
  ribbon?: string;
  onExit?: () => void;
  onHelp?: () => void;
  leading?: ReactNode;
  trailing?: ReactNode;
  sideWidth?: number;
};

/**
 * In-play header from the kit's game screen: sky back square, the level on
 * a small teal title tab, help square. The tab reads the level line when a
 * screen has one, otherwise the game name.
 */
export function GameHeader({ title, subtitle, ribbon, onExit, onHelp, leading, trailing, sideWidth = 52 }: Props) {
  const label = (subtitle ?? title).toUpperCase();
  return (
    <View style={styles.root}>
      <View style={[styles.side, { minWidth: sideWidth }]}>
        {leading ??
          (onExit ? (
            <SquareButton
              icon={<GameIcon name="back" size={24} color={tone.sky.outline} />}
              accessibilityLabel="Leave game"
              onPress={onExit}
              tone="sky"
              size={44}
            />
          ) : null)}
      </View>
      <View style={styles.copy}>
        <RibbonTitle label={label} color={ribbon} size="sm" />
      </View>
      <View style={[styles.side, styles.trailing, { minWidth: sideWidth }]}>
        {trailing ??
          (onHelp ? (
            <SquareButton
              icon={<GameIcon name="help" size={24} color={tone.sky.outline} />}
              accessibilityLabel="How to play"
              onPress={onHelp}
              tone="sky"
              size={44}
            />
          ) : null)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  side: { alignItems: 'flex-start', justifyContent: 'center' },
  trailing: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'flex-end', gap: space.xs },
  copy: { flex: 1, minWidth: 0, alignItems: 'center' },
});
