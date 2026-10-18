import { useEffect, useReducer, useRef, useState } from 'react';
import { Animated, Easing, ImageBackground, StyleSheet, Text, View } from 'react-native';
import { captureAnalytics } from '../../analytics/client';
import { streakBucket } from '../../analytics/events';
import {
  isCorrect,
  newRun,
  reducer,
  type GameState,
  type Guess,
} from '../../games/more-or-less/engine';
import { isGameState, isResumable, matchesDataset } from '../../games/more-or-less/persistence';
import type { RatioBand } from '../../games/more-or-less/pairing';
import type { Category, Item } from '../../games/more-or-less/types';
import { clearProgress, loadProgressEnvelope, saveProgress } from '../../games/progress';
import { secondChance, skipChallenger } from '../../games/more-or-less/boosts';
import { boostPrice } from '../../rewards/wallet';
import type { BoostKind } from '../../rewards/types';
import { BoostBar, coinShortfall } from '../rewards/BoostBar';
import { feedback } from '../../native/feedback';
import { HowToPlay } from '../HowToPlay';
import { Sparkle } from '../Sparkle';
import {
  Button,
  ComboBanner,
  CreamBox,
  CreamText,
  FeedbackBanner,
  GameHeader,
  GameIcon,
  GlossFace,
  Gradient,
  HudPanel,
  PanelText,
  PausePopup,
  PopupModal,
  ScoreBurst,
  StrokeText,
} from '../components';
import { font, formatValue, motion, palette, space, tone } from '../theme';
import { useCountUp } from '../useCountUp';
import { useReduceMotion } from '../useReduceMotion';

type Props = {
  category: Category & { provisional?: boolean };
  seed: number;
  bestStreak: number;
  onExit: () => void;
  onGameOver: (state: GameState, detail: { boosted: boolean }) => void;
  persist?: boolean;
  coins?: number;
  onSpend?: (kind: BoostKind) => boolean;
  band?: RatioBand;
  targetStreak?: number;
  onScore?: (score: number, complete: boolean) => void;
  onDone?: (score: number, complete: boolean) => void;
  labelRound?: {
    seenCount: number;
    total: number;
    preferUnseenIds: readonly string[];
    onSeen: (ids: string[]) => void;
  };
};

