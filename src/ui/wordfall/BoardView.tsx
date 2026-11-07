import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Platform, StyleSheet, Text, View } from 'react-native';
import { colOf, rowOf } from '../../games/wordfall/board';
import type { Board, PlayResult, SpecialKind } from '../../games/wordfall/types';
import { BlockTile, ScoreBurst, StrokeText } from '../components';
import { cube, palette, withAlpha } from '../theme';
import { useReduceMotion } from '../useReduceMotion';
import { WORDFALL_BOARD_WEB_ID } from '../webViewport';
import {
  CLEAR_HOLD_MS,
  PUFF_MS,
  chainStamp,
  ghostsFromCleared,
  playJuiceKey,
  type ClearGhost,
} from './clearJuice';
import { SPECIAL_VISUALS } from './visuals';

const GAP = 5;
/** The kit's cyan board frame: border plus padding round the tiles. */
const FRAME_INSET = 9;

type Props = {
  board: Board;
  selection: number[];
  /** Called as the finger enters a tile. The engine decides what it means. */
  onTrace: (index: number) => void;
  /** Finger lifted — play the traced word. */
  onRelease: () => void;
  /** Gesture interrupted; drop the trace without spending a move. */
  onCancel: () => void;
  /** Space offered by the parent after HUD and controls take their share. */
  maxWidth: number;
  maxHeight: number;
  disabled?: boolean;
  lastPlay: PlayResult | null;
  /** Tile indexes to glow. The coach and the word hint. Does not take touches. */
  hintPath?: readonly number[];
  /** The traced letters already spell a playable word: the trace lights up. */
  traceValid?: boolean;
};

