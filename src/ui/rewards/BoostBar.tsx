import { Text, StyleSheet } from 'react-native';
import type { BoostKind } from '../../rewards/types';
import { BoosterDock } from '../components/BoosterDock';
import { SquareButton } from '../components/SquareButton';
import { GameIcon } from '../icons/GameIcon';
import type { IconName } from '../icons/names';
import { font, palette, tone } from '../theme';
import { useHeightClass } from '../useHeightClass';

export type BoostControl = {
  kind: BoostKind;
  label: string;
  /** Glyph on the green tile. */
  icon?: IconName;
  /** @deprecated Text glyph from the old pill; used only when `icon` is missing. */
  glyph?: string;
  price: number;
  disabled?: boolean;
  disabledReason?: string;
  onPress: () => void;
};

/** How many coins short a boost is, as the disabled explanation. */
export function coinShortfall(coins: number, price: number): string | undefined {
  const need = price - coins;
  if (need <= 0) return undefined;
  return `Need ${need} more coins`;
}

/**
 * The kit's booster bar for a solo run: one green tile per boost with its
 * coin price, the gold gear on the right when the screen passes `onPause`.
 * Hidden by the caller during a live race.
 */
export function BoostBar({ controls, onPause }: { controls: BoostControl[]; onPause?: () => void }) {
  // On a short screen the tiles drop their captions; the label stays for screen readers.
  const compact = useHeightClass() !== 'regular';
  if (controls.length === 0 && !onPause) return null;
  return (
    <BoosterDock onPause={onPause}>
      {controls.map((control) => (
        <SquareButton
          key={control.kind}
          icon={
            control.icon ? (
              <GameIcon name={control.icon} size={32} color={tone.green.outline} />
            ) : (
              <Text style={styles.glyph}>{control.glyph ?? ''}</Text>
            )
          }
          accessibilityLabel={control.label}
          onPress={control.onPress}
          tone="green"
          size={compact ? 44 : 56}
          price={control.price}
          caption={compact ? undefined : control.label}
          captionTone="dark"
          disabled={control.disabled}
          disabledReason={control.disabledReason}
        />
      ))}
    </BoosterDock>
  );
}

const styles = StyleSheet.create({
  glyph: { color: palette.white, fontFamily: font.black, fontSize: 20 },
});
