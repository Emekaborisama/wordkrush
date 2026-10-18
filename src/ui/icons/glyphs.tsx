import { Defs, G, Path } from 'react-native-svg';
import { roundedPolygonPath } from '../shapes';
import { palette } from '../theme';
import {
  arcArrow,
  arcPath,
  arrowHead,
  circlePath,
  ellipsePath,
  gearPath,
  roundRectPath,
  sparklePath,
} from './geometry';
import type { GlyphIconName } from './names';
import { vgrad, type IconCtx } from './paint';

/** Default centreline width: chunky enough to read at 18px. */
const W = 9;
/** Outline on each side of the white. */
const O = 4;
/**
 * The outline is pushed this far down once more, so glyphs get the same
 * thick foot as the kit's outlined labels (`StrokeText`'s extrusion).
 */
const FOOT = 2.6;

type Layer = {
  /** Centrelines, drawn as thick round-capped strokes: [d, width]. */
  s?: ReadonlyArray<readonly [string, number?]>;
  /** Closed shapes. */
  f?: readonly string[];
  /** Cut inner subpaths of `f` out (the settings gear's hole). */
  holes?: boolean;
  /** Details in the outline colour on top of the white: [d, stroke width or fill]. */
  ink?: ReadonlyArray<readonly [string, number?]>;
  /** White details on top of `ink` (the eye's catch-light). */
  hi?: readonly string[];
  t?: string;
};

/**
 * Layers paint in order, each with its own outline, so a later layer's
 * outline separates it from an earlier one (two people, crossing arrows).
 */
type Glyph = { layers: readonly Layer[]; gold?: boolean };