export function BoardView({
  board,
  selection,
  onTrace,
  onRelease,
  onCancel,
  maxWidth,
  maxHeight,
  disabled = false,
  lastPlay,
  hintPath,
  traceValid = false,
}: Props) {
  const containerRef = useRef<View>(null);
  /**
   * The board's position in the window.
   *
   * Touch events are resolved against page coordinates rather than the
   * `locationX` on the event: during a drag that value is reported relative to
   * whichever view the touch started in, which silently offsets every tile
   * lookup once the finger crosses a child boundary.
   */
  const origin = useRef({ x: 0, y: 0 });
  const previousTiles = useRef(board.tiles);
  const seenJuice = useRef('');
  const [ghosts, setGhosts] = useState<ClearGhost[]>([]);
  const [bornId, setBornId] = useState<number | null>(null);
  const juiceKey = lastPlay && lastPlay.cleared.length > 0 ? playJuiceKey(lastPlay) : '';
  const dropHoldMs = juiceKey ? CLEAR_HOLD_MS : 0;
  const stamp = lastPlay ? chainStamp(lastPlay.chain) : null;

  useLayoutEffect(() => {
    if (juiceKey !== seenJuice.current) {
      if (juiceKey && lastPlay) {
        setGhosts(ghostsFromCleared(previousTiles.current, lastPlay.cleared));
        setBornId(
          lastPlay.created
            ? (previousTiles.current[lastPlay.created.index]?.id ?? null)
            : null,
        );
      } else {
        setBornId(null);
      }
      seenJuice.current = juiceKey;
    }
    previousTiles.current = board.tiles;
  }, [juiceKey, board.tiles, lastPlay?.cleared, lastPlay?.created?.index]);

  useEffect(() => {
    if (ghosts.length === 0) return;
    const handle = setTimeout(() => setGhosts([]), PUFF_MS + 40);
    return () => clearTimeout(handle);
  }, [ghosts]);

  useEffect(() => {
    if (bornId === null) return;
    const handle = setTimeout(() => setBornId(null), 480);
    return () => clearTimeout(handle);
  }, [bornId, juiceKey]);

  const horizontalGaps = GAP * (board.width - 1);
  const verticalGaps = GAP * (board.height - 1);
  const tileFromWidth = (maxWidth - FRAME_INSET * 2 - horizontalGaps) / board.width;
  const tileFromHeight = (maxHeight - FRAME_INSET * 2 - verticalGaps) / board.height;
  const tileSize = Math.max(0, Math.min(tileFromWidth, tileFromHeight));
  const width = tileSize > 0 ? tileSize * board.width + horizontalGaps : 0;
  const height = tileSize > 0 ? tileSize * board.height + verticalGaps : 0;

  // PanResponder is created once, but its handlers must see the CURRENT props.
  // Without this indirection the responder closes over the first render's
  // callbacks and the board stops responding after the first word.
  const live = useRef({ onTrace, onRelease, onCancel, tileSize, board, disabled, selection });
  live.current = { onTrace, onRelease, onCancel, tileSize, board, disabled, selection };

  const responder = useMemo(
    () =>
      PanResponder.create({
        // Capture at the board boundary. On web this keeps an initial pointer
        // on a tile from being claimed by a descendant before tracing starts.
        // The board's scoped web CSS disables the browser's selection/scroll
        // defaults that PanResponder itself cannot cancel.
        onStartShouldSetPanResponderCapture: () => !live.current.disabled,
        onMoveShouldSetPanResponderCapture: () => !live.current.disabled,
        onStartShouldSetPanResponder: () => !live.current.disabled,
        onMoveShouldSetPanResponder: () => !live.current.disabled,
        onPanResponderGrant: (e) => {
          const hit = hitTest(e.nativeEvent.pageX, e.nativeEvent.pageY);
          if (hit !== null) live.current.onTrace(hit);
        },
        onPanResponderMove: (e) => {
          const hit = hitTest(e.nativeEvent.pageX, e.nativeEvent.pageY);
          if (hit !== null) live.current.onTrace(hit);
        },
        onPanResponderRelease: (e) => {
          const hit = hitTest(e.nativeEvent.pageX, e.nativeEvent.pageY);
          if (hit !== null) live.current.onTrace(hit);
          live.current.onRelease();
        },
        // A terminated gesture (a system alert, a scroll taking over) is not a
        // submission — dropping the trace is the safe reading.
        onPanResponderTerminate: () => live.current.onCancel(),
      }),
    [],
  );

  /**
   * Which tile a page coordinate is on.
   *
   * Cells are resolved by their nearest centre, so the narrow visual gap belongs
   * to the tile beside it. Browser pointer automation and a fast finger can
   * otherwise land a few pixels over a tile boundary and silently lose the
   * first or final letter. The circular limit still rejects diagonal corners.
   */
  function hitTest(pageX: number, pageY: number): number | null {
    const { tileSize: size, board: b } = live.current;
    if (size <= 0) return null;
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const x = pageX - window.scrollX;
      const y = pageY - window.scrollY;
      const boardElement = document.getElementById(WORDFALL_BOARD_WEB_ID);
      const tiles = boardElement?.querySelectorAll<HTMLElement>('[aria-label]') ?? [];
      let closest: { index: number; distance: number; radius: number } | null = null;
      for (let index = 0; index < b.tiles.length; index++) {
        const tile = tiles[index];
        if (!tile) continue;
        const rect = tile.getBoundingClientRect();
        const distance = Math.hypot(x - (rect.left + rect.width / 2), y - (rect.top + rect.height / 2));
        const candidate = { index, distance, radius: Math.max(rect.width, rect.height) * 0.58 };
        if (!closest || candidate.distance < closest.distance) closest = candidate;
      }
      return closest && closest.distance <= closest.radius ? closest.index : null;
    }
    const x = pageX - origin.current.x;
    const y = pageY - origin.current.y;
    const pitch = size + GAP;
    const col = Math.round((x - size / 2) / pitch);
    const row = Math.round((y - size / 2) / pitch);
    if (col < 0 || col >= b.width || row < 0 || row >= b.height) return null;

    const cx = col * pitch + size / 2;
    const cy = row * pitch + size / 2;
    const distance = Math.hypot(x - cx, y - cy);
    return distance <= pitch / 2 ? row * b.width + col : null;
  }

  const measure = () => {
    containerRef.current?.measureInWindow((x, y) => {
      origin.current = { x, y };
    });
  };

  const selectedAt = new Map(selection.map((index, order) => [index, order]));
  const lit = traceValid && selection.length > 0;
  const litPulse = useLitPulse(lit);
  const burst = juiceKey && lastPlay ? burstPoint(board, lastPlay.cleared, tileSize) : null;

  return (
    // The frame is a separate view outside the measured board, so hit-testing
    // still reads tile positions straight off the board's own origin.
    <View style={styles.frame} onLayout={() => measure()}>
    <View
      ref={containerRef}
      nativeID={WORDFALL_BOARD_WEB_ID}
      style={[styles.board, width > 0 && { width, height }]}
      onLayout={() => {
        measure();
      }}
      {...responder.panHandlers}
    >
      {tileSize > 0 && (
        <>
          {/* The trace line sits under the tiles so it reads as a thread run
              behind them rather than a stripe painted on top. */}
          <TracePath
            board={board}
            selection={selection}
            tileSize={tileSize}
            lit={lit}
          />
          {board.tiles.map((tile, index) => (
            <TileView
              // Keyed by tile identity, not position, so a tile that falls is
              // the same component moving rather than a new one appearing —
              // which is what makes the drop animation possible at all.
              key={tile.id}
              letter={tile.letter}
              special={tile.special}
              crate={tile.crate}
              size={tileSize}
              left={colOf(board, index) * (tileSize + GAP)}
              top={rowOf(board, index) * (tileSize + GAP)}
              order={selectedAt.get(index)}
              lit={lit && selectedAt.has(index)}
              litPulse={litPulse}
              hinted={hintPath?.includes(index) === true}
              dropHoldMs={dropHoldMs}
              justBorn={bornId === tile.id}
              juiceKey={juiceKey}
            />
          ))}
          {ghosts.map((ghost) => (
            <PuffGhost
              key={ghost.key}
              ghost={ghost}
              size={tileSize}
              left={colOf(board, ghost.index) * (tileSize + GAP)}
              top={rowOf(board, ghost.index) * (tileSize + GAP)}
            />
          ))}
          {stamp && juiceKey ? <ChainStamp key={juiceKey} label={stamp} /> : null}
          {/* After the tiles on purpose: web hit-testing reads tiles by their
              order among labelled elements, and the burst's text is labelled. */}
          {burst && lastPlay ? (
            <ScoreBurst
              key={`burst-${juiceKey}`}
              text={`+${lastPlay.points.toLocaleString('en-US')}`}
              big={lastPlay.points >= 200 || lastPlay.chain >= 2}
              style={{ position: 'absolute', left: burst.x, top: burst.y }}
            />
          ) : null}
        </>
      )}
    </View>
    </View>
  );
}

