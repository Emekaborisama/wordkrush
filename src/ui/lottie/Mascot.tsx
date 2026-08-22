import { useEffect, useState } from 'react';
import { AccessibilityInfo, Image, StyleSheet, View } from 'react-native';
import deer from '../../../assets/lottie/deer.lottie';
import { LottiePlayer } from './LottiePlayer';
import { DEER_CDN_URI, deerSlot, LOTTIE_CLIPS, mascotSize, type DeerPose } from './sources';

type Props = {
  /** Height in px. Width follows the deer's 4:3 composition. */
  size?: number;
  /** Catalog pose. Distinct files can replace shared CDN rows in `LOTTIE_CLIPS`. */
  pose?: DeerPose;
};

/**
 * WordKrush mascot — a little deer. Plays the slot's lottie.host URL, then
 * the bundled `.lottie` if that fetch fails. Decorative: hidden from assistive tech.
 */
export function Mascot({ size = 56, pose = 'idle' }: Props) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const box = mascotSize(size);
  const clip = LOTTIE_CLIPS[deerSlot(pose)];
  const cdn = clip.cdn ?? DEER_CDN_URI;
  // `Image.resolveAssetSource` is native-only — react-native-web does not
  // implement it, and calling it there throws, taking the whole hub down.
  // On web the bundler already hands back a URL string for the asset.
  const bundledUri =
    typeof Image.resolveAssetSource === 'function'
      ? Image.resolveAssetSource(deer)?.uri
      : typeof deer === 'string'
        ? deer
        : undefined;

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );
    return () => subscription.remove();
  }, []);

  return (
    <View
      style={[styles.root, box]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <LottiePlayer
        // Bundled first, CDN second. The hosted copy still carries a
        // full-canvas white backdrop layer ("Shape Layer 1"), which renders as
        // a white plate behind the deer on our dark chrome. The bundled file
        // has that layer stripped. Flip these back once lottie.host is
        // re-uploaded with the corrected animation.
        source={bundledUri ? { uri: bundledUri } : { uri: cdn }}
        fallback={{ uri: cdn }}
        autoPlay={!reduceMotion}
        loop={clip.loop && !reduceMotion}
        style={box}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { overflow: 'hidden' },
});
