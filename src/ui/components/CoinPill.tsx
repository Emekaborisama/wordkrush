import { GameIcon } from '../icons/GameIcon';
import { ResourcePill } from './ResourcePill';

export type CoinIconProps = {
  size?: number;
};

/** The kit coin (gold, embossed "K"), from the icon set. */
export function CoinIcon({ size = 28 }: CoinIconProps) {
  return <GameIcon name="coin" size={size} />;
}

export type CoinPillProps = {
  count: number;
  onPress?: () => void;
  accessibilityLabel?: string;
};

/** Coin total as the kit's top-bar pill, ticking up from the last value. */
export function CoinPill({ count, onPress, accessibilityLabel }: CoinPillProps) {
  return (
    <ResourcePill
      icon={<CoinIcon size={34} />}
      value={count}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel ?? `${count.toLocaleString('en-US')} coins`}
    />
  );
}
