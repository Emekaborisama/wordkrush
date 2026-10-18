import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gradient } from '../components/Gradient';
import { GameIcon, ICON_NAMES, type IconName } from '../icons/GameIcon';
import { font, palette, space, tone, withAlpha } from '../theme';

/**
 * Icon set preview: every `GameIcon` at 48px on the three surfaces icons sit
 * on in the kit (the navy page, a cream box, a green booster tile), then the
 * whole set at 24px, named, to check small-size legibility.
 */
export function IconsKit() {
  return (
    <View style={styles.wrap}>
      <Caption>48px on the page</Caption>
      <View style={styles.grid}>
        {ICON_NAMES.map((name) => (
          <Named key={name} name={name} size={48} />
        ))}
      </View>

      <Caption>48px in a cream box</Caption>
      <View style={styles.cream}>
        {ICON_NAMES.map((name) => (
          <GameIcon key={name} name={name} size={48} />
        ))}
      </View>

      <Caption>48px on green booster tiles (glyph outline = tone.green.outline)</Caption>
      <View style={styles.tiles}>
        {ICON_NAMES.map((name) => (
          <BoosterTile key={name}>
            <GameIcon name={name} size={48} color={tone.green.outline} />
          </BoosterTile>
        ))}
      </View>

      <Caption>24px</Caption>
      <View style={styles.grid}>
        {ICON_NAMES.map((name) => (
          <Named key={name} name={name} size={24} />
        ))}
      </View>
    </View>
  );
}

function Caption({ children }: { children: string }) {
  return <Text style={styles.caption}>{children}</Text>;
}

function Named({ name, size }: { name: IconName; size: number }) {
  return (
    <View style={styles.cell}>
      <GameIcon name={name} size={size} accessibilityLabel={name} />
      <Text style={styles.name} numberOfLines={1}>
        {name}
      </Text>
    </View>
  );
}

/** The kit's green booster square, enough of it to judge an icon against. */
function BoosterTile({ children }: { children: ReactNode }) {
  return (
    <View style={styles.tileRim}>
      <View style={styles.tileLip}>
        <View style={styles.tileFace}>
          <Gradient colors={[tone.green.top, tone.green.bottom]} />
          <View style={styles.tileShine} />
          {children}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  caption: { fontFamily: font.heavy, fontSize: 13, color: palette.cream, marginTop: space.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cell: { width: 66, alignItems: 'center', paddingVertical: 4, gap: 3 },
  name: { fontFamily: font.heavy, fontSize: 11, lineHeight: 14, color: palette.white },
  cream: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    padding: 12,
    borderRadius: 18,
    backgroundColor: palette.creamFill,
    borderWidth: 3,
    borderColor: palette.creamEdge,
  },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tileRim: { borderRadius: 15, padding: 2, backgroundColor: tone.green.outline },
  tileLip: { borderRadius: 13, paddingBottom: 4, backgroundColor: tone.green.lip },
  tileFace: {
    width: 58,
    height: 56,
    borderRadius: 13,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileShine: {
    position: 'absolute',
    left: 4,
    right: 4,
    top: 3,
    height: '42%',
    borderRadius: 10,
    backgroundColor: withAlpha(palette.white, 0.16),
  },
});