/** The line joining traced tiles, drawn as one rotated bar per step. */
function TracePath({
  board,
  selection,
  tileSize,
  lit,
}: {
  board: Board;
  selection: number[];
  tileSize: number;
  /** A playable word: the thread turns gold and glows. */
  lit: boolean;
}) {
  if (selection.length < 2) return null;
  const pitch = tileSize + GAP;
  const centre = (index: number) => ({
    x: colOf(board, index) * pitch + tileSize / 2,
    y: rowOf(board, index) * pitch + tileSize / 2,
  });

  return (
    <>
      {selection.slice(1).map((index, i) => {
        const from = centre(selection[i]);
        const to = centre(index);
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const length = Math.hypot(dx, dy);
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        const thickness = Math.max(6, tileSize * (lit ? 0.24 : 0.18));
        return (
          <View
            key={`${selection[i]}-${index}`}
            pointerEvents="none"
            style={[{
              position: 'absolute',
              // Laid out centred on the midpoint of the two tiles and rotated
              // about its own centre — the default origin. Anchoring at the
              // start point instead would need `transformOrigin`, and a
              // platform that ignores that property puts every segment in the
              // wrong place with no error to show for it.
              left: (from.x + to.x) / 2 - length / 2,
              top: (from.y + to.y) / 2 - thickness / 2,
              width: length,
              height: thickness,
              backgroundColor: lit ? palette.gold : palette.white,
              borderWidth: lit ? 2 : 0,
              borderColor: palette.white,
              opacity: lit ? 1 : 0.85,
              borderRadius: thickness / 2,
              transform: [{ rotate: `${angle}deg` }],
            }, lit && styles.threadGlow]}
          />
        );
      })}
    </>
  );
}

/**
 * Memoised because a timed level re-renders the board several times a second
 * to move the clock, and none of that has anything to do with the tiles. Every
 * prop here is a primitive, so the default shallow comparison is exact — 56
 * tiles skip re-rendering unless something about them actually changed.
 */
