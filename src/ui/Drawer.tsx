import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import type { AnalyticsConsent } from '../analytics/events';
import { GAMES } from '../games/registry';
import { radius, theme } from './theme';

export type DrawerDestination =
  | { kind: 'hub' }
  | { kind: 'game'; gameId: string }
  | { kind: 'scores'; gameId: string }
  | { kind: 'account' };

type Props = {
  open: boolean;
  onClose: () => void;
  onNavigate: (to: DrawerDestination) => void;
  /** Highlights where the player currently is. */
  activeGameId?: string;
  activeKind?: DrawerDestination['kind'];
  signedInAs?: string | null;
  analyticsConsent: AnalyticsConsent;
  onAnalyticsPress: () => void;
};

const WIDTH = 268;
const DURATION = 220;

/**
 * Slide-in navigation drawer.
 *
 * Hand-rolled on `Animated` rather than pulling in a navigation library: the
 * app has a handful of screens and a simple state machine in App.tsx, so a
 * router would add a dependency and a mental model for no gain.
 *
 * Stays mounted while closed so the slide-out animation can play; pointer
 * events are disabled in that state so it never intercepts taps on the game.
 */
export function Drawer({
  open,
  onClose,
  onNavigate,
  activeGameId,
  activeKind,
  signedInAs,
  analyticsConsent,
  onAnalyticsPress,
}: Props) {
  const slide = useRef(new Animated.Value(open ? 0 : -WIDTH)).current;
  const fade = useRef(new Animated.Value(open ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slide, {
        toValue: open ? 0 : -WIDTH,
        duration: DURATION,
        easing: open ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fade, {
        toValue: open ? 1 : 0,
        duration: DURATION,
        useNativeDriver: true,
      }),
    ]).start();
  }, [open, slide, fade]);

  const go = (to: DrawerDestination) => {
    onNavigate(to);
    onClose();
  };

  return (
    <View style={styles.host} pointerEvents={open ? 'auto' : 'none'}>
      {/* Backdrop doubles as the dismiss target — tapping outside a drawer to
          close it is the behaviour people already expect. */}
      <Animated.View style={[styles.backdrop, { opacity: fade }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close menu" />
      </Animated.View>

      <Animated.View style={[styles.panel, { transform: [{ translateX: slide }] }]}>
        <View style={styles.panelHeader}>
          <Text style={styles.brand}>WordCrush</Text>
          {signedInAs ? (
            <Text style={styles.account}>{signedInAs}</Text>
          ) : (
            <Text style={styles.account}>Playing as guest</Text>
          )}
        </View>

        <Item
          label="All games"
          icon="◧"
          active={activeKind === 'hub'}
          onPress={() => go({ kind: 'hub' })}
        />

        <Text style={styles.sectionLabel}>GAMES</Text>
        {GAMES.map((game) => {
          const locked = game.status === 'coming-soon';
          return (
            <Item
              key={game.id}
              label={game.name}
              icon={game.emoji}
              active={activeKind === 'game' && activeGameId === game.id}
              disabled={locked}
              trailing={locked ? 'SOON' : undefined}
              onPress={() => go({ kind: 'game', gameId: game.id })}
            />
          );
        })}

        <Text style={styles.sectionLabel}>YOU</Text>
        <Item
          label="Scores"
          icon="🏆"
          active={activeKind === 'scores'}
          onPress={() => go({ kind: 'scores', gameId: activeGameId ?? GAMES[0].id })}
        />
        <Item
          label={signedInAs ? 'Account' : 'Sign in'}
          icon="👤"
          active={activeKind === 'account'}
          onPress={() => go({ kind: 'account' })}
        />

        <Text style={styles.sectionLabel}>PRIVACY</Text>
        <Item
          label={
            analyticsConsent === 'granted'
              ? 'Anonymous analytics on'
              : analyticsConsent === 'denied'
                ? 'Anonymous analytics off'
                : 'Review analytics choice'
          }
          icon="◉"
          trailing={analyticsConsent === 'granted' ? 'ON' : analyticsConsent === 'denied' ? 'OFF' : undefined}
          onPress={() => {
            onAnalyticsPress();
            onClose();
          }}
        />

        <View style={styles.spacer} />
        <Text style={styles.footer}>Data: Wikipedia pageviews</Text>
      </Animated.View>
    </View>
  );
}

function Item({
  label,
  icon,
  active,
  disabled,
  trailing,
  onPress,
}: {
  label: string;
  icon: string;
  active?: boolean;
  disabled?: boolean;
  trailing?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.item,
        active && styles.itemActive,
        pressed && !disabled && styles.pressed,
      ]}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
    >
      <Text style={styles.itemIcon}>{icon}</Text>
      <Text style={[styles.itemLabel, active && styles.itemLabelActive, disabled && styles.itemDim]}>
        {label}
      </Text>
      {trailing ? <Text style={styles.trailing}>{trailing}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)' },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: WIDTH,
    backgroundColor: theme.bgElevated,
    borderRightWidth: 1,
    borderRightColor: theme.border,
    paddingTop: 44,
    paddingHorizontal: 12,
  },
  panelHeader: { paddingHorizontal: 10, paddingBottom: 18 },
  brand: { color: theme.text, fontSize: 20, fontWeight: '900' },
  account: { color: theme.textDim, fontSize: 11, marginTop: 3 },

  sectionLabel: {
    color: theme.textDim,
    fontSize: 9,
    letterSpacing: 1.5,
    fontWeight: '700',
    paddingHorizontal: 10,
    marginTop: 16,
    marginBottom: 6,
    opacity: 0.7,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: radius.md,
  },
  itemActive: { backgroundColor: theme.card },
  itemIcon: { fontSize: 16, width: 22, textAlign: 'center' },
  itemLabel: { color: theme.textDim, fontSize: 15, fontWeight: '600', flex: 1 },
  itemLabelActive: { color: theme.text, fontWeight: '800' },
  itemDim: { opacity: 0.5 },
  trailing: {
    color: theme.textDim,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  spacer: { flex: 1 },
  footer: { color: theme.textDim, fontSize: 10, opacity: 0.5, padding: 10 },
  pressed: { opacity: 0.7 },
});
