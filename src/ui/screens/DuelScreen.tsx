import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { captureAnalytics } from '../../analytics/client';
import { streakBucket } from '../../analytics/events';
import type { Verdict, DuelPlayer, Progress } from '../../duel/rules';
import { START_PROGRESS } from '../../duel/rules';
import type { DuelState } from '../../duel/controller';
import { useDuel } from '../../duel/useDuel';
import type { Category } from '../../games/more-or-less/types';
import { feedback } from '../../native/feedback';
import { shareResult } from '../../native/share';
import type { RewardEvent } from '../../rewards/types';
import { Button, CountryFlag, CreamBox, CreamText, GameIcon, Panel, PanelText, Rays, StrokeText } from '../components';
import { FLUENT } from '../fluent';
import { RewardCelebration, RewardPanel } from '../rewards/RewardReveal';
import { font, palette, space, tone } from '../theme';
import { useReduceMotion } from '../useReduceMotion';
import { DuelHud } from '../duel/DuelHud';
import { GameScreen } from './GameScreen';

export type DuelFinish = { seed: number; streak: number; verdict: Verdict; ghost: boolean };

type Props = {
  me: DuelPlayer;
  bestStreak: number;
  category: Category;
  /** A friend's room, when the player arrived through their link. */
  invite: string | null;
  onExit: () => void;
  /** Pays out the run; the result shows what it earned. */
  onFinished: (finish: DuelFinish) => Promise<RewardEvent[]>;
};

/** How long the last answer's reveal stays up before the result covers it. */
const LAST_REVEAL_MS = 1_500;

const noop = () => undefined;

/**
 * Higher or Lower, 1v1: find a stranger (or a ghost if nobody is around) or
 * invite a friend, face off, then a minute on the same pairs with both streaks
 * live, and the result. All the match logic is in `src/duel/`; this renders it.
 */
export function DuelScreen({ me, bestStreak, category, invite, onExit, onFinished }: Props) {
  const { state, controller } = useDuel(me, bestStreak);
  const [mine, setMine] = useState<Progress>(START_PROGRESS);
  const [showResult, setShowResult] = useState(false);
  const [events, setEvents] = useState<readonly RewardEvent[]>([]);
  const mineRef = useRef(START_PROGRESS);
  const startedAt = useRef(0);
  const searchedAt = useRef(0);
  const counted = useRef(false);
  const paid = useRef(false);
  // App passes a fresh closure each render; only the latest is ever called.
  const finished = useRef(onFinished);
  finished.current = onFinished;

  const search = useCallback(() => {
    mineRef.current = START_PROGRESS;
    setMine(START_PROGRESS);
    setShowResult(false);
    setEvents([]);
    counted.current = false;
    paid.current = false;
    searchedAt.current = Date.now();
    captureAnalytics('duel_search_started', { mode: 'random' });
    controller.findOpponent();
  }, [controller]);

  useEffect(() => {
    searchedAt.current = Date.now();
    if (invite) {
      captureAnalytics('duel_search_started', { mode: 'joined' });
      controller.joinInvite(invite);
    } else {
      search();
    }
    // Runs once: the screen opens straight into its search.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (state.phase === 'countdown' && !counted.current) {
      counted.current = true;
      const waited = Date.now() - searchedAt.current;
      captureAnalytics('duel_matched', {
        opponent: state.opponent.ghost ? 'ghost' : 'person',
        wait_bucket: waited < 5_000 ? 'under_5s' : waited < 11_000 ? '5_11s' : 'over_11s',
      });
    }
    if (state.phase === 'playing') startedAt.current = state.startedAt;
    if (state.phase !== 'ended' || paid.current) return;
    paid.current = true;
    // The verdict was settled on the streaks both sides reported; the score
    // on the player's board is that same streak, whatever is tapped after.
    feedback(state.verdict === 'won' ? 'win' : 'wrong');
    captureAnalytics('duel_finished', {
      opponent: state.opponent.ghost ? 'ghost' : 'person',
      outcome: state.verdict,
      opponent_left: state.opponentLeft,
      streak_bucket: streakBucket(state.me.streak),
    });
    void finished.current({
      seed: state.seed,
      streak: state.me.streak,
      verdict: state.verdict,
      ghost: state.opponent.ghost === true,
    }).then(setEvents);
  }, [state]);

  const ended = state.phase === 'ended';
  useEffect(() => {
    if (!ended) return;
    const timer = setTimeout(() => setShowResult(true), LAST_REVEAL_MS);
    return () => clearTimeout(timer);
  }, [ended]);

  const inviteFriend = useCallback(() => {
    captureAnalytics('duel_search_started', { mode: 'invite' });
    controller.inviteFriend();
  }, [controller]);

  const exit = useCallback(() => {
    controller.leave();
    onExit();
  }, [controller, onExit]);

  const report = useCallback(
    (next: Progress) => {
      // After the whistle the result stands, whatever the last reveal shows.
      if (!controller.report(next)) return;
      mineRef.current = next;
      setMine(next);
    },
    [controller],
  );

  const onScore = useCallback(
    (streak: number) => {
      if (streak !== mineRef.current.streak) {
        report({ ...mineRef.current, streak, atMs: Date.now() - startedAt.current });
      }
    },
    [report],
  );

  const onDone = useCallback(() => {
    if (!mineRef.current.done) report({ ...mineRef.current, done: true });
  }, [report]);

  if (state.phase === 'playing' || (state.phase === 'ended' && !showResult)) {
    const clockStart = state.phase === 'playing' ? state.startedAt : startedAt.current;
    return (
      <View style={styles.flex}>
        <View style={styles.hud}>
          <DuelHud me={me} opponent={state.opponent} mine={mine} them={state.them} startedAt={clockStart} />
        </View>
        <View style={styles.flex}>
          <GameScreen
            key={state.seed}
            category={category}
            seed={state.seed}
            bestStreak={bestStreak}
            persist={false}
            hideHud
            headerLabel="1V1 · SAME PAIRS"
            waitingCopy={`${state.opponent.name} is still playing…`}
            onScore={onScore}
            onDone={onDone}
            onExit={exit}
            onGameOver={noop}
          />
        </View>
        {state.phase === 'ended' ? (
          // Over the board, so nothing can be tapped between the whistle and the result.
          <View style={styles.whistle} accessibilityLiveRegion="polite">
            <StrokeText size={44} stroke={palette.navyDeep} strokeWidth={3} depth={2.5}>
              {state.opponentLeft ? 'They left!' : 'Finish!'}
            </StrokeText>
          </View>
        ) : null}
      </View>
    );
  }

  if (state.phase === 'countdown') return <FaceOff me={me} state={state} />;

  if (state.phase === 'ended') {
    return <Result me={me} state={state} events={events} onAgain={search} onHome={exit} />;
  }

  return <Lobby state={state} onInvite={inviteFriend} onBack={exit} onRetry={search} />;
}