const TileView = memo(function TileView({
  letter,
  special,
  crate,
  size,
  left,
  top,
  order,
  lit,
  litPulse,
  hinted = false,
  dropHoldMs,
  justBorn,
  juiceKey,
}: {
  letter: string;
  special: SpecialKind | null;
  crate: boolean;
  size: number;
  left: number;
  top: number;
  /** Position in the current trace, or undefined if not selected. */
  order: number | undefined;
  /** Part of a trace that already spells a word. */
  lit: boolean;
  /** Shared 0–1 pulse that every lit tile's halo breathes with. */
  litPulse: Animated.Value;
  /** Coach or word-hint glow. Visual only. */
  hinted?: boolean;
  dropHoldMs: number;
  justBorn: boolean;
  juiceKey: string;
}) {
  const selected = order !== undefined;
  const drop = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const previousTop = useRef<number | null>(null);
  // Read at drop time so a later lastPlay=null (new trace) cannot cancel the
  // in-flight hold and leave tiles stuck at their translateY offset.
  const dropHoldRef = useRef(dropHoldMs);
  dropHoldRef.current = dropHoldMs;

  // Falling. A tile that moves up the screen is impossible in this game, so
  // any change in `top` is a drop: start it at its old position and spring it
  // down to the new one.
  useEffect(() => {
    const from = previousTop.current;
    previousTop.current = top;
    if (from === null) {
      // First appearance — fall in from above the board rather than blinking on.
      drop.setValue(-(top + size * 2));
    } else if (from !== top) {
      drop.setValue(from - top);
    } else {
      return;
    }
    const spring = () => {
      Animated.spring(drop, {
        toValue: 0,
        damping: 14,
        stiffness: 190,
        mass: 0.8,
        useNativeDriver: true,
      }).start();
    };
    const hold = dropHoldRef.current;
    if (hold > 0) {
      const handle = setTimeout(spring, hold);
      return () => clearTimeout(handle);
    }
    spring();
  }, [top, size, drop]);

  useEffect(() => {
    if (justBorn) return;
    // Touching a tile pops it, then it settles a hair proud of the board.
    // The settle stays small: anything bigger pushes edge tiles past the frame.
    const settle = Animated.spring(scale, {
      toValue: selected ? 1.05 : 1,
      damping: 16,
      stiffness: 320,
      mass: 0.6,
      useNativeDriver: true,
    });
    if (!selected) {
      settle.start();
      return;
    }
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.16, duration: 80, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      settle,
    ]).start();
  }, [selected, scale, justBorn]);

  useEffect(() => {
    if (!justBorn) return;
    Animated.sequence([
      Animated.spring(scale, {
        toValue: 1.28,
        damping: 16,
        stiffness: 320,
        mass: 0.6,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        damping: 16,
        stiffness: 320,
        mass: 0.6,
        useNativeDriver: true,
      }),
    ]).start();
  }, [justBorn, juiceKey, scale]);

  const visual = special ? SPECIAL_VISUALS[special] : null;

  return (
    <Animated.View
      // Touches are handled by the board as a whole; a tile that captured them
      // would break the drag the moment the finger crossed onto it.
      pointerEvents="none"
      style={[
        styles.tile,
        { width: size, height: size, left, top, transform: [{ translateY: drop }, { scale }] },
      ]}
      accessibilityLabel={crate ? 'Blocked crate' : special ? `${letter}, ${special} tile` : letter}
    >
      {lit ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.litHalo,
            { borderRadius: size * 0.3, opacity: litPulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }) },
          ]}
        />
      ) : null}
      {crate ? (
        <BlockTile size={size} color="stone" stud={false}>
          <CrateMark size={size} />
        </BlockTile>
      ) : (
        <BlockTile
          size={size}
          // Tracing turns a tile yellow; once the trace spells a word every
          // tile in it lights up gold.
          color={lit ? 'gold' : selected ? 'yellow' : visual ? visual.cube : 'cream'}
          state={lit ? 'selected' : 'normal'}
          letter={letter.toUpperCase()}
        >
          {visual && !selected ? (
            <Text style={[styles.glyph, { fontSize: Math.max(9, size * 0.22) }]}>{visual.glyph}</Text>
          ) : null}
        </BlockTile>
      )}
      {!crate && !selected && hinted ? (
        <View pointerEvents="none" style={[styles.hint, { borderRadius: size * 0.22 }]} />
      ) : null}
    </Animated.View>
  );
});

/** Plank marks on a stone cube: a crate that only a special can break. */
function CrateMark({ size }: { size: number }) {
  const bar = Math.max(2, size * 0.08);
  return (
    <View style={[styles.crateMark, { width: size * 0.56, height: size * 0.56, borderWidth: bar, borderRadius: size * 0.08 }]}>
      <View style={[styles.crateSlat, { height: bar, transform: [{ rotate: '-45deg' }] }]} />
    </View>
  );
}

