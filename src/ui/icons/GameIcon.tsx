import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg from 'react-native-svg';
import { useSvgId } from '../components/Gradient';
import { palette } from '../theme';
import { ART } from './art';
import { drawGlyph } from './glyphs';
import { isArtIcon, type IconName } from './names';
import type { IconCtx } from './paint';

export { ART_ICON_NAMES, GLYPH_ICON_NAMES, ICON_NAMES, isArtIcon } from './names';
export type { ArtIconName, GlyphIconName, IconName } from './names';

export type GameIconProps = {
  name: IconName;
  /** Width and height in px. */
  size?: number;
  /**
   * Glyph outline colour, navy ink by default; pass the button tone's
   * `outline` to sit a glyph on a glossy face. Art icons keep their own
   * palette and ignore it.
   */
  color?: string;
  style?: StyleProp<ViewStyle>;
  /** Omit for decoration: the icon is then hidden from assistive tech. */
  accessibilityLabel?: string;
};

/**
 * The kit's icon set, drawn in a 64×64 box with react-native-svg so it stays
 * crisp at any size. Art icons are full-colour and glossy; glyphs are white
 * with an outline, for drawing on glossy buttons.
 */
export function GameIcon({ name, size = 32, color, style, accessibilityLabel }: GameIconProps) {
  const uid = useSvgId('gi');
  const c: IconCtx = {
    id: (key) => `${uid}${key}`,
    url: (key) => `url(#${uid}${key})`,
    ink: color ?? palette.ink,
  };
  const label = accessibilityLabel?.trim();
  return (
    <View
      style={[styles.box, { width: size, height: size }, style]}
      {...(label
        ? { accessible: true, accessibilityRole: 'image' as const, accessibilityLabel: label }
        : {
            accessibilityElementsHidden: true,
            importantForAccessibility: 'no-hide-descendants' as const,
            'aria-hidden': true,
          })}
    >
      <Svg width={size} height={size} viewBox="0 0 64 64">
        {isArtIcon(name) ? ART[name](c) : drawGlyph(name, c)}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  // Icons never take touches; the control around them does.
  box: { pointerEvents: 'none' },
});