/** The waiting rooms: searching, a friend link out, joining one, or a failure. */
function Lobby({
  state,
  onInvite,
  onBack,
  onRetry,
}: {
  state: Exclude<DuelState, { phase: 'countdown' | 'playing' | 'ended' }>;
  onInvite: () => void;
  onBack: () => void;
  onRetry: () => void;
}) {
  const [note, setNote] = useState<string | null>(null);
  const link = state.phase === 'inviting' ? `https://wordkrush.com/duel/${state.room}` : null;
  const share = async () => {
    if (!link) return;
    const outcome = await shareResult(`Play me 1v1 on WordKrush. Same pairs, one minute. ${link}`);
    if (outcome === 'copied') setNote('Link copied');
  };
  return (
    <ScrollView contentContainerStyle={styles.lobby}>
      <Panel title="1V1" onClose={onBack} closeLabel="Back">
        {state.phase === 'failed' ? (
          <>
            <PanelText variant="heading">No match</PanelText>
            <PanelText>{state.message}</PanelText>
            <Button title="Find an opponent" tone="green" size="lg" onPress={onRetry} />
          </>
        ) : state.phase === 'inviting' ? (
          <>
            <PanelText variant="heading">Invite a friend</PanelText>
            <PanelText>The match starts as soon as they open your link. Stay on this screen.</PanelText>
            <CreamBox>
              <CreamText style={styles.link} numberOfLines={2}>
                {link}
              </CreamText>
            </CreamBox>
            <Button
              title="Share link"
              tone="green"
              size="lg"
              leading={<GameIcon name="share" size={24} color={tone.green.outline} />}
              onPress={() => void share()}
            />
            {note ? <PanelText>{note}</PanelText> : null}
          </>
        ) : (
          <>
            <Radar />
            <PanelText variant="heading">{state.phase === 'joining' ? 'Joining your friend…' : 'Finding an opponent…'}</PanelText>
            {state.phase === 'searching' ? (
              <>
                <PanelText>Same pairs, one minute, longest streak wins. If nobody is around, a ghost steps in.</PanelText>
                <Button title="Invite a friend instead" tone="blue" size="md" onPress={onInvite} />
              </>
            ) : null}
          </>
        )}
      </Panel>
    </ScrollView>
  );
}

/** Crossed swords, pulsing while the queue is searched. */
function Radar() {
  const reduceMotion = useReduceMotion();
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduceMotion, pulse]);
  return (
    <View style={styles.radar}>
      <Animated.Image
        source={FLUENT.swords}
        style={[styles.swords, { transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] }) }] }]}
      />
    </View>
  );
}

/** The player's card in the face-off and on the result. */
function PlayerCard({ player, label, value }: { player: DuelPlayer; label: string; value?: string }) {
  return (
    <View style={styles.card}>
      {player.ghost ? <Image source={FLUENT.ghost} style={styles.cardGhost} /> : <CountryFlag code={player.country} size={44} />}
      <Text style={styles.cardName} numberOfLines={2}>
        {label}
      </Text>
      {player.ghost ? (
        <View style={styles.ghostTag}>
          <CountryFlag code={player.country} size={12} />
          <Text style={styles.ghostTagText}>GHOST</Text>
        </View>
      ) : null}
      {value ? <Text style={styles.cardValue}>{value}</Text> : null}
    </View>
  );
}

