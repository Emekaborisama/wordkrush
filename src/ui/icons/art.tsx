import type { ReactElement } from 'react';
import { Circle, ClipPath, Defs, G, Path } from 'react-native-svg';
import { roundedPolygonPath, starPath, type Point } from '../shapes';
import { palette, shade, tone, type GlossTone } from '../theme';
import {
  arcPath,
  burstPoints,
  circlePath,
  ellipsePath,
  gearPath,
  heartPath,
  polar,
  rectPoints,
  rotatePoint,
  roundRectPath,
  sparklePath,
  type GearSpec,
} from './geometry';
import type { ArtIconName } from './names';
import { Glint, SHADOW, Stack, vgrad, type IconCtx, type IconDraw, type Mat } from './paint';

function fromTone(t: GlossTone): Mat {
  return { top: t.top, base: t.bottom, deep: t.lip, line: t.outline };
}

function darker(m: Mat, amount: number): Mat {
  return { top: shade(m.top, amount), base: shade(m.base, amount), deep: shade(m.deep, amount), line: m.line };
}

/**
 * Art materials, sampled from the kit's icon row (bb_7): lemon-to-orange gold
 * with a brown edge, an orange-red heart, a lavender gear, a navy bomb.
 * Ribbon and gem colours reuse the theme's glossy tones.
 */
const M = {
  gold: { top: '#FFF27A', base: '#FFC61F', deep: '#E88600', line: '#8A4300' },
  goldSide: { top: '#F9A825', base: '#D27200', deep: '#A85500', line: '#8A4300' },
  star: { top: '#FFF35A', base: '#FFC800', deep: '#F08600', line: '#8C3A06' },
  clock: { top: '#FFD65A', base: '#FFA41C', deep: '#DD7406', line: '#8A3F00' },
  red: { top: '#FF8C6E', base: '#F33D30', deep: '#B9101F', line: '#7A0E1E' },
  flame: { top: '#FFC94A', base: '#FF7A1A', deep: '#D9480F', line: '#8A2A06' },
  core: { top: '#FFFDE0', base: '#FFE45A', deep: '#FFB21C', line: '#E07A0A' },
  pink: { top: '#FFA6D8', base: '#F7558F', deep: '#C92D66', line: '#7E1745' },
  ribbon: { top: '#FFF07A', base: '#FFC21C', deep: '#E38200', line: '#9A5200' },
  lavender: { top: '#F6E9FF', base: '#D0AAF5', deep: '#A97CDD', line: '#4F2C8A' },
  lavenderSide: { top: '#A97CDD', base: '#8456C4', deep: '#6A3DAA', line: '#4F2C8A' },
  violet: { top: '#E5C8FF', base: '#A86BF5', deep: '#6E34CF', line: '#3C1880' },
  blue: { top: '#8CCBFF', base: '#3D8BF2', deep: '#2560CC', line: '#143A85' },
  cream: { top: '#FFFFFF', base: '#FFEAD3', deep: '#EEC39B', line: '#A26F3E' },
  paper: { top: '#FFFFFF', base: '#EEF4FA', deep: '#C5D4E3', line: '#3D5D85' },
  silver: { top: '#FFFFFF', base: '#CBD7E4', deep: '#8D9EB2', line: '#46566B' },
  bronze: { top: '#FFD2A3', base: '#E38D4A', deep: '#AE5A20', line: '#5E2C0D' },
  wood: { top: '#F6C47C', base: '#D98E40', deep: '#A85A1F', line: '#5A2C0C' },
  steel: { top: '#E6EDF4', base: '#9EADC0', deep: '#66768D', line: '#323D50' },
  bomb: { top: '#7387AD', base: '#2F3B5A', deep: '#141A2B', line: '#0B1020' },
  rope: { top: '#FFF6E0', base: '#E2CDA4', deep: '#B89C6E', line: '#5C4628' },
  skin: { top: '#FFE4C8', base: '#FBBE93', deep: '#E08D60', line: '#9A4A24' },
  cuff: { top: '#FFFFFF', base: '#D3E8FF', deep: '#8FBBEF', line: '#3A64A0' },
  glass: { top: '#FFFFFF', base: '#EAF4F8', deep: '#C5D7E0', line: '#B5620A' },
  bulb: { top: '#FFFCD8', base: '#FFE04A', deep: '#F6A40C', line: '#8C5200' },
  ice: { top: '#FFFFFF', base: '#BDE8FF', deep: '#7CC6F4', line: '#1F5F9E' },
  string: { top: '#B5762A', base: '#8A4300', deep: '#6A3300', line: '#5A2A00' },
  ruby: fromTone(tone.red),
  sapphire: fromTone(tone.blue),
  emerald: fromTone(tone.green),
} as const satisfies Record<string, Mat>;

