import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import type { AnalyticsConsent } from '../analytics/events';
import { canVibrate } from '../native/haptics';
import type { FeedbackChannel, FeedbackSettings } from '../settings/types';
import { GAMES } from '../games/registry';
import { BrandArtwork, GameArtwork, IconButton } from './components';
import { font, radius, space, theme, type, withAlpha } from './theme';

export type DrawerDestination =
  | { kind: 'hub' }
  | { kind: 'game'; gameId: string }
  | { kind: 'scores'; gameId: string }
  | { kind: 'teams' }
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
  /** Sound/vibration switches — the game's *feel*, not the player's report. */
  feedbackSettings: FeedbackSettings;
  onToggleFeedback: (channel: FeedbackChannel) => void;
  /** False when PostHog is not configured — the entry is hidden rather than dead. */
  canSendFeedback: boolean;
  onSendFeedback: () => void;
};

const WIDTH = 304;
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
  feedbackSettings,
  onToggleFeedback,
  canSendFeedback,
  onSendFeedback,
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
      <Animated.View style={[styles.backdrop, { opacity: fade }]} pointerEvents={open ? 'auto' : 'none'}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close menu" />
      </Animated.View>

      <Animated.View style={[styles.panel, { transform: [{ translateX: slide }] }]} pointerEvents="auto">
        <View style={styles.panelHeader}>
          <View style={styles.brandRow}>
            <BrandArtwork size={46} />
            <View style={styles.brandCopy}>
              <Text style={styles.brand}>WordKrush</Text>
              <Text style={styles.account}>{signedInAs ?? 'Playing as guest'}</Text>
            </View>
            <IconButton
              icon={<Text style={styles.closeMark}>×</Text>}
              accessibilityLabel="Close menu"
              onPress={onClose}
            />
          </View>
        </View>

        <Item
          label="All games"
          icon={<Text style={styles.itemGlyph}>▦</Text>}
          active={activeKind === 'hub'}
          accent={theme.accent}
          onPress={() => go({ kind: 'hub' })}
        />

        <Text style={styles.sectionLabel}>GAMES</Text>
        {GAMES.map((game) => {
          const locked = game.status === 'coming-soon';
          return (
            <Item
              key={game.id}
              label={game.name}
              icon={<GameArtwork gameId={game.id} accent={game.accent} size={34} />}
              active={activeKind === 'game' && activeGameId === game.id}
              disabled={locked}
              accent={game.accent}
              trailing={locked ? 'SOON' : undefined}
              onPress={() => go({ kind: 'game', gameId: game.id })}
            />
          );
        })}

        <Text style={styles.sectionLabel}>YOU</Text>
        <Item
          label="Teams"
          icon={<Text style={styles.itemGlyph}>◎</Text>}
          active={activeKind === 'teams'}
          accent={theme.accentSecondary}
          onPress={() => go({ kind: 'teams' })}
        />
        <Item
          label="Scores"
          icon={<Text style={styles.itemGlyph}>★</Text>}
          active={activeKind === 'scores'}
          accent={theme.warning}
          onPress={() => go({ kind: 'scores', gameId: activeGameId ?? GAMES[0].id })}
        />
        <Item
          label={signedInAs ? 'Account' : 'Sign in'}
          icon={<Text style={styles.itemGlyph}>●</Text>}
          active={activeKind === 'account'}
          accent={theme.accentSecondary}
          onPress={() => go({ kind: 'account' })}
        />

        {canSendFeedback && (
          <>
            <Text style={styles.sectionLabel}>FEEDBACK</Text>
            <Item
              label="Send feedback"
              icon={<Text style={styles.itemGlyph}>✎</Text>}
              accent={theme.accent}
              onPress={() => {
                // Closed first: the prompt is its own modal, and leaving the
                // drawer open behind it means dismissing two things to get
                // back to the game.
                onClose();
                onSendFeedback();
              }}
            />
          </>
        )}

        {/* Named for what they are. The player's own feedback is the section
            above; this is the game's sound and vibration. The label follows the
            same capability check as the row below it, so it never promises a
            vibration switch that is not there. */}
        <Text style={styles.sectionLabel}>
          {canVibrate() ? 'SOUND & VIBRATION' : 'SOUND'}
        </Text>
        {/* Left open rather than closing the drawer: these are switches people
            flip and immediately want to hear, not navigation. */}
        <Item
          label={feedbackSettings.sound ? 'Sound on' : 'Sound off'}
          icon={<Text style={styles.itemGlyph}>{feedbackSettings.sound ? '♪' : '⃠'}</Text>}
          accent={theme.accentSecondary}
          trailing={feedbackSettings.sound ? 'ON' : 'OFF'}
          onPress={() => onToggleFeedback('sound')}
        />
        {/* Shown only where a buzz can actually happen: always on native, and
            on web only for a touch device whose browser has the Vibration API
            (so Safari and laptops still get nothing). A switch that visibly
            does nothing is worse than no switch. */}
        {canVibrate() && (
          <Item
            label={feedbackSettings.vibration ? 'Vibration on' : 'Vibration off'}
            icon={<Text style={styles.itemGlyph}>≈</Text>}
            accent={theme.warning}
            trailing={feedbackSettings.vibration ? 'ON' : 'OFF'}
            onPress={() => onToggleFeedback('vibration')}
          />
        )}

        <Text style={styles.sectionLabel}>PRIVACY</Text>
        <Item
          label={
            analyticsConsent === 'granted'
              ? 'Analytics on'
              : analyticsConsent === 'denied'
                ? 'Analytics off'
                : 'Review analytics choice'
          }
          icon={<Text style={styles.itemGlyph}>◉</Text>}
          accent={theme.success}
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
  accent = theme.accent,
  trailing,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  accent?: string;
  trailing?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.item,
        active && {
          backgroundColor: withAlpha(accent, 0.13),
          borderColor: withAlpha(accent, 0.38),
        },
        pressed && !disabled && styles.pressed,
      ]}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
    >
      <View style={styles.itemIcon}>{icon}</View>
      <Text
        style={[
          styles.itemLabel,
          active && [styles.itemLabelActive, { color: accent }],
          disabled && styles.itemDim,
        ]}
      >
        {label}
      </Text>
      {trailing ? <Text style={styles.trailing}>{trailing}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: theme.overlay },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: WIDTH,
    backgroundColor: theme.bgElevated,
    borderRightWidth: 1,
    borderRightColor: theme.border,
    paddingTop: 32,
    paddingHorizontal: space.md,
  },
  panelHeader: { paddingHorizontal: space.xs, paddingBottom: space.lg },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  brandCopy: { flex: 1 },
  brand: {
    color: theme.text,
    fontFamily: font.bold,
    fontSize: 23,
    fontWeight: '700',
    letterSpacing: -0.55,
  },
  account: { ...type.caption, color: theme.textMuted, fontSize: 11, marginTop: 1 },
  closeMark: { color: theme.textMuted, fontFamily: font.semibold, fontSize: 24, lineHeight: 25 },

  sectionLabel: {
    color: theme.textDim,
    ...type.overline,
    fontSize: 9,
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
    borderWidth: 1,
    borderColor: 'transparent',
  },
  itemIcon: { width: 36, alignItems: 'center', justifyContent: 'center' },
  itemGlyph: { color: theme.textMuted, fontFamily: font.semibold, fontSize: 17, fontWeight: '600' },
  itemLabel: {
    color: theme.textMuted,
    fontFamily: font.medium,
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  itemLabelActive: { fontFamily: font.semibold, fontWeight: '600' },
  itemDim: { opacity: 0.5 },
  trailing: {
    color: theme.textDim,
    fontFamily: font.semibold,
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
  footer: { color: theme.textDim, fontFamily: font.medium, fontSize: 10, opacity: 0.5, padding: 10 },
  pressed: { opacity: 0.7 },
});
