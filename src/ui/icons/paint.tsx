import type { ReactElement } from 'react';
import { ClipPath, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

/**
 * What a drawing gets from its `GameIcon`. Every gradient and clip id is a
 * suffix on one `useSvgId`, so many icons on a screen never share an id.
 */
export type IconCtx = {
  id: (key: string) => string;
  url: (key: string) => string;
  /** Glyph outline colour: the `color` prop, navy ink by default. */
  ink: string;
};

export type IconDraw = (c: IconCtx) => ReactElement;

/** One glossy material: face top, saturated foot, darker rim, outline. */
export type Mat = { top: string; base: string; deep: string; line: string };

/** Contact shadow under art icons: the theme's shadow navy, not black. */
export const SHADOW = '#0B2A5C';
/** Outer outline stroke. Half of it (2.5 of 64) shows outside the shape. */
const EDGE = 5;
/** Keyline on every part, so overlapping parts stay separate. */
const KEY = 2;

/**
 * Vertical gradient, first colour on top. Spans each shape's own box unless
 * `user` gives absolute y ends (needed for strokes of straight lines, whose
 * box has no height and would drop an object-box gradient).
 */
export function vgrad(id: string, colors: readonly string[], user?: readonly [number, number]): ReactElement {
  const last = Math.max(1, colors.length - 1);
  return (
    <LinearGradient
      key={id}
      id={id}
      x1="0"
      x2="0"
      y1={user ? user[0] : 0}
      y2={user ? user[1] : 1}
      gradientUnits={user ? 'userSpaceOnUse' : 'objectBoundingBox'}
    >
      {colors.map((color, i) => (
        <Stop key={`${color}${i}`} offset={i / last} stopColor={color} />
      ))}
    </LinearGradient>
  );
}

/** Ball shading lit from the top left (bomb, bulb glass). */
function ballGrad(id: string, m: Mat): ReactElement {
  return (
    <RadialGradient key={id} id={id} cx="0.4" cy="0.34" r="0.72" fx="0.34" fy="0.26">
      <Stop offset={0} stopColor={m.top} />
      <Stop offset={0.55} stopColor={m.base} />
      <Stop offset={1} stopColor={m.deep} />
    </RadialGradient>
  );
}

export type Part = {
  d: string;
  m: Mat;
  /**
   * How far the light face rides up off the darker rim, the kit's bevelled
   * foot. 0 paints one flat light-to-saturated gradient.
   */
  lift?: number;
  /** Cut the inner subpaths out (gear hole). */
  holes?: boolean;
  /** Draw `d` as a round-capped line this wide (handles, fuse, legs). */
  w?: number;
  /** Translucent white shape over the face, clipped to it: the candy gloss. */
  sheen?: string;
  /** SVG transform for the whole part. */
  t?: string;
  /** No outer outline or shadow: a detail sitting inside another part. */
  inner?: boolean;
  /** Ball shading instead of the lifted face. */
  ball?: boolean;
};

function fillRule(p: Part): 'evenodd' | 'nonzero' {
  return p.holes ? 'evenodd' : 'nonzero';
}

function Silhouette({ p, color }: { p: Part; color: string }) {
  return p.w ? (
    <Path
      d={p.d}
      fill="none"
      stroke={color}
      strokeWidth={p.w + EDGE}
      strokeLinecap="round"
      strokeLinejoin="round"
      transform={p.t}
    />
  ) : (
    <Path
      d={p.d}
      fill={color}
      fillRule={fillRule(p)}
      stroke={color}
      strokeWidth={EDGE}
      strokeLinejoin="round"
      transform={p.t}
    />
  );
}

/**
 * Paints parts the way the kit's icon row is painted: a soft contact shadow,
 * one chunky outline round the whole silhouette, then each part in order as a
 * saturated rim with a lighter face lifted off it, a gloss sheen, and a
 * keyline. `k` keeps ids apart when one icon uses two stacks.
 */
export function Stack({
  c,
  parts,
  k = 's',
  shadow = true,
}: {
  c: IconCtx;
  parts: readonly Part[];
  k?: string;
  shadow?: boolean;
}) {
  const mats: Mat[] = [];
  for (const p of parts) if (!mats.includes(p.m)) mats.push(p.m);
  const mi = (m: Mat) => mats.indexOf(m);
  const uses = (m: Mat, test: (p: Part) => boolean) => parts.some((p) => p.m === m && test(p));
  const outer = parts.filter((p) => !p.inner);
  return (
    <>
      <Defs>
        {mats.flatMap((m, i) => [
          uses(m, (p) => !p.w && !p.ball) ? vgrad(c.id(`${k}f${i}`), [m.top, m.base]) : null,
          uses(m, (p) => !p.w && !p.ball && !!p.lift) ? vgrad(c.id(`${k}r${i}`), [m.base, m.deep]) : null,
          uses(m, (p) => !!p.ball) ? ballGrad(c.id(`${k}b${i}`), m) : null,
        ])}
        {parts.map((p, i) =>
          !p.w && (p.lift || p.sheen) ? (
            <ClipPath key={`c${i}`} id={c.id(`${k}c${i}`)}>
              <Path d={p.d} clipRule={fillRule(p)} />
            </ClipPath>
          ) : null,
        )}
      </Defs>
      {shadow ? (
        <G opacity={0.3} transform="translate(0.6 2.4)">
          {outer.map((p, i) => (
            <Silhouette key={i} p={p} color={SHADOW} />
          ))}
        </G>
      ) : null}
      {outer.map((p, i) => (
        <Silhouette key={i} p={p} color={p.m.line} />
      ))}
      {parts.map((p, i) => (
        <G key={i} transform={p.t}>
          {p.w ? (
            <>
              <Path d={p.d} fill="none" stroke={p.m.base} strokeWidth={p.w} strokeLinecap="round" strokeLinejoin="round" />
              {p.w >= 3 ? (
                <Path
                  d={p.d}
                  fill="none"
                  stroke={p.m.top}
                  strokeWidth={p.w * 0.36}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  transform={`translate(${-p.w * 0.12} ${-p.w * 0.16})`}
                />
              ) : null}
            </>
          ) : (
            <>
              <Path
                d={p.d}
                fillRule={fillRule(p)}
                fill={c.url(`${k}${p.ball ? 'b' : p.lift ? 'r' : 'f'}${mi(p.m)}`)}
              />
              {p.lift || p.sheen ? (
                <G clipPath={c.url(`${k}c${i}`)}>
                  {p.lift && !p.ball ? (
                    <Path
                      d={p.d}
                      fillRule={fillRule(p)}
                      fill={c.url(`${k}f${mi(p.m)}`)}
                      transform={`translate(0 ${-p.lift})`}
                    />
                  ) : null}
                  {p.sheen ? <Path d={p.sheen} fill="#FFFFFF" opacity={0.3} /> : null}
                </G>
              ) : null}
              <Path d={p.d} fill="none" stroke={p.m.line} strokeWidth={KEY} strokeLinejoin="round" />
            </>
          )}
        </G>
      ))}
    </>
  );
}

/** A crisp white glint, turned `rot` degrees. */
export function Glint({
  x,
  y,
  rx,
  ry,
  rot = -38,
  o = 0.92,
}: {
  x: number;
  y: number;
  rx: number;
  ry: number;
  rot?: number;
  o?: number;
}) {
  return <Ellipse cx={x} cy={y} rx={rx} ry={ry} fill="#FFFFFF" opacity={o} transform={`rotate(${rot} ${x} ${y})`} />;
}