function poly(points: readonly Point[]): string {
  return `M${points.map(([x, y]) => `${x},${y}`).join(' L')} Z`;
}

const COIN_K = roundedPolygonPath(
  [
    [23.2, 19],
    [29.4, 19],
    [29.4, 25.4],
    [33.6, 19],
    [40.4, 19],
    [33.4, 28.6],
    [41, 39.6],
    [34.2, 39.6],
    [29.4, 32.4],
    [29.4, 39.6],
    [23.2, 39.6],
  ],
  1.3,
);

const FLAME =
  'M32 4 C35.5 13.5 47.5 19 49.5 33 C51.5 47.5 43 58 32 58 C21 58 12.5 50 13.5 38 ' +
  'C14.2 30.5 18 25.5 22.5 21.5 C22.8 27 24.8 30.2 28 31.6 C26.4 22.4 27.8 12 32 4 Z';
const FLAME_CORE =
  'M32 26.5 C34.8 33 41.5 37 41.5 45.2 C41.5 51.6 37.4 55.4 32 55.4 ' +
  'C26.6 55.4 22.5 51.6 22.5 45.6 C22.5 39.8 27.8 35.4 32 26.5 Z';

const GEAR: GearSpec = { teeth: 8, tip: 25.5, root: 19.8, hole: 8.2, round: 3.2 };

const CUP = 'M12 11 H52 C52 29.5 45 39.5 32 41 C19 39.5 12 29.5 12 11 Z';

const BOW_L = 'M32 20.5 C27 9 15.5 6.5 13.6 13 C12.4 18.2 21 21.8 32 21.2 Z';
const BOW_R = 'M32 20.5 C37 9 48.5 6.5 50.4 13 C51.6 18.2 43 21.8 32 21.2 Z';

const CHEST_LID = 'M9 29 V21 C9 12 18 7.5 32 7.5 C46 7.5 55 12 55 21 V29 Z';
const CHEST_BODY = roundRectPath(9, 28, 46, 29, 3.6);

const BULB_GLASS =
  'M32 5 C45.5 5 53.5 14 53.5 25.5 C53.5 34 48.2 38.6 44.6 43.6 V47 H19.4 V43.6 ' +
  'C15.8 38.6 10.5 34 10.5 25.5 C10.5 14 18.5 5 32 5 Z';

function bell(cx: number): string {
  return `M${cx - 8.5} 19.5 C${cx - 8.5} 9.6 ${cx + 8.5} 9.6 ${cx + 8.5} 19.5 Z`;
}

/** Digits for the medals, as round-capped centrelines. */
const MEDAL_DIGIT = {
  1: 'M28.6 36.2 L33 33.2 V47',
  2: 'M27.4 37.2 C27.4 32.6 36.8 32.4 36.8 37.4 C36.8 41.4 28.2 43 27.4 47 H37.2',
  3: 'M27.6 34 H36.4 L31.8 39.4 C35.6 39.2 37.4 41.2 37.4 43.6 C37.4 48.4 29.6 48.8 27.2 45.8',
} as const;

function medal(c: IconCtx, metal: Mat, band: GlossTone, place: keyof typeof MEDAL_DIGIT): ReactElement {
  const left = fromTone(band);
  const digit = MEDAL_DIGIT[place];
  return (
    <>
      <Stack
        c={c}
        parts={[
          { d: roundedPolygonPath([[35, 4.5], [47, 4.5], [39.5, 30], [28.5, 30]], 1.6), m: darker(left, 0.16) },
          { d: roundedPolygonPath([[17, 4.5], [29, 4.5], [35.5, 30], [24.5, 30]], 1.6), m: left },
          { d: circlePath(32, 41, 17.5), m: metal, lift: 2.6, sheen: ellipsePath(26, 30, 16, 8, -15) },
        ]}
      />
      <Defs>{vgrad(c.id('md'), [metal.deep, metal.base, metal.top])}</Defs>
      <Circle cx={32} cy={39.8} r={12.4} fill={c.url('md')} stroke={metal.line} strokeWidth={1.4} />
      <Path d={digit} fill="none" stroke={metal.line} strokeWidth={6.6} strokeLinecap="round" strokeLinejoin="round" />
      <Path d={digit} fill="none" stroke={metal.top} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M20.6 9 L25.4 26" stroke="#FFFFFF" strokeWidth={1.8} strokeLinecap="round" opacity={0.5} />
      <Glint x={21} y={33} rx={3.2} ry={1.5} rot={-48} />
    </>
  );
}

