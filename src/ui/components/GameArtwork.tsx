import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { gameAccentTokens, radius, shadow, theme } from '../theme';

const GAME_ART: Record<string, ImageSourcePropType> = {
  'more-or-less': require('../../../assets/games/more-or-less.png'),
  clueless: require('../../../assets/games/clueless.png'),
  wordfall: require('../../../assets/games/wordfall.png'),
};

/** Intrinsic aspect of `wordkrush-lockup-tight.png` (1254x889). */
const LOCKUP_ASPECT = 1254 / 889;

const BRAND_ART = {
  mark: require('../../../assets/logo/wordkrush-mark.png'),
  lockup: require('../../../assets/logo/wordkrush-lockup-tight.png'),
} as const;

type GameArtworkProps = {
  gameId: string;
  accent: string;
  size?: number;
  raised?: boolean;
};

/** Bundled, offline key art. The emoji in the registry remains only as an
 * accessibility/fallback label; player-facing chrome uses these marks. */
export function GameArtwork({ gameId, accent, size = 72, raised = false }: GameArtworkProps) {
  const source = GAME_ART[gameId];
  const tokens = gameAccentTokens(accent);
  return (
    <View
      style={[
        styles.shell,
        {
          width: size,
          height: size,
          borderRadius: Math.max(radius.md, size * 0.24),
          borderColor: tokens.glow,
          backgroundColor: tokens.soft,
        },
        raised && shadow.card,
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      {source ? (
        <Image source={source} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.fallback, { backgroundColor: accent }]} />
      )}
    </View>
  );
}

export function BrandArtwork({
  size = 48,
  variant = 'mark',
}: {
  size?: number;
  variant?: 'mark' | 'lockup';
}) {
  const isLockup = variant === 'lockup';
  return (
    <Image
      source={BRAND_ART[variant]}
      style={{
        // The mark is square; the lockup is not. Forcing the lockup into a
        // square box is what made it collapse to nothing in a header slot —
        // `size` is its HEIGHT and the width follows the artwork.
        width: isLockup ? Math.round(size * LOCKUP_ASPECT) : size,
        height: size,
        borderRadius: isLockup ? 0 : size * 0.26,
      }}
      resizeMode="contain"
      accessibilityLabel={isLockup ? 'WordKrush' : undefined}
      accessibilityElementsHidden={!isLockup}
      importantForAccessibility={isLockup ? 'yes' : 'no'}
    />
  );
}

const styles = StyleSheet.create({
  shell: {
    overflow: 'hidden',
    borderWidth: 1,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fallback: {
    flex: 1,
    margin: 14,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: theme.edge,
  },
});