const ROUND = { strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

function Outline({ layer, ink }: { layer: Layer; ink: string }) {
  const rule = layer.holes ? 'evenodd' : 'nonzero';
  return (
    <G transform={layer.t}>
      {layer.f?.map((d, i) => (
        <Path key={`f${i}`} d={d} fill={ink} fillRule={rule} stroke={ink} strokeWidth={O * 2} strokeLinejoin="round" />
      ))}
      {layer.s?.map(([d, w = W], i) => (
        <Path key={`s${i}`} d={d} fill="none" stroke={ink} strokeWidth={w + O * 2} {...ROUND} />
      ))}
    </G>
  );
}

function render(c: IconCtx, glyph: Glyph) {
  const face = glyph.gold ? c.url('gold') : palette.white;
  return (
    <>
      {glyph.gold ? <Defs>{vgrad(c.id('gold'), ['#FFF59A', palette.gold, palette.goldDeep])}</Defs> : null}
      <G transform={`translate(0 ${FOOT})`}>
        {glyph.layers.map((layer, i) => (
          <Outline key={i} layer={layer} ink={c.ink} />
        ))}
      </G>
      {glyph.layers.map((layer, i) => (
        <G key={i}>
          <Outline layer={layer} ink={c.ink} />
          <G transform={layer.t}>
            {layer.f?.map((d, j) => (
              <Path key={`f${j}`} d={d} fill={face} fillRule={layer.holes ? 'evenodd' : 'nonzero'} />
            ))}
            {layer.s?.map(([d, w = W], j) => (
              <Path key={`s${j}`} d={d} fill="none" stroke={face} strokeWidth={w} {...ROUND} />
            ))}
            {layer.ink?.map(([d, w], j) =>
              w ? (
                <Path key={`i${j}`} d={d} fill="none" stroke={c.ink} strokeWidth={w} {...ROUND} />
              ) : (
                <Path key={`i${j}`} d={d} fill={c.ink} />
              ),
            )}
            {layer.hi?.map((d, j) => (
              <Path key={`h${j}`} d={d} fill={palette.white} />
            ))}
          </G>
        </G>
      ))}
    </>
  );
}

const SPEAKER = roundedPolygonPath(
  [
    [8.5, 24],
    [19, 24],
    [31, 12.5],
    [31, 51.5],
    [19, 40],
    [8.5, 40],
  ],
  3,
);

const RETRY = arcArrow(32, 32.5, 16, 80, 375, 10, 10.5);

const GLYPHS: Record<GlyphIconName, Glyph> = {
  back: { layers: [{ s: [['M38.5 13 L21 31.5 L38.5 50', 11]] }] },
  close: { layers: [{ s: [['M18.5 17.5 L45.5 44.5 M45.5 17.5 L18.5 44.5', 11]] }] },
  plus: { layers: [{ s: [['M32 13 V49 M14 31 H50', 11]] }] },
  check: { layers: [{ s: [['M13.5 32 L26 44.5 L50.5 18', 11]] }] },
  play: { layers: [{ f: [roundedPolygonPath([[21, 11.5], [52, 31], [21, 50.5]], 5)] }] },
  pause: { layers: [{ f: [roundRectPath(15, 12, 12.5, 38, 4.5), roundRectPath(36.5, 12, 12.5, 38, 4.5)] }] },
  home: {
    layers: [
      {
        f: [
          roundedPolygonPath(
            [
              [32, 8],
              [56, 29.5],
              [49.5, 29.5],
              [49.5, 52],
              [14.5, 52],
              [14.5, 29.5],
              [8, 29.5],
            ],
            3,
          ),
        ],
        ink: [[roundRectPath(26.5, 37, 11, 16, 3)]],
      },
    ],
  },
  help: {
    layers: [
      {
        s: [['M21.5 21.5 C21.5 11.5 42.5 11 42.5 21.5 C42.5 29 32 29 32 37', 10]],
        f: [circlePath(32, 49.5, 5.8)],
      },
    ],
  },
  retry: { layers: [{ s: [[RETRY.arc, 8.5]], f: [roundedPolygonPath(RETRY.head, 2)] }] },
  share: {
    layers: [{ s: [['M32 37 V11.5'], ['M21.5 21 L32 10.5 L42.5 21'], ['M15.5 30 V49.5 H48.5 V30']] }],
  },
  lock: {
    layers: [
      {
        s: [['M22.5 29 V22 C22.5 10 41.5 10 41.5 22 V29', 7.5]],
        f: [roundRectPath(13, 27, 38, 26, 6.5)],
        ink: [[circlePath(32, 37.5, 4.2)], [roundRectPath(30, 38, 4, 9.5, 2)]],
      },
    ],
  },
  people: {
    layers: [
      { f: [circlePath(42.5, 18.5, 8.2), 'M30 47 C30.5 37.5 35.5 32.5 42.5 32.5 C50 32.5 55.5 38 55.5 47 Z'] },
      { f: [circlePath(24.5, 22.5, 9.6), 'M6.5 53 C6.5 43 14 37 24.5 37 C35 37 42.5 43 42.5 53 Z'] },
    ],
  },
  user: {
    layers: [{ f: [circlePath(32, 20.5, 10.5), 'M11.5 52 C11.5 40.5 20.5 34.5 32 34.5 C43.5 34.5 52.5 40.5 52.5 52 Z'] }],
  },
  sound: {
    layers: [{ f: [SPEAKER], s: [[arcPath(31, 32, 10.5, 50, 130), 6.5], [arcPath(31, 32, 20, 45, 135), 6.5]] }],
  },
  soundOff: { layers: [{ f: [SPEAKER], s: [['M40.5 24.5 L53.5 39.5 M53.5 24.5 L40.5 39.5', 7]] }] },
  vibrate: {
    layers: [
      {
        f: [roundRectPath(20.5, 9, 23, 45, 6)],
        s: [['M11.5 23 V40', 6], ['M52.5 23 V40', 6]],
        ink: [[roundRectPath(25.5, 15, 13, 27, 2.5)]],
      },
    ],
  },
  music: {
    layers: [
      {
        f: [ellipsePath(24.5, 45.5, 9.5, 7, -24)],
        s: [['M32.5 44 V11.5', 6.5], ['M32.5 11.5 C37 19 47.5 19.5 46 33', 6.5]],
      },
    ],
  },
  mail: {
    layers: [{ f: [roundRectPath(8, 15, 48, 34, 6.5)], ink: [['M13.5 20.5 L32 34 L50.5 20.5', 4.2]] }],
  },
  shuffle: {
    layers: [
      {
        s: [['M9.5 43 H17 C30 43 34 21 46 21', 7]],
        f: [roundedPolygonPath(arrowHead([56, 21], [1, 0], 10, 9), 2)],
      },
      {
        s: [['M9.5 21 H17 C30 21 34 43 46 43', 7]],
        f: [roundedPolygonPath(arrowHead([56, 43], [1, 0], 10, 9), 2)],
      },
    ],
  },
  skip: {
    layers: [
      { f: [roundedPolygonPath([[9, 14], [31, 32], [9, 50]], 4.5)] },
      { f: [roundedPolygonPath([[30, 14], [52, 32], [30, 50]], 4.5)] },
    ],
  },
  arrowUp: {
    layers: [
      {
        f: [
          roundedPolygonPath(
            [
              [32, 8],
              [54, 31],
              [41, 31],
              [41, 52],
              [23, 52],
              [23, 31],
              [10, 31],
            ],
            3,
          ),
        ],
      },
    ],
  },
  arrowDown: {
    layers: [
      {
        f: [
          roundedPolygonPath(
            [
              [32, 53],
              [10, 30],
              [23, 30],
              [23, 9],
              [41, 9],
              [41, 30],
              [54, 30],
            ],
            3,
          ),
        ],
      },
    ],
  },
  eye: {
    layers: [
      {
        f: ['M6.5 32 C15 17.5 49 17.5 57.5 32 C49 46.5 15 46.5 6.5 32 Z'],
        ink: [[circlePath(32, 32, 9.5)]],
        hi: [circlePath(35.4, 28.6, 3)],
      },
    ],
  },
  magnifier: { layers: [{ s: [[circlePath(27.5, 27.5, 14), 8], ['M38.5 38.5 L51 51', 11]] }] },
  chart: {
    layers: [
      {
        f: [
          roundRectPath(9.5, 33, 12.5, 19.5, 3.5),
          roundRectPath(25.75, 21, 12.5, 31.5, 3.5),
          roundRectPath(42, 9.5, 12.5, 43, 3.5),
        ],
      },
    ],
  },
  bolt: {
    gold: true,
    layers: [
      {
        f: [
          roundedPolygonPath(
            [
              [37, 6],
              [15, 35],
              [29, 35],
              [24, 55],
              [49, 24.5],
              [35, 24.5],
              [43, 6],
            ],
            2.4,
          ),
        ],
      },
    ],
  },
  flag: {
    layers: [
      {
        s: [['M16 9.5 V54', 6.5]],
        f: [
          'M19.5 11 C27 7 34.5 15 42 11.5 C46 9.5 50 9.5 52.5 11 V34.5 C44.5 38.5 37 30.5 29 34 C25.5 35.5 22 36 19.5 35 Z',
        ],
      },
    ],
  },
  ruler: {
    layers: [
      {
        t: 'rotate(-45 32 32)',
        f: [roundRectPath(7, 22.5, 50, 19, 4)],
        ink: [['M15 22.5 V30 M22 22.5 V27 M29 22.5 V30 M36 22.5 V27 M43 22.5 V30 M50 22.5 V27', 2.6]],
      },
    ],
  },
  sparkle: { gold: true, layers: [{ f: [sparklePath(29, 30, 22, 0.17), sparklePath(49.5, 49, 7, 0.2)] }] },
  settings: { layers: [{ holes: true, f: [gearPath(32, 31, { teeth: 8, tip: 24.5, root: 18.5, hole: 7.5, round: 2.6 })] }] },
};

export const drawGlyph = (name: GlyphIconName, c: IconCtx) => render(c, GLYPHS[name]);