function scales(c: IconCtx): ReactElement {
  const tilt = -9;
  const [lx, ly] = rotatePoint([12, 15], 32, 15, tilt);
  const [rx, ry] = rotatePoint([52, 15], 32, 15, tilt);
  const lp = ly + 21;
  const rp = ry + 21;
  const pan = (x: number, y: number) =>
    `M${x - 8.5} ${y} H${x + 8.5} C${x + 8.5} ${y + 6} ${x + 4.5} ${y + 8.5} ${x} ${y + 8.5} ` +
    `C${x - 4.5} ${y + 8.5} ${x - 8.5} ${y + 6} ${x - 8.5} ${y} Z`;
  return (
    <>
      <Stack
        c={c}
        parts={[
          { d: `M${lx} ${ly} L${lx - 7} ${lp} M${lx} ${ly} L${lx + 7} ${lp}`, m: M.string, w: 1.8, inner: true },
          { d: `M${rx} ${ry} L${rx - 7} ${rp} M${rx} ${ry} L${rx + 7} ${rp}`, m: M.string, w: 1.8, inner: true },
          { d: roundRectPath(29.5, 14, 5, 36, 2), m: M.gold },
          { d: roundedPolygonPath([[21.5, 51.5], [42.5, 51.5], [47.5, 58], [16.5, 58]], 2.4), m: M.gold, lift: 1.6 },
          { d: roundRectPath(25, 47.5, 14, 5.5, 2.2), m: M.gold, lift: 1.2 },
          { d: roundedPolygonPath(rectPoints(32, 15, 42, 4.8, tilt), 2.2), m: M.gold, lift: 1 },
          { d: circlePath(32, 13.5, 4.4), m: M.gold, lift: 1.1 },
          { d: pan(lx, lp), m: M.gold, lift: 1.6 },
          { d: pan(rx, rp), m: M.gold, lift: 1.6 },
        ]}
      />
      <Glint x={lx - 4} y={lp + 2.2} rx={2.4} ry={1.1} rot={0} o={0.8} />
      <Glint x={rx - 4} y={rp + 2.2} rx={2.4} ry={1.1} rot={0} o={0.8} />
      <Glint x={30.4} y={12} rx={1.4} ry={1.4} rot={0} o={0.85} />
    </>
  );
}

function snowflake(c: IconCtx): ReactElement {
  const arms: string[] = [];
  for (let i = 0; i < 6; i += 1) {
    const a = i * 60;
    const [x1, y1] = polar(32, 32, 23, a);
    const [bx, by] = polar(32, 32, 14, a);
    const [l1x, l1y] = polar(bx, by, 7.4, a - 45);
    const [l2x, l2y] = polar(bx, by, 7.4, a + 45);
    arms.push(`M32 32 L${x1} ${y1} M${bx} ${by} L${l1x} ${l1y} M${bx} ${by} L${l2x} ${l2y}`);
  }
  const d = arms.join(' ');
  const hub = roundedPolygonPath(
    [0, 60, 120, 180, 240, 300].map((a) => polar(32, 32, 6.6, a + 30)),
    1.6,
  );
  const line = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  return (
    <>
      <Defs>{vgrad(c.id('ice'), [M.ice.top, M.ice.base, M.ice.deep], [9, 55])}</Defs>
      <Path d={d} {...line} stroke={SHADOW} strokeWidth={11.4} opacity={0.3} transform="translate(0.6 2.4)" />
      <Path d={d} {...line} stroke={M.ice.line} strokeWidth={11.4} />
      <Path d={hub} fill={M.ice.line} stroke={M.ice.line} strokeWidth={5} strokeLinejoin="round" />
      <Path d={d} {...line} stroke={c.url('ice')} strokeWidth={6.4} />
      <Path d={hub} fill={c.url('ice')} />
      <Path d={d} {...line} stroke="#FFFFFF" strokeWidth={2} opacity={0.55} transform="translate(-0.8 -0.9)" />
      <Glint x={28.6} y={28.4} rx={2} ry={1.2} rot={-40} />
    </>
  );
}

