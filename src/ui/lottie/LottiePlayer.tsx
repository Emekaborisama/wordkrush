import { useEffect, useState } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import LottieView from 'lottie-react-native';

export type LottieSource = { uri: string };

type Props = {
  source: LottieSource;
  /** Used once if `source` fails to load (CDN miss, offline). */
  fallback?: LottieSource;
  autoPlay?: boolean;
  loop?: boolean;
  style?: StyleProp<ViewStyle>;
  onFinish?: () => void;
};

/**
 * Thin owner over `lottie-react-native`. Native and web share this file: the
 * package maps web to `@lottiefiles/dotlottie-react`. A failed remote load
 * swaps to `fallback` once, then renders nothing — chrome, never a crash.
 */
export function LottiePlayer({
  source,
  fallback,
  autoPlay = true,
  loop = false,
  style,
  onFinish,
}: Props) {
  const [useFallback, setUseFallback] = useState(false);
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    setUseFallback(false);
    setGaveUp(false);
  }, [source, fallback]);

  if (gaveUp) return null;

  const active = useFallback && fallback !== undefined ? fallback : source;
  const box = StyleSheet.flatten(style);
  const webStyle =
    box && typeof box.width === 'number' && typeof box.height === 'number'
      ? { width: box.width, height: box.height }
      : undefined;

  return (
    <LottieView
      source={active}
      autoPlay={autoPlay}
      loop={loop}
      resizeMode="contain"
      style={style}
      webStyle={webStyle}
      onAnimationFinish={(cancelled) => {
        if (!cancelled) onFinish?.();
      }}
      onAnimationFailure={() => {
        if (!useFallback && fallback !== undefined) {
          setUseFallback(true);
          return;
        }
        setGaveUp(true);
      }}
    />
  );
}
