import type { ReactNode } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StrokeText } from '../components/StrokeText';
import { useAppFonts } from '../fonts';
import { font, palette, space } from '../theme';
import { BlocksKit } from './BlocksKit';
import { ControlsKit } from './ControlsKit';
import { IconsKit } from './IconsKit';

/**
 * Dev-only design-system page. Open a dev build with `?kit` (web) to see
 * every Block Blast primitive on one scroll, for screenshots and review.
 * `?kit=icons`, `?kit=blocks`, `?kit=controls` show one section.
 */
export function wantsUiKit(): boolean {
  if (!__DEV__) return false;
  if (typeof window === 'undefined' || !window.location) return false;
  return /[?&]kit\b/.test(window.location.search ?? '');
}

function section(): string {
  if (typeof window === 'undefined' || !window.location) return 'all';
  const match = /[?&]kit=([a-z]+)/.exec(window.location.search ?? '');
  return match?.[1] ?? 'all';
}

export function KitRoot() {
  const [loaded, error] = useAppFonts();
  if (!loaded && !error) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={palette.white} />
      </View>
    );
  }
  const only = section();
  const show = (name: string) => only === 'all' || only === name;
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {show('type') ? (
        <Section title="Type">
          <StrokeText size={40} stroke={palette.navyDeep} strokeWidth={3} depth={3}>
            LEVEL COMPLETED
          </StrokeText>
          <StrokeText size={28} stroke={palette.coralEdge}>
            Settings
          </StrokeText>
          <Text style={styles.body}>Exo 2 Bold body copy on the backdrop.</Text>
        </Section>
      ) : null}
      {show('controls') ? (
        <Section title="Controls">
          <ControlsKit />
        </Section>
      ) : null}
      {show('icons') ? (
        <Section title="Icons">
          <IconsKit />
        </Section>
      ) : null}
      {show('blocks') ? (
        <Section title="Blocks">
          <BlocksKit />
        </Section>
      ) : null}
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>{title}</Text>
      <View style={styles.body2}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.navy },
  root: { flex: 1, backgroundColor: palette.navy },
  content: { padding: space.md, gap: space.lg, paddingBottom: 80 },
  section: { gap: space.sm },
  heading: { fontFamily: font.black, fontSize: 22, color: palette.gold },
  body: { fontFamily: font.body, fontSize: 15, color: palette.white },
  body2: { gap: space.md },
});