function PuffGhost({
  ghost,
  size,
  left,
  top,
}: {
  ghost: ClearGhost;
  size: number;
  left: number;
  top: number;
}) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: PUFF_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [progress]);

  const scale = progress.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [1, 1.22, 0.35],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  const dotSize = size * 0.18;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left, top, width: size, height: size }}>
      <Animated.View
        pointerEvents="none"
        style={[styles.tile, { width: size, height: size, transform: [{ scale }], opacity }]}
      >
        {ghost.crate ? (
          <BlockTile size={size} color="stone" stud={false}>
            <CrateMark size={size} />
          </BlockTile>
        ) : (
          <BlockTile size={size} color="gold" letter={ghost.letter.toUpperCase()} />
        )}
      </Animated.View>
      {SPARK_COLORS.map((color, i) => {
        const angle = (i / SPARK_COLORS.length) * Math.PI * 2 + 0.3;
        const distance = size * (i % 2 === 0 ? 0.72 : 0.46);
        const translateX = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, Math.cos(angle) * distance],
        });
        const translateY = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, Math.sin(angle) * distance],
        });
        const dotOpacity = progress.interpolate({
          inputRange: [0, 0.35, 1],
          outputRange: [1, 1, 0],
        });
        return (
          <Animated.View
            key={i}
            pointerEvents="none"
            style={[
              styles.puffDot,
              {
                backgroundColor: color,
                width: dotSize,
                height: dotSize,
                borderRadius: dotSize / 2,
                left: size / 2 - dotSize / 2,
                top: size / 2 - dotSize / 2,
                opacity: dotOpacity,
                transform: [{ translateX }, { translateY }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

function ChainStamp({ label }: { label: 'CRUSH' | 'NOVA' }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 720,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [progress]);

  const scale = progress.interpolate({
    inputRange: [0, 0.42, 1],
    outputRange: [0.55, 1.12, 0.92],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.18, 0.72, 1],
    outputRange: [0, 1, 1, 0],
  });

  return (
    <Animated.View pointerEvents="none" style={[styles.stamp, { transform: [{ scale }], opacity }]}>
      <StrokeText size={44} color={palette.gold} stroke={palette.goldEdge} strokeWidth={3} depth={3}>
        {label}
      </StrokeText>
    </Animated.View>
  );
}

/** Sparks a cleared tile throws, in the board's cube colours. */
const SPARK_COLORS = [cube.yellow, cube.red, cube.teal, cube.purple, cube.orange, cube.green, cube.pink, cube.blue] as const;

/** One looping 0–1 value for every lit tile, so the word breathes as one. */
function useLitPulse(active: boolean): Animated.Value {
  const reduceMotion = useReduceMotion();
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active || reduceMotion) {
      pulse.setValue(active ? 1 : 0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 420, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.25, duration: 420, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, reduceMotion, pulse]);
  return pulse;
}

/** Centre of the tiles a word cleared, where its points burst from. */
function burstPoint(board: Board, cleared: readonly number[], tileSize: number): { x: number; y: number } | null {
  if (cleared.length === 0 || tileSize <= 0) return null;
  const pitch = tileSize + GAP;
  let x = 0;
  let y = 0;
  for (const index of cleared) {
    x += colOf(board, index) * pitch + tileSize / 2;
    y += rowOf(board, index) * pitch + tileSize / 2;
  }
  return { x: x / cleared.length, y: y / cleared.length };
}

const styles = StyleSheet.create({
  frame: {
    alignSelf: 'center',
    padding: FRAME_INSET - 3,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: palette.frameDeep,
    borderTopColor: '#7FE0F6',
    backgroundColor: palette.frame,
  },
  board: { width: '100%', position: 'relative', alignSelf: 'center' },
  tile: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  glyph: {
    position: 'absolute',
    top: 2,
    right: 4,
    color: palette.white,
    textShadowColor: palette.navyDeep,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  hint: {
    position: 'absolute',
    top: -2,
    right: -2,
    bottom: -2,
    left: -2,
    // White, not gold: gold is what a traced tile turns, and a hint must
    // never look already selected.
    borderWidth: 3,
    borderColor: palette.white,
    shadowColor: palette.white,
    shadowOpacity: 0.95,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  crateMark: { borderColor: '#6E7F92', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  crateSlat: { width: '140%', backgroundColor: '#6E7F92' },
  puffDot: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: palette.white,
  },
  litHalo: {
    position: 'absolute',
    top: -5,
    right: -5,
    bottom: -5,
    left: -5,
    backgroundColor: withAlpha(palette.gold, 0.55),
    borderWidth: 2,
    borderColor: palette.white,
    shadowColor: palette.gold,
    shadowOpacity: 1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  threadGlow: {
    shadowColor: palette.gold,
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  stamp: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