/** You against them, and three seconds to breathe. */
function FaceOff({ me, state }: { me: DuelPlayer; state: Extract<DuelState, { phase: 'countdown' }> }) {
  const [left, setLeft] = useState(3);
  useEffect(() => {
    const id = setInterval(() => setLeft(Math.max(1, Math.ceil((state.until - Date.now()) / 1000))), 100);
    return () => clearInterval(id);
  }, [state.until]);
  return (
    <View style={styles.faceOff}>
      <StrokeText size={22} stroke={palette.navyDeep} strokeWidth={2} depth={1.5}>
        {state.opponent.ghost ? 'Nobody around. Racing a ghost.' : 'Opponent found!'}
      </StrokeText>
      <View style={styles.versus}>
        <PlayerCard player={me} label={me.name} />
        <StrokeText size={30} stroke={tone.red.outline} strokeWidth={2.5} depth={2}>
          VS
        </StrokeText>
        <PlayerCard player={state.opponent} label={state.opponent.name} />
      </View>
      <StrokeText size={96} stroke={palette.navyDeep} strokeWidth={4} depth={3}>
        {left}
      </StrokeText>
    </View>
  );
}

function resultLine(state: Extract<DuelState, { phase: 'ended' }>): string {
  if (state.opponentLeft) return `${state.opponent.name} left the match.`;
  if (state.verdict === 'tied') return 'Neck and neck.';
  if (state.me.streak === state.them.streak) {
    return state.verdict === 'won' ? 'Same streak, but you got there first.' : 'Same streak, but they got there first.';
  }
  return state.verdict === 'won' ? 'Longest streak wins.' : 'They held on longer.';
}

function Result({
  me,
  state,
  events,
  onAgain,
  onHome,
}: {
  me: DuelPlayer;
  state: Extract<DuelState, { phase: 'ended' }>;
  events: readonly RewardEvent[];
  onAgain: () => void;
  onHome: () => void;
}) {
  const won = state.verdict === 'won';
  const title = won ? 'YOU WIN!' : state.verdict === 'tied' ? 'DRAW' : 'YOU LOST';
  return (
    <View style={styles.flex}>
      {won ? (
        <View style={styles.rays} pointerEvents="none">
          <Rays />
        </View>
      ) : null}
      <ScrollView contentContainerStyle={styles.lobby}>
        <Panel
          title={title}
          ribbon={won ? 'tab' : 'banner'}
          accessibilityLabel={title}
          footer={
            <>
              <Button
                title="Play again"
                tone="green"
                size="lg"
                leading={<GameIcon name="retry" size={24} color={tone.green.outline} />}
                onPress={onAgain}
              />
              <Button title="Home" tone="sky" size="sm" onPress={onHome} />
            </>
          }
        >
          <View style={styles.versus}>
            <PlayerCard player={me} label="You" value={String(state.me.streak)} />
            <StrokeText size={22} stroke={tone.red.outline} strokeWidth={2} depth={1.5}>
              VS
            </StrokeText>
            <PlayerCard player={state.opponent} label={state.opponent.name} value={String(state.them.streak)} />
          </View>
          <PanelText>{resultLine(state)}</PanelText>
          {state.opponent.ghost ? <PanelText>That was a ghost, not a person. Try again for a real opponent.</PanelText> : null}
          <RewardPanel events={events} boosted={false} stars={false} />
        </Panel>
      </ScrollView>
      <RewardCelebration events={events} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hud: { paddingHorizontal: space.md, paddingTop: space.xs },
  lobby: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: space.md,
    paddingVertical: space.xl,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  link: { fontFamily: font.heavy, fontSize: 13, textAlign: 'center' },
  radar: { alignItems: 'center', paddingVertical: space.sm },
  swords: { width: 96, height: 96 },
  faceOff: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.xl, paddingHorizontal: space.md },
  versus: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, alignSelf: 'stretch' },
  card: {
    flex: 1,
    minWidth: 0,
    minHeight: 150,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: space.sm,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: palette.white,
    backgroundColor: palette.creamFill,
  },
  cardGhost: { width: 56, height: 56 },
  cardName: { fontFamily: font.black, fontSize: 16, lineHeight: 20, color: palette.ink, textAlign: 'center' },
  cardValue: { fontFamily: font.black, fontSize: 32, lineHeight: 38, color: palette.ink, fontVariant: ['tabular-nums'] },
  ghostTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, borderRadius: 9, backgroundColor: palette.navyDeep },
  ghostTagText: { fontFamily: font.black, fontSize: 10, letterSpacing: 1, color: palette.white },
  rays: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' },
  whistle: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 45, 96, 0.45)',
  },
});