/** One drawing per art name; TypeScript holds the set complete. */
export const ART: Record<ArtIconName, IconDraw> = {
  coin: (c) => (
    <>
      <Stack
        c={c}
        parts={[
          { d: circlePath(32, 34, 24), m: M.goldSide },
          { d: circlePath(32, 29.5, 24), m: M.gold, lift: 2, sheen: ellipsePath(25, 13, 22, 10, -12) },
        ]}
      />
      <Defs>
        {vgrad(c.id('cd'), ['#EE9C0C', '#FFD84A', '#FFEB80'])}
        {vgrad(c.id('ck'), ['#FFFCE0', '#FFE47A'])}
      </Defs>
      <Circle cx={32} cy={29.5} r={17.2} fill={c.url('cd')} stroke="#C27400" strokeWidth={2.2} />
      <Path d={COIN_K} fill="#B86400" transform="translate(1 1.8)" />
      <Path d={COIN_K} fill={c.url('ck')} stroke={M.gold.line} strokeWidth={2.4} strokeLinejoin="round" />
      <Glint x={17.5} y={20} rx={4.6} ry={2.2} rot={-50} />
      <Glint x={22.8} y={14.2} rx={1.6} ry={1.6} rot={0} o={0.85} />
    </>
  ),

  star: (c) => (
    <>
      <Stack
        c={c}
        parts={[{ d: starPath(32, 34.5, 28.5, 15.4), m: M.star, lift: 3.4, sheen: ellipsePath(24, 17, 24, 12, -10) }]}
      />
      <Glint x={15} y={26.2} rx={4.6} ry={1.8} rot={-8} />
      <Glint x={29.4} y={13.6} rx={1.5} ry={2.8} rot={20} o={0.85} />
    </>
  ),

  heart: (c) => (
    <>
      <Stack
        c={c}
        parts={[{ d: heartPath(32, 9, 54, 47), m: M.red, lift: 3.6, sheen: ellipsePath(30, 17, 26, 11, -8) }]}
      />
      <Glint x={16.5} y={21} rx={5.6} ry={3.2} rot={-48} />
      <Glint x={24.2} y={14.6} rx={1.9} ry={1.9} rot={0} o={0.85} />
    </>
  ),

  flame: (c) => (
    <>
      <Stack
        c={c}
        parts={[
          { d: FLAME, m: M.flame, lift: 2.6, sheen: ellipsePath(26, 22, 14, 20, 20) },
          { d: FLAME_CORE, m: M.core, lift: 1.8, inner: true },
        ]}
      />
      <Path
        d="M18.6 36 C18 41.5 19.8 46.5 23.4 50"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={2.6}
        strokeLinecap="round"
        opacity={0.75}
      />
      <Glint x={28.6} y={42.5} rx={2} ry={3.6} rot={18} />
    </>
  ),

  gear: (c) => (
    <>
      <Stack
        c={c}
        parts={[
          { d: gearPath(33, 33.5, GEAR), m: M.lavenderSide, holes: true },
          {
            d: gearPath(31, 29.5, GEAR),
            m: M.lavender,
            holes: true,
            lift: 1.8,
            sheen: ellipsePath(24, 15, 22, 11, -20),
          },
        ]}
      />
      <Glint x={18.5} y={21} rx={3.4} ry={1.7} rot={-50} />
    </>
  ),

  trophy: (c) => (
    <>
      <Stack
        c={c}
        parts={[
          { d: 'M14.6 16.4 C5.2 15.2 5.4 30.4 18.2 31.8', m: M.gold, w: 4.6 },
          { d: 'M49.4 16.4 C58.8 15.2 58.6 30.4 45.8 31.8', m: M.gold, w: 4.6 },
          { d: roundRectPath(27.8, 38, 8.4, 9.5, 1.6), m: M.goldSide },
          { d: roundRectPath(17.5, 47.5, 29, 10.5, 3.6), m: M.gold, lift: 2.6 },
          { d: roundRectPath(21.5, 44, 21, 5.5, 2.2), m: M.gold, lift: 1.4 },
          { d: CUP, m: M.gold, lift: 2.6, sheen: ellipsePath(24, 18, 16, 9, -10) },
          { d: ellipsePath(32, 11, 20.5, 5.2), m: M.gold },
        ]}
      />
      <Defs>{vgrad(c.id('ti'), ['#D9800A', '#F5B52A'])}</Defs>
      <Path d={ellipsePath(32, 11.7, 16.8, 3.4)} fill={c.url('ti')} />
      <Path
        d={starPath(32, 25.5, 7.6, 4)}
        fill="#FFF7B8"
        stroke="#D08300"
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <Glint x={18.6} y={22} rx={1.8} ry={5} rot={-14} o={0.85} />
    </>
  ),

  gift: (c) => (
    <>
      <Stack
        c={c}
        parts={[
          { d: BOW_L, m: M.ribbon, lift: 1.4 },
          { d: BOW_R, m: M.ribbon, lift: 1.4 },
          { d: roundRectPath(12, 31, 40, 26.5, 3.6), m: M.pink, lift: 2.6 },
          { d: roundRectPath(27.8, 31, 8.4, 26.5, 0.5), m: M.ribbon, inner: true },
          { d: roundRectPath(8.5, 21.5, 47, 12.5, 3.6), m: M.pink, lift: 2.2, sheen: ellipsePath(26, 21, 26, 5) },
          { d: roundRectPath(27.5, 21.5, 9, 12.5, 0.5), m: M.ribbon, inner: true },
          { d: roundRectPath(27.6, 15.4, 8.8, 8.4, 3), m: M.ribbon, lift: 1.2 },
        ]}
      />
      <Path d={ellipsePath(21.5, 15.2, 4, 1.9, 22)} fill={M.ribbon.deep} opacity={0.8} />
      <Path d={ellipsePath(42.5, 15.2, 4, 1.9, -22)} fill={M.ribbon.deep} opacity={0.8} />
      <Glint x={16} y={39} rx={1.6} ry={4} rot={0} o={0.6} />
      <Glint x={14} y={25} rx={2.6} ry={1.2} rot={0} o={0.8} />
    </>
  ),

  chest: (c) => (
    <>
      <Stack
        c={c}
        parts={[
          { d: CHEST_BODY, m: M.wood, lift: 2.6 },
          { d: CHEST_LID, m: M.wood, lift: 2.2, sheen: ellipsePath(26, 12, 22, 7) },
        ]}
      />
      <Defs>
        <ClipPath id={c.id('cc')}>
          <Path d={CHEST_BODY} />
          <Path d={CHEST_LID} />
        </ClipPath>
        {vgrad(c.id('cs'), [M.gold.top, M.gold.base, M.gold.deep])}
      </Defs>
      <Path d="M9 41.5 H55 M9 49.5 H55" stroke={M.wood.line} strokeWidth={1.4} opacity={0.35} />
      <G clipPath={c.url('cc')}>
        <Path d={roundRectPath(14.5, 4, 6.5, 56, 1)} fill={c.url('cs')} stroke={M.gold.line} strokeWidth={1.8} />
        <Path d={roundRectPath(43, 4, 6.5, 56, 1)} fill={c.url('cs')} stroke={M.gold.line} strokeWidth={1.8} />
      </G>
      <Stack
        c={c}
        k="t"
        shadow={false}
        parts={[
          { d: roundRectPath(7.5, 25.5, 49, 6.5, 2.4), m: M.gold, lift: 1.4 },
          { d: roundRectPath(25.5, 22, 13, 15.5, 3.4), m: M.gold, lift: 1.8 },
        ]}
      />
      <Circle cx={32} cy={28.4} r={2.5} fill={M.wood.line} />
      <Path d={roundRectPath(30.9, 28.6, 2.2, 5.4, 1.1)} fill={M.wood.line} />
      <Glint x={17} y={13.4} rx={3.6} ry={1.5} rot={-28} o={0.75} />
    </>
  ),

  clock: (c) => (
    <>
      <Stack
        c={c}
        parts={[
          { d: 'M19.5 50.5 L14 57.5', m: M.steel, w: 4.4 },
          { d: 'M44.5 50.5 L50 57.5', m: M.steel, w: 4.4 },
          { d: bell(15), m: M.clock, lift: 1.6, t: 'rotate(-38 15 16)' },
          { d: bell(49), m: M.clock, lift: 1.6, t: 'rotate(38 49 16)' },
          { d: roundRectPath(29.4, 7.5, 5.2, 7, 1.6), m: M.steel },
          { d: circlePath(32, 35, 22), m: M.clock, lift: 2.6, sheen: ellipsePath(24, 20, 20, 10, -25) },
          { d: circlePath(32, 34, 16.4), m: M.glass, inner: true },
        ]}
      />
      {[0, 90, 180, 270].map((a) => {
        const [x1, y1] = polar(32, 34, 13.4, a);
        const [x2, y2] = polar(32, 34, 10.8, a);
        return (
          <Path
            key={a}
            d={`M${x1} ${y1} L${x2} ${y2}`}
            stroke={palette.inkSoft}
            strokeWidth={2.4}
            strokeLinecap="round"
            opacity={0.45}
          />
        );
      })}
      <Path
        d="M32 34 V23.5 M32 34 L40.5 40"
        fill="none"
        stroke="#13607A"
        strokeWidth={5.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M32 34 V23.5 M32 34 L40.5 40"
        fill="none"
        stroke="#3ED3EE"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={32} cy={34} r={3.1} fill="#FF8A3D" stroke="#9A3F00" strokeWidth={1.4} />
      <Glint x={24.5} y={26.5} rx={4.4} ry={2.2} rot={-42} />
      <Path
        d={arcPath(32, 35, 19.4, -64, -22)}
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={2.2}
        strokeLinecap="round"
        opacity={0.85}
      />
    </>
  ),

  bulb: (c) => (
    <>
      <Stack
        c={c}
        parts={[
          { d: BULB_GLASS, m: M.bulb, lift: 2.4, sheen: ellipsePath(26, 14, 18, 9, -15) },
          { d: roundRectPath(24.5, 53, 15, 6.5, 3.2), m: M.steel, lift: 1.2 },
          { d: roundRectPath(21, 48.5, 22, 6, 3), m: M.steel, lift: 1.2 },
          { d: roundRectPath(19.5, 43.5, 25, 6.4, 3.2), m: M.steel, lift: 1.2 },
        ]}
      />
      <Path
        d="M26.5 40.5 L28.6 31.5 L32 37.5 L35.4 31.5 L37.5 40.5"
        fill="none"
        stroke="#F07A10"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.8}
      />
      <Glint x={20.5} y={22} rx={3.4} ry={7} rot={24} />
      <Glint x={26.4} y={11.4} rx={1.6} ry={1.6} rot={0} o={0.85} />
    </>
  ),

  bomb: (c) => {
    const fuse = 'M46.6 17.6 C48.6 11.4 51.6 9 54.8 9.4';
    return (
      <>
        <Stack
          c={c}
          parts={[
            { d: circlePath(29.5, 38, 21.5), m: M.bomb, ball: true },
            { d: roundedPolygonPath(rectPoints(44, 20.8, 11, 8, 40), 2), m: M.steel, lift: 1.4 },
            { d: fuse, m: M.rope, w: 4.2 },
          ]}
        />
        <Path d={fuse} fill="none" stroke={M.rope.deep} strokeWidth={4.2} strokeDasharray="1.6 2.2" />
        <Defs>{vgrad(c.id('sp'), ['#FFFBC4', '#FFD23A', '#FF9A1F'])}</Defs>
        <Path
          d={roundedPolygonPath(burstPoints(54.8, 9.4, 7, 3, 8), 0.8)}
          fill={c.url('sp')}
          stroke="#C2560A"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
        <Circle cx={54.8} cy={9.4} r={2} fill="#FFFFFF" />
        <Glint x={21} y={28.5} rx={7} ry={4.4} rot={-40} o={0.32} />
        <Glint x={19.6} y={30.4} rx={3} ry={1.7} rot={-40} />
        <Path
          d={arcPath(29.5, 38, 17.6, 105, 168)}
          fill="none"
          stroke="#7C91BC"
          strokeWidth={2.4}
          strokeLinecap="round"
          opacity={0.7}
        />
      </>
    );
  },

  crown: (c) => (
    <>
      <Stack
        c={c}
        parts={[
          {
            d: roundedPolygonPath([[9, 21], [21, 33], [32, 11], [43, 33], [55, 21], [51, 47], [13, 47]], 2.6),
            m: M.gold,
            lift: 2.6,
            sheen: ellipsePath(28, 20, 22, 10, -8),
          },
          { d: roundRectPath(10.5, 43, 43, 13, 4.2), m: M.gold, lift: 2.4 },
          { d: circlePath(9, 19.5, 4.6), m: M.gold, lift: 1.1 },
          { d: circlePath(55, 19.5, 4.6), m: M.gold, lift: 1.1 },
          { d: circlePath(32, 9.5, 5), m: M.gold, lift: 1.1 },
        ]}
      />
      <Stack
        c={c}
        k="g"
        shadow={false}
        parts={[
          { d: roundedPolygonPath([[32, 25.5], [37.2, 32.2], [32, 38.9], [26.8, 32.2]], 1.4), m: M.ruby, lift: 1 },
          { d: ellipsePath(32, 48.8, 5, 4.2), m: M.ruby, lift: 1 },
          { d: circlePath(19.5, 48.8, 3), m: M.sapphire, lift: 0.8 },
          { d: circlePath(44.5, 48.8, 3), m: M.emerald, lift: 0.8 },
        ]}
      />
      <Glint x={30.4} y={29.6} rx={1.3} ry={1.3} rot={0} />
      <Glint x={30.2} y={47} rx={1.6} ry={1} rot={-20} />
      <Glint x={15.5} y={31} rx={1.4} ry={4.2} rot={-38} o={0.8} />
      <Glint x={7.8} y={18.2} rx={1.3} ry={1.3} rot={0} o={0.85} />
      <Glint x={30.6} y={8} rx={1.4} ry={1.4} rot={0} o={0.85} />
    </>
  ),

  gem: (c) => {
    const sil = roundedPolygonPath([[7, 23], [19, 9], [45, 9], [57, 23], [32, 57]], 2.2);
    return (
      <>
        <Stack c={c} parts={[{ d: sil, m: M.violet }]} />
        <Defs>
          <ClipPath id={c.id('gc')}>
            <Path d={sil} />
          </ClipPath>
          {vgrad(c.id('gt'), ['#FBF3FF', '#DDBDFF'])}
        </Defs>
        <G clipPath={c.url('gc')}>
          <Path d={poly([[5, 23], [19, 7], [22, 23]])} fill="#C994FF" />
          <Path d={poly([[19, 7], [45, 7], [42, 23], [22, 23]])} fill={c.url('gt')} />
          <Path d={poly([[45, 7], [59, 23], [42, 23]])} fill="#9C5CF0" />
          <Path d={poly([[5, 23], [22, 23], [32, 59]])} fill="#B27BFF" />
          <Path d={poly([[22, 23], [42, 23], [32, 59]])} fill="#8E4BEA" />
          <Path d={poly([[42, 23], [59, 23], [32, 59]])} fill="#6A2FCF" />
          <Path
            d="M7 23 H57 M22 23 L32 57 L42 23 M19 9 L22 23 M45 9 L42 23"
            stroke="#F3E6FF"
            strokeWidth={1.2}
            opacity={0.55}
            fill="none"
          />
        </G>
        <Path d={sil} fill="none" stroke={M.violet.line} strokeWidth={2} strokeLinejoin="round" />
        <Path d={sparklePath(21, 15.5, 5.6, 0.16)} fill="#FFFFFF" />
        <Glint x={26.6} y={33} rx={1.5} ry={4.4} rot={-18} o={0.5} />
      </>
    );
  },

  medal1: (c) => medal(c, M.gold, tone.red, 1),
  medal2: (c) => medal(c, M.silver, tone.blue, 2),
  medal3: (c) => medal(c, M.bronze, tone.green, 3),

  crate: (c) => (
    <>
      <Stack
        c={c}
        parts={[{ d: roundRectPath(7, 8, 50, 49, 4), m: M.wood, lift: 3, sheen: ellipsePath(24, 10, 26, 6) }]}
      />
      <Defs>
        {vgrad(c.id('cp'), ['#8E4C1E', '#B86B30'])}
        {vgrad(c.id('cb'), [M.wood.top, M.wood.base])}
      </Defs>
      <Path d={roundRectPath(14.5, 14.5, 35, 33, 2.2)} fill={c.url('cp')} stroke={M.wood.line} strokeWidth={1.8} />
      <Path d="M14.5 25.5 H49.5 M14.5 36.5 H49.5" stroke={M.wood.line} strokeWidth={1.4} opacity={0.5} />
      <Path
        d={roundedPolygonPath([[14.5, 41], [42, 14.5], [49.5, 14.5], [49.5, 21], [22, 47.5], [14.5, 47.5]], 1.2)}
        fill={c.url('cb')}
        stroke={M.wood.line}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      {[
        [11, 11.5],
        [53, 11.5],
        [11, 50.5],
        [53, 50.5],
      ].map(([x, y]) => (
        <Circle key={`${x},${y}`} cx={x} cy={y} r={1.7} fill={M.wood.line} />
      ))}
      <Glint x={22} y={10.6} rx={4} ry={1.2} rot={0} o={0.7} />
    </>
  ),

  calendar: (c) => (
    <>
      <Stack
        c={c}
        parts={[
          { d: roundRectPath(8, 11, 48, 46, 6.5), m: M.paper, lift: 2.6 },
          {
            d: 'M8 25.5 V17.5 A6.5 6.5 0 0 1 14.5 11 H49.5 A6.5 6.5 0 0 1 56 17.5 V25.5 Z',
            m: M.red,
            inner: true,
            lift: 1.4,
            sheen: ellipsePath(28, 12, 22, 5),
          },
          { d: 'M22 6.5 V15.5', m: M.steel, w: 4.4 },
          { d: 'M42 6.5 V15.5', m: M.steel, w: 4.4 },
        ]}
      />
      {[
        [14.5, 30],
        [27.25, 30],
        [40, 30],
        [14.5, 42],
        [27.25, 42],
      ].map(([x, y]) => (
        <Path key={`${x},${y}`} d={roundRectPath(x, y, 9.5, 8.5, 2.2)} fill="#D3E0EC" />
      ))}
      <Path d={roundRectPath(40, 42, 9.5, 8.5, 2.2)} fill={tone.red.bottom} stroke={tone.red.outline} strokeWidth={1.2} />
      <Glint x={42.6} y={44} rx={1.6} ry={0.9} rot={0} o={0.85} />
    </>
  ),

  book: (c) => (
    <>
      <Stack
        c={c}
        parts={[
          { d: roundRectPath(15, 10, 40, 46, 4), m: M.cream },
          { d: roundRectPath(9, 5, 41, 47, 5), m: M.blue, lift: 2.4, sheen: ellipsePath(30, 8, 24, 8) },
          { d: roundedPolygonPath([[37, 50], [44, 50], [44, 59.5], [40.5, 56.5], [37, 59.5]], 0.8), m: M.pink },
        ]}
      />
      <Path d="M52.2 14 V52.5 M54 16 V54" stroke={M.cream.deep} strokeWidth={1.1} />
      <Path d="M17.5 7.5 V49" stroke={M.blue.line} strokeWidth={1.8} opacity={0.55} />
      <Path d="M13 9 V47" stroke="#BFE3FF" strokeWidth={2} strokeLinecap="round" opacity={0.6} />
      <Defs>{vgrad(c.id('bl'), [M.gold.top, M.gold.base])}</Defs>
      <Path d={roundRectPath(23.5, 13.5, 20, 10, 2.6)} fill={c.url('bl')} stroke={M.gold.line} strokeWidth={1.6} />
      <Path d="M27.5 18.5 H39.5" stroke={M.gold.deep} strokeWidth={1.6} strokeLinecap="round" />
      <Glint x={42.4} y={9.4} rx={3.2} ry={1.3} rot={-8} o={0.8} />
    </>
  ),

  hand: (c) => (
    <G transform="rotate(-14 32 40)">
      <Stack
        c={c}
        parts={[
          { d: roundRectPath(21.5, 50.5, 25, 9.5, 3.6), m: M.cuff, lift: 1.6 },
          { d: roundRectPath(19.5, 27, 29, 27, 9), m: M.skin, lift: 2 },
          { d: roundRectPath(35, 26.5, 15, 9.4, 4.7), m: M.skin, lift: 1.2 },
          { d: roundRectPath(35.5, 35, 14.5, 9.2, 4.6), m: M.skin, lift: 1.2 },
          { d: roundRectPath(35, 43, 13, 8.6, 4.3), m: M.skin, lift: 1.2 },
          { d: roundRectPath(25.5, 4, 11, 33, 5.5), m: M.skin, lift: 1.4, sheen: ellipsePath(28, 12, 4, 10) },
          { d: roundedPolygonPath(rectPoints(23.5, 41, 9.6, 19, -38), 4.6), m: M.skin, lift: 1.2 },
        ]}
      />
      <Path d={roundRectPath(28, 6.6, 6, 6.6, 3)} fill="#FFEFE2" opacity={0.95} />
      <Glint x={28.4} y={21} rx={1.3} ry={4.6} rot={0} o={0.6} />
    </G>
  ),

  scales,

  target: (c) => {
    const cy = 32.6;
    return (
      <>
        <Stack c={c} parts={[{ d: circlePath(30, 34, 24.5), m: M.red, lift: 2.8 }]} />
        <Defs>
          {vgrad(c.id('tw'), ['#FFFFFF', '#E3EAF2'])}
          {vgrad(c.id('tr'), [M.red.top, M.red.base])}
        </Defs>
        <Circle cx={30} cy={cy} r={18.4} fill={c.url('tw')} stroke={M.red.line} strokeWidth={1.4} />
        <Circle cx={30} cy={cy} r={12.4} fill={c.url('tr')} stroke={M.red.line} strokeWidth={1.4} />
        <Circle cx={30} cy={cy} r={6.6} fill={c.url('tw')} stroke={M.red.line} strokeWidth={1.4} />
        <Circle cx={30} cy={cy} r={2.6} fill={M.red.base} />
        <Path d="M31 31.6 L48.6 14" stroke="#5A2A00" strokeWidth={5.6} strokeLinecap="round" />
        <Path d="M31 31.6 L48.6 14" stroke="#F2D9A8" strokeWidth={2.6} strokeLinecap="round" />
        <Path
          d={roundedPolygonPath([[46, 16.6], [46.6, 6.4], [51.6, 10.8]], 1)}
          fill={tone.green.bottom}
          stroke={tone.green.outline}
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
        <Path
          d={roundedPolygonPath([[46, 16.6], [56.4, 16], [51.8, 11]], 1)}
          fill={tone.green.top}
          stroke={tone.green.outline}
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
        <Glint x={15} y={21.5} rx={3.8} ry={1.8} rot={-48} />
      </>
    );
  },

  snowflake,

  letters: (c) => (
    <>
      <Stack
        c={c}
        parts={[{ d: roundRectPath(6.5, 7, 51, 50, 10), m: M.cream, lift: 4.2, sheen: ellipsePath(26, 9, 26, 8) }]}
      />
      <Path
        d="M13.8 43 L21.8 19.5 L29.8 43 M17 35 H26.6"
        fill="none"
        stroke={palette.ink}
        strokeWidth={5.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d={`M36.8 17.5 V43 ${circlePath(43.4, 36.6, 6.4)}`}
        fill="none"
        stroke={palette.ink}
        strokeWidth={5.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Glint x={14.5} y={12.5} rx={3.6} ry={1.5} rot={-18} o={0.85} />
    </>
  ),
};