export function GameScreen({
  category,
  seed,
  bestStreak,
  onExit,
  onGameOver,
  persist = true,
  coins = 0,
  onSpend,
  band,
  targetStreak,
  onScore,
  onDone,
  labelRound,
}: Props) {
  const poolRef = useRef(category.items);
  const pool: Item[] = poolRef.current;
  const preferRef = useRef(labelRound?.preferUnseenIds);
  preferRef.current = labelRound?.preferUnseenIds;
  const onSeenRef = useRef(labelRound?.onSeen);
  onSeenRef.current = labelRound?.onSeen;
  const accent = palette.green;
  const [paused, setPaused] = useState(false);
  const [help, setHelp] = useState(false);
  const [boosted, setBoosted] = useState(false);
  const boostedRef = useRef(false);
  boostedRef.current = boosted;
  const chanceUsed = useRef(false);
  const [chance, setChance] = useState<'idle' | 'offer' | 'done'>('idle');
  const [state, dispatch] = useReducer(
    (s: GameState, a: Parameters<typeof reducer>[1]) =>
      reducer(s, a, pool, preferRef.current),
    undefined,
    () => newRun(pool, seed, bestStreak, band, preferRef.current),
  );

  // A run is keyed by category, not by seed: resuming has to work when the
  // screen remounts with a brand new seed.
  const restored = useRef(false);

  useEffect(() => {
    if (!persist) {
      restored.current = true;
      captureAnalytics('run_started', {
        game_id: 'more-or-less',
        is_resume: false,
        category_id: category.id,
      });
      return;
    }
    let cancelled = false;
    void loadProgressEnvelope('more-or-less', category.id, isGameState).then((saved) => {
      if (cancelled) return;
      const state = saved?.state;
      const canResume = Boolean(state && isResumable(state) && matchesDataset(state, pool));
      if (state && canResume) {
        if (saved?.meta?.boosted) setBoosted(true);
        dispatch({ type: 'restore', state });
      } else if (state) {
        // Stale or unresumable — drop it rather than leaving it to be retried.
        void clearProgress('more-or-less');
      }
      restored.current = true;
      captureAnalytics('run_started', {
        game_id: 'more-or-less',
        is_resume: canResume,
        category_id: category.id,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [category.id, persist]);

  useEffect(() => {
    if (!persist || !restored.current) return;
    if (state.status === 'over') void clearProgress('more-or-less');
    else void saveProgress('more-or-less', category.id, state, { boosted });
  }, [state, category.id, persist, boosted]);

  useEffect(() => {
    onScore?.(state.streak, targetStreak != null ? state.streak >= targetStreak : false);
  }, [state.streak, targetStreak, onScore]);

  useEffect(() => {
    const hitTarget = targetStreak != null && state.streak >= targetStreak;
    const shouldSignalDone = state.status === 'over' || (state.status === 'revealed' && hitTarget);
    if (shouldSignalDone) {
      onDone?.(state.streak, hitTarget);
    }
  }, [state.status, state.streak, targetStreak, onDone]);

  useEffect(() => {
    onSeenRef.current?.([state.left.id, state.right.id]);
  }, [state.left.id, state.right.id]);

  const revealed = state.status !== 'playing';
  const counted = useCountUp(state.right.value, motion.countMs, revealed);
  // Sparkle only on a correct answer. Firing a celebratory burst over the
  // number that just ended the run would read as mocking the player.
  const sparkling = counted.done && state.lastGuessCorrect === true;

  // Sound + haptics on judgement, paired in native/feedback.ts. Haptics are a
  // no-op on web via the .native twin; the clip still plays there.
  useEffect(() => {
    if (state.lastGuessCorrect === true) feedback('correct');
    if (state.lastGuessCorrect === false) feedback('wrong');
  }, [state.lastGuessCorrect, state.right.id]);

  // Hold the reveal briefly, then either advance or end the run.
  useEffect(() => {
    if (state.status === 'revealed') {
      // In team races with a target, hitting the target completes the game
      const hitTarget = targetStreak != null && state.streak >= targetStreak;
      if (hitTarget) {
        if (!persist) return; // Live runs stay here and wait for teammates; LivePlayShell manages the transition
        const t = setTimeout(
          () => onGameOver(state, { boosted: boostedRef.current }),
          1600,
        );
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => dispatch({ type: 'next' }), 1250);
      return () => clearTimeout(t);
    }
    if (state.status === 'over') {
      if (!persist) return; // Live runs stay here and wait for teammates
      if (!chanceUsed.current && chance !== 'done') {
        if (chance !== 'offer') setChance('offer');
        const offer = setTimeout(() => setChance('done'), 5000);
        return () => clearTimeout(offer);
      }
      const t = setTimeout(() => onGameOver(state, { boosted: boostedRef.current }), 1600);
      return () => clearTimeout(t);
    }
  }, [state.status, state.right.id, state.streak, targetStreak, onGameOver, persist, chance, state]);

  const correct = state.lastGuessCorrect;

  const submitGuess = (choice: Guess) => {
    // A double tap can arrive in the same frame before React replaces the
    // controls. Ignore it here as well as visually removing the buttons.
    if (state.status !== 'playing') return;
    const guessedCorrectly = isCorrect(state.left, state.right, choice);
    captureAnalytics('guess_submitted', {
      game_id: 'more-or-less',
      guess_index: state.streak + 1,
      choice,
      result_kind: guessedCorrectly ? 'correct' : 'incorrect',
    });
    captureAnalytics('round_resolved', {
      game_id: 'more-or-less',
      correct: guessedCorrectly,
      round_index: state.streak + 1,
      streak_bucket: streakBucket(guessedCorrectly ? state.streak + 1 : state.streak),
    });
    dispatch({ type: 'guess', choice });
  };

  const spendBoost = (kind: BoostKind): boolean => {
    if (!persist || !onSpend?.(kind)) return false;
    boostedRef.current = true;
    setBoosted(true);
    return true;
  };

  const skipPrice = boostPrice('skip-pair');
  const chancePrice = boostPrice('second-chance');
  const showBoosts = persist && onSpend !== undefined && state.status === 'playing';

  // Juice, Block King style: a gold "+1" from the card on a right call, a
  // banner on a milestone streak, a red flash and a shake on a miss.
  const reduceMotion = useReduceMotion();
  const [burstKey, setBurstKey] = useState(0);
  const [combo, setCombo] = useState<string | null>(null);
  const shake = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (state.lastGuessCorrect === true) {
      setBurstKey((key) => key + 1);
      const word = COMBO_WORDS[state.streak];
      if (word) setCombo(word);
    }
    if (state.lastGuessCorrect === false) {
      flash.setValue(0);
      Animated.sequence([
        Animated.timing(flash, { toValue: 1, duration: 110, useNativeDriver: true }),
        Animated.timing(flash, { toValue: 0, duration: 520, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]).start();
      if (!reduceMotion) {
        shake.setValue(0);
        Animated.sequence(
          [-9, 9, -6, 6, -3, 0].map((toValue) =>
            Animated.timing(shake, { toValue, duration: motion.shakeMs / 6, useNativeDriver: true }),
          ),
        ).start();
      }
    }
    // Same trigger as the judgement sound above: once per answer.
  }, [state.lastGuessCorrect, state.right.id]);

  const raceGoal = targetStreak != null;
  const offerOpen = state.status === 'over' && chance === 'offer' && persist;

  return (
    <View style={styles.root}>
      <GameHeader title="More or Less" subtitle={category.name} onExit={onExit} onHelp={() => setHelp(true)} />

      <View style={styles.hud}>
        <HudPanel label="Streak" value={state.streak} />
        <HudPanel label="Best" value={state.bestStreak} />
        {raceGoal ? (
          <HudPanel label="Goal" value={targetStreak} />
        ) : labelRound ? (
          <HudPanel label="Seen" value={`${labelRound.seenCount}/${labelRound.total}`} />
        ) : null}
      </View>

      <Animated.View style={[styles.board, { transform: [{ translateX: shake }] }]}>
        <Card item={state.left} metricLabel={category.metricLabel} value={state.left.value} footRoom />
        <Card
          item={state.right}
          metricLabel={category.metricLabel}
          value={revealed ? counted.value : null}
          highlight={correct === null ? undefined : correct}
          sparkling={sparkling}
          onImageError={() =>
            captureAnalytics('card_image_load_failed', {
              game_id: 'more-or-less',
              has_image_url: true,
            })
          }
        />
        {/* Floating disc rather than its own row — every pixel it doesn't
            take is a pixel the images get. */}
        <View style={styles.vs} pointerEvents="none" accessibilityRole="text" accessibilityLabel="versus">
          <GlossFace tone={tone.red} lip={3} radius={24} faceStyle={styles.vsFace}>
            <StrokeText size={17} stroke={tone.red.outline} strokeWidth={1.8} depth={1}>
              VS
            </StrokeText>
          </GlossFace>
        </View>
        <Animated.View pointerEvents="none" style={[styles.flash, { opacity: flash }]} />
        {burstKey > 0 ? <ScoreBurst key={burstKey} text="+1" style={styles.burst} /> : null}
        {combo ? <ComboBanner key={combo} text={combo} onDone={() => setCombo(null)} /> : null}
      </Animated.View>

      {state.status === 'playing' ? (
        <View style={styles.actions}>
          <StrokeText size={15} stroke={palette.navyDeep} strokeWidth={1.5} depth={0} lineHeight={20} numberOfLines={2}>
            {`Does ${state.right.label} have more or less than ${state.left.label}?`}
          </StrokeText>
          <View style={styles.choices}>
            <Button
              title="More"
              size="lg"
              tone="green"
              onPress={() => submitGuess('more')}
              accessibilityHint={`${state.right.label} has more ${category.metricLabel}`}
              leading={<GameIcon name="arrowUp" size={26} color={tone.green.outline} />}
              style={styles.choice}
            />
            <Button
              title="Less"
              size="lg"
              tone="red"
              onPress={() => submitGuess('less')}
              accessibilityHint={`${state.right.label} has fewer ${category.metricLabel}`}
              leading={<GameIcon name="arrowDown" size={26} color={tone.red.outline} />}
              style={styles.choice}
            />
          </View>
        </View>
      ) : (
        <View style={styles.actions}>
          <FeedbackBanner
            tone={correct ? 'success' : 'danger'}
            title={
              correct
                ? targetStreak != null && state.streak >= targetStreak
                  ? 'Target reached!'
                  : 'Nice call!'
                : 'Not this time'
            }
            body={
              correct
                ? targetStreak != null && state.streak >= targetStreak
                  ? 'Race complete. Waiting for teammates…'
                  : 'Streak saved. Next matchup incoming…'
                : !persist
                  ? 'Race complete. Waiting for teammates…'
                  : 'The final values are revealed above.'
            }
          />
        </View>
      )}

      <BoostBar
        onPause={() => setPaused(true)}
        controls={
          showBoosts
            ? [
                {
                  kind: 'skip-pair',
                  label: 'Skip pair',
                  icon: 'skip',
                  price: skipPrice,
                  disabled: coins < skipPrice,
                  disabledReason: coinShortfall(coins, skipPrice),
                  onPress: () => {
                    if (!spendBoost('skip-pair')) return;
                    dispatch({
                      type: 'restore',
                      state: skipChallenger(state, pool, preferRef.current),
                    });
                  },
                },
              ]
            : []
        }
      />

      {/* Provenance: the claim on screen must match what the data supports.
          Image credits are not decoration — CC BY / CC BY-SA require them. */}
      <View>
        <Text style={styles.provenance}>
          {category.metricLabel} ·{' '}
          {state.left.source?.startsWith('wikipedia') ? 'Wikipedia' : state.left.source} ·{' '}
          {state.left.updatedAt}
          {category.provisional ? ' · provisional' : ''}
        </Text>
        <Text style={styles.provenance} numberOfLines={2}>
          {imageCredits([state.left, state.right])}
        </Text>
      </View>

      {/* The kit's "More Lives?" pop-up: the run is over unless the player
          pays to keep the streak. Same 5 s window and coin check as before. */}
      <PopupModal
        visible={offerOpen}
        onClose={() => setChance('done')}
        dismissable={false}
        hideClose
        title="Keep your streak?"
        ribbon="banner"
        width={340}
      >
        <CreamBox style={styles.offerBox}>
          <GameIcon name="heart" size={64} />
          <View style={styles.flex}>
            <CreamText variant="label">YOUR STREAK</CreamText>
            <CreamText variant="title">{`${state.streak} in a row`}</CreamText>
          </View>
        </CreamBox>
        <Button
          title={`Second chance · ${chancePrice}`}
          tone="green"
          size="md"
          disabled={coins < chancePrice}
          leading={<GameIcon name="coin" size={26} />}
          onPress={() => {
            if (!spendBoost('second-chance')) return;
            chanceUsed.current = true;
            setChance('done');
            dispatch({
              type: 'restore',
              state: secondChance(state, pool, preferRef.current),
            });
          }}
        />
        {coins < chancePrice ? <PanelText>{coinShortfall(coins, chancePrice) ?? ''}</PanelText> : null}
        <Button title="No thanks" tone="blue" size="md" onPress={() => setChance('done')} />
      </PopupModal>

      <PausePopup
        visible={paused}
        onResume={() => setPaused(false)}
        onHelp={() => {
          setPaused(false);
          setHelp(true);
        }}
        onLeave={() => {
          setPaused(false);
          onExit();
        }}
        note={persist ? 'Your run is saved.' : undefined}
      />

      <HowToPlay
        visible={help}
        onClose={() => setHelp(false)}
        title="How to play More or Less"
        accent={accent}
        intro="Two things, one revealed number. Guess whether the hidden one is bigger or smaller."
        steps={[
          {
            n: 1,
            title: 'Read the left card',
            body: 'It shows its real monthly Wikipedia pageviews.',
          },
          {
            n: 2,
            title: 'Judge the right card',
            body: 'Tap MORE if you think it gets more views than the left one, LESS if fewer.',
          },
          {
            n: 3,
            title: 'Keep the streak alive',
            body: 'Get it right and the winner slides left to face a new challenger. One wrong answer ends the run.',
          },
          {
            n: 4,
            title: 'Clear the set',
            body: 'See every name in this set to unlock the next. The names will not change until you do.',
          },
        ]}
      />
    </View>
  );
}

/** Credit line for whichever images are on screen. Required by CC BY / CC BY-SA. */
export function imageCredits(items: Item[]): string {
  const credits = items
    .filter((i) => i.imageUrl && i.imageAttribution)
    .map((i) => `${i.label}: ${i.imageAttribution} (${i.imageLicense})`);
  return credits.length ? `Images — ${credits.join(' · ')}` : '';
}

/** Streak milestones that earn the kit's big celebration word. */
const COMBO_WORDS: Readonly<Record<number, string>> = { 5: 'GREAT!', 10: 'AMAZING!', 20: 'UNSTOPPABLE!' };

/**
 * One contender, framed like a tile on the kit's board: the photo inside a
 * white rim, the name and number in white outlined type on a dark foot band.
 * The rim turns green or red once the hidden number is revealed.
 */
function Card({
  item,
  metricLabel,
  value,
  highlight,
  sparkling = false,
  footRoom = false,
  onImageError,
}: {
  item: Item;
  metricLabel: string;
  value: number | null;
  highlight?: boolean;
  sparkling?: boolean;
  /** Keep the copy clear of the VS disc that sits on this card's foot. */
  footRoom?: boolean;
  onImageError?: () => void;
}) {
  const rim = highlight === undefined ? palette.white : highlight ? tone.green.bottom : palette.red;

  // Images are a bonus, never a requirement: a remote fetch can fail offline,
  // and a rare item may still lack a freely-licensed file. Either way the
  // card keeps the same shape and the game plays exactly the same.
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(item.imageUrl) && !imageFailed;

  const content = (
    <View style={[styles.cardBody, footRoom && styles.footRoom]}>
      <StrokeText size={22} stroke={palette.ink} strokeWidth={2} depth={1.5} numberOfLines={2} lineHeight={27}>
        {item.label}
      </StrokeText>
      {value === null ? (
        <StrokeText size={32} stroke={palette.ink} strokeWidth={2.2} depth={2} letterSpacing={6}>
          ? ? ?
        </StrokeText>
      ) : (
        <>
          {/* Wrapper is the anchor the burst radiates from, so particles
              originate at the number rather than the card centre. */}
          <View style={styles.valueWrap}>
            <StrokeText
              size={32}
              color="#FFE45C"
              stroke={palette.goldEdge}
              strokeWidth={2.4}
              depth={2}
              textStyle={styles.tabular}
            >
              {formatValue(value)}
            </StrokeText>
            <Sparkle active={sparkling} />
          </View>
          <Text style={styles.metric}>{metricLabel}</Text>
        </>
      )}
    </View>
  );

  return (
    <View style={[styles.card, { borderColor: rim }]} accessibilityLabel={item.label}>
      {showImage ? (
        <ImageBackground
          source={{ uri: item.imageUrl }}
          style={styles.cardFill}
          imageStyle={styles.cardImage}
          resizeMode="cover"
          onError={() => {
            setImageFailed(true);
            onImageError?.();
          }}
        >
          {/* Photos vary wildly in brightness; a dark foot band keeps the
              outlined name and number legible without hiding the picture. */}
          <View style={styles.scrim} pointerEvents="none">
            <Gradient colors={['rgba(8,24,56,0)', 'rgba(8,24,56,0.55)', 'rgba(8,24,56,0.88)']} locations={[0, 0.45, 1]} />
          </View>
          {content}
        </ImageBackground>
      ) : (
        <View style={[styles.cardFill, styles.cardPlain]}>{content}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: space.md,
    paddingTop: space.xs,
    paddingBottom: space.xs,
    gap: space.sm,
  },
  hud: { flexDirection: 'row', gap: space.sm },
  board: {
    flex: 1,
    minHeight: 0,
    gap: 6,
    padding: 6,
    borderRadius: 22,
    backgroundColor: palette.frame,
    borderWidth: 3,
    borderColor: palette.frameDeep,
    borderTopColor: '#7FE0F6',
  },
  card: {
    flex: 1,
    minHeight: 120,
    borderRadius: 16,
    borderWidth: 4,
    overflow: 'hidden',
    backgroundColor: palette.navyDeep,
  },
  cardFill: { flex: 1, justifyContent: 'flex-end' },
  cardImage: { borderRadius: 12 },
  cardPlain: { justifyContent: 'center', backgroundColor: palette.well },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '72%' },
  cardBody: { paddingHorizontal: space.md, paddingVertical: space.sm, alignItems: 'center', gap: 2 },
  footRoom: { paddingBottom: 28 },
  valueWrap: { alignItems: 'center', justifyContent: 'center' },
  tabular: { fontVariant: ['tabular-nums'] },
  metric: {
    fontFamily: font.heavy,
    fontSize: 12,
    lineHeight: 15,
    color: palette.white,
    textAlign: 'center',
    textShadowColor: palette.navyDeep,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  vs: { position: 'absolute', top: '50%', alignSelf: 'center', marginTop: -26, zIndex: 3 },
  vsFace: { width: 48, height: 48 },
  flash: { ...StyleSheet.absoluteFill, borderRadius: 19, backgroundColor: 'rgba(239,62,79,0.42)' },
  burst: { position: 'absolute', top: '70%', left: '50%' },
  // Fixed, so the board does not jump between the question and the reveal.
  actions: { gap: space.sm, height: 124, justifyContent: 'flex-end' },
  choices: { flexDirection: 'row', gap: space.sm },
  choice: { flex: 1 },
  offerBox: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  flex: { flex: 1 },
  // Required credits, set quietly: small navy on the pale foot of the sky.
  provenance: {
    fontFamily: font.body,
    fontSize: 11,
    lineHeight: 14,
    color: palette.navyDeep,
    textAlign: 'center',
    opacity: 0.8,
  },
});
