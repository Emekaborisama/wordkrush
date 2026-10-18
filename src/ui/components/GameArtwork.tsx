import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { palette, shadow } from '../theme';

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
  /** Fallback fill when a game has no bundled art. */
  accent: string;
  size?: number;
  raised?: boolean;
};

/**
 * Bundled, offline key art in the kit's white-rimmed tile (the same white rim
 * the pop-ups wear), so the art reads as a piece of the UI, not a sticker.
 */
export function GameArtwork({ gameId, accent, size = 72, raised = false }: GameArtworkProps) {
  const source = GAME_ART[gameId];
  const rim = Math.max(3, Math.round(size * 0.05));
  return (
    <View
      style={[
        styles.shell,
        { width: size, height: size, borderRadius: Math.round(size * 0.24), borderWidth: rim },
        raised && shadow.card,
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={[styles.clip, { borderRadius: Math.round(size * 0.24) - rim }]}>
        {source ? (
          <Image source={source} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.fallback, { backgroundColor: accent }]} />
        )}
      </View>
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
        // The mark is square; the lockup is not. `size` is its HEIGHT and the
        // width follows the artwork.
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
  shell: { borderColor: palette.white, backgroundColor: palette.white },
  clip: { flex: 1, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  fallback: { flex: 1 },
});
