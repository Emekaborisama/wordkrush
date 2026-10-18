import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { GameIcon } from '../icons/GameIcon';
import { palette, space } from '../theme';
import { SquareButton } from './SquareButton';

/**
 * The kit's booster bar: a pale translucent tray along the foot of the game
 * with green booster tiles on the left and the gold gear riding its right
 * end. The gear opens the pause pop-up.
 */
export function BoosterDock({
  children,
  onPause,
  pauseLabel = 'Pause',
  style,
}: {
  children?: ReactNode;
  onPause?: () => void;
  pauseLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.dock, style]}>
      <View style={styles.tiles}>{children}</View>
      {onPause ? (
        <SquareButton
          icon={<GameIcon name="gear" size={34} />}
          accessibilityLabel={pauseLabel}
          onPress={onPause}
          tone="gold"
          shape="circle"
          size={54}
          style={styles.gear}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 84,
    paddingLeft: space.sm,
    paddingRight: space.xs,
    paddingTop: space.sm,
    paddingBottom: space.md,
    borderRadius: 22,
    backgroundColor: 'rgba(216, 244, 252, 0.88)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    borderBottomColor: palette.frame,
  },
  tiles: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: space.md },
  gear: { marginRight: -space.sm },
});
