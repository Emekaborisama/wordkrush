import { useEffect, useState } from 'react';
import { AccessibilityInfo, Image, StyleSheet, View } from 'react-native';
import deer from '../../../assets/lottie/deer.lottie';
import { bundledAssetUri } from './bundledUri';
import { LottiePlayer } from './LottiePlayer';
import { deerSlot, LOTTIE_CLIPS, mascotSize, type DeerPose } from './sources';

type Props = {
  /** Height in px. Width follows the deer's 4:3 composition. */
  size?: number;
  /** Catalog pose. Distinct files can replace shared CDN rows in `LOTTIE_CLIPS`. */
  pose?: DeerPose;
};

/**
 * WordKrush mascot — a little deer. Plays the bundled `.lottie` (white
 * backdrop layer already stripped). Decorative: hidden from assistive tech.
 */
export function Mascot({ size = 56, pose = 'idle' }: Props) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const box = mascotSize(size);
  const clip = LOTTIE_CLIPS[deerSlot(pose)];
  const bundledUri = bundledAssetUri(
    deer,
    typeof Image.resolveAssetSource === 'function'
      ? (source) => Image.resolveAssetSource(source as never)
      : undefined,
  );

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
      nativeID="wk-mascot"
      style={[styles.root, box]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      {bundledUri ? (
        <LottiePlayer
          source={{ uri: bundledUri }}
          autoPlay={!reduceMotion}
          loop={clip.loop && !reduceMotion}
          style={box}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { overflow: 'hidden' },
});
