import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, StyleSheet, Text, View } from 'react-native';
import { colOf, rowOf } from '../../games/wordfall/board';
import type { Board, PlayResult, SpecialKind } from '../../games/wordfall/types';
import { font, radius, theme, type } from '../theme';
import {
  CLEAR_HOLD_MS,
  PUFF_MS,
  chainStamp,
  ghostsFromCleared,
  playJuiceKey,
  type ClearGhost,
} from './clearJuice';
import { SPECIAL_VISUALS, TILE } from './visuals';

const GAP = 6;

type Props = {
  board: Board;
  selection: number[];
  /** Colour for the trace path and selected tiles — the level's accent. */
  accent: string;
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
};

export function BoardView({
  board,
  selection,
  accent,
  onTrace,
  onRelease,
  onCancel,
  maxWidth,
  maxHeight,
  disabled = false,
  lastPlay,
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
  const tileFromWidth = (maxWidth - horizontalGaps) / board.width;
  const tileFromHeight = (maxHeight - verticalGaps) / board.height;
  const tileSize = Math.max(0, Math.min(tileFromWidth, tileFromHeight));
  const width = tileSize > 0 ? tileSize * board.width + horizontalGaps : 0;
  const height = tileSize > 0 ? tileSize * board.height + verticalGaps : 0;

  // PanResponder is created once, but its handlers must see the CURRENT props.
  // Without this indirection the responder closes over the first render's
  // callbacks and the board stops responding after the first word.
  const live = useRef({ onTrace, onRelease, onCancel, tileSize, board, disabled });
  live.current = { onTrace, onRelease, onCancel, tileSize, board, disabled };

  const responder = useMemo(
    () =>
      PanResponder.create({
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
        onPanResponderRelease: () => live.current.onRelease(),
        // A terminated gesture (a system alert, a scroll taking over) is not a
        // submission — dropping the trace is the safe reading.
        onPanResponderTerminate: () => live.current.onCancel(),
      }),
    [],
  );

  /**
   * Which tile a page coordinate is on.
   *
   * Deliberately generous inside a tile and strict near its edge: the test is
   * distance from the tile's centre, not the cell rectangle. Using the whole
   * cell makes it far too easy to clip a diagonal neighbour on the way past and
   * spell something you did not mean.
   */
  function hitTest(pageX: number, pageY: number): number | null {
    const { tileSize: size, board: b } = live.current;
    if (size <= 0) return null;
    const x = pageX - origin.current.x;
    const y = pageY - origin.current.y;
    const pitch = size + GAP;
    const col = Math.floor(x / pitch);
    const row = Math.floor(y / pitch);
    if (col < 0 || col >= b.width || row < 0 || row >= b.height) return null;

    const cx = col * pitch + size / 2;
    const cy = row * pitch + size / 2;
    const distance = Math.hypot(x - cx, y - cy);
    return distance <= size * 0.46 ? row * b.width + col : null;
  }

  const measure = () => {
    containerRef.current?.measureInWindow((x, y) => {
      origin.current = { x, y };
    });
  };

  const selectedAt = new Map(selection.map((index, order) => [index, order]));

  return (
    <View
      ref={containerRef}
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
            accent={accent}
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
              accent={accent}
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
          {stamp && juiceKey ? <ChainStamp key={juiceKey} label={stamp} accent={accent} /> : null}
        </>
      )}
    </View>
  );
}

/** The line joining traced tiles, drawn as one rotated bar per step. */
function TracePath({
  board,
  selection,
  tileSize,
  accent,
}: {
  board: Board;
  selection: number[];
  tileSize: number;
  accent: string;
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
        const thickness = Math.max(6, tileSize * 0.18);
        return (
          <View
            key={`${selection[i]}-${index}`}
            pointerEvents="none"
            style={{
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
              backgroundColor: accent,
              opacity: 0.55,
              borderRadius: thickness / 2,
              transform: [{ rotate: `${angle}deg` }],
            }}
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
  accent,
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
  accent: string;
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
    Animated.spring(scale, {
      toValue: selected ? 1.1 : 1,
      damping: 16,
      stiffness: 320,
      mass: 0.6,
      useNativeDriver: true,
    }).start();
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
        {
          width: size,
          height: size,
          left,
          top,
          transform: [{ translateY: drop }, { scale }],
        },
        crate && styles.crate,
        !crate && selected && { backgroundColor: accent, borderColor: accent },
        !crate && !selected && visual && { borderColor: visual.color, borderWidth: 2 },
      ]}
      accessibilityLabel={
        crate ? 'Blocked crate' : special ? `${letter}, ${special} tile` : letter
      }
    >
      {crate ? (
        <Text style={[styles.crateMark, { fontSize: size * 0.4 }]}>▤</Text>
      ) : (
        <>
          <Text
            style={[
              styles.letter,
              { fontSize: size * 0.46 },
              selected && styles.letterSelected,
            ]}
          >
            {letter.toUpperCase()}
          </Text>
          {visual && !selected && (
            <Text style={[styles.glyph, { color: visual.color, fontSize: size * 0.26 }]}>
              {visual.glyph}
            </Text>
          )}
        </>
      )}
    </Animated.View>
  );
});

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
  const dotSize = size * 0.16;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left, top, width: size, height: size }}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.tile,
          {
            width: size,
            height: size,
            transform: [{ scale }],
            opacity,
          },
          ghost.crate && styles.crate,
        ]}
      >
        {ghost.crate ? (
          <Text style={[styles.crateMark, { fontSize: size * 0.4 }]}>▤</Text>
        ) : (
          <Text style={[styles.letter, { fontSize: size * 0.46 }]}>
            {ghost.letter.toUpperCase()}
          </Text>
        )}
      </Animated.View>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const angle = (i / 6) * Math.PI * 2;
        const distance = size * (i % 2 === 0 ? 0.58 : 0.38);
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

function ChainStamp({
  label,
  accent,
}: {
  label: 'CRUSH' | 'NOVA';
  accent: string;
}) {
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
      <Text style={[styles.stampText, { color: accent }]}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  board: { width: '100%', position: 'relative', alignSelf: 'center' },
  tile: {
    position: 'absolute',
    backgroundColor: TILE.face,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: TILE.faceEdge,
    borderBottomWidth: 4,
    borderBottomColor: TILE.faceDepth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    ...type.title,
    color: theme.text,
    fontFamily: font.bold,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  // The selected tile is filled with the accent, so its letter flips to the
  // dark background colour to stay readable.
  letterSelected: { color: theme.bg },
  glyph: {
    position: 'absolute',
    top: 2,
    right: 4,
    fontWeight: '900',
  },
  crate: {
    backgroundColor: TILE.crate,
    borderColor: TILE.crateEdge,
    borderBottomColor: TILE.crateDepth,
  },
  crateMark: { color: TILE.crateMark },
  puffDot: {
    position: 'absolute',
    backgroundColor: TILE.faceEdge,
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
  stampText: {
    ...type.title,
    fontFamily: font.bold,
    fontSize: 42,
    lineHeight: 48,
    fontWeight: '700',
  },
});
