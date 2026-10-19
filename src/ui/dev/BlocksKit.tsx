import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BlockDigits } from '../components/BlockDigits';
import { BlockLogo } from '../components/BlockLogo';
import { BlockTile, type BlockTileState } from '../components/BlockTile';
import { ComboBanner, ScoreBurst } from '../components/ScoreBurst';
import { SkyBackground } from '../components/SkyBackground';
import { cube, font, palette, tint, type CubeColor } from '../theme';

const COLORS = Object.keys(cube) as CubeColor[];

const CODE: Readonly<Record<string, CubeColor>> = {
  r: 'red',
  o: 'orange',
  y: 'yellow',
  g: 'green',
  t: 'teal',
  b: 'blue',
  p: 'purple',
  k: 'pink',
};

/** 7×7: lowercase = studded cube, uppercase = letter tile, '.' = empty cell. */
const BOARD = ['oo.bbgg', 'yobb.gt', 'yyppptt', 'WORDKRU', 'rrkkSHg', 'r.kbbgg', 'ppobb..'];
const SELECTED = new Set(['3,0', '3,1', '3,2', '3,3']);

/** Block primitives and backdrops preview. `?kit=blocks`. */
export function BlocksKit() {
  return (
    <View style={styles.root}>
      <Block title="Cubes — every cube colour, studded">
        <View style={styles.wrap}>
          {COLORS.map((c) => (
            <Labelled key={c} label={c}>
              <BlockTile size={44} color={c} />
            </Labelled>
          ))}
        </View>
        <View style={styles.wrap}>
          {(['red', 'yellow', 'green', 'blue', 'purple'] as const).map((c) => (
            <BlockTile key={c} size={64} color={c} />
          ))}
        </View>
      </Block>

      <Block title="Letter tiles — cream (navy ink) and coloured (white, outlined)">
        <View style={styles.wrap}>
          {'ABCDEFGHIJKLMN'.split('').map((l) => (
            <BlockTile key={l} size={44} letter={l} />
          ))}
        </View>
        <View style={styles.wrap}>
          {'WORDKRUSH!'.split('').map((l, i) => (
            <BlockTile key={`${l}${i}`} size={44} letter={l} color={COLORS[i % 8]} />
          ))}
          <BlockTile size={44} letter="Qu" color="teal" />
          <BlockTile size={44} letter="Qu" />
        </View>
      </Block>

      <Block title="States — normal, selected, dim, empty">
        <View style={styles.wrapFrame}>
          {(['normal', 'selected', 'dim', 'empty'] as BlockTileState[]).map((s) => (
            <Labelled key={s} label={s} dark>
              <BlockTile size={52} letter="K" state={s} color="blue" />
            </Labelled>
          ))}
          {(['normal', 'selected', 'dim', 'empty'] as BlockTileState[]).map((s) => (
            <Labelled key={`${s}-stud`} label={s} dark>
              <BlockTile size={52} state={s} color="purple" />
            </Labelled>
          ))}
        </View>
      </Block>

      <Block title="Board — 7×7 on the cyan frame">
        <MiniBoard cell={44} />
      </Block>

      <Block title="Logo — hero (drops in) and compact">
        <Replayable>
          {(run) => (
            <View style={styles.heroBox}>
              <SkyBackground />
              <BlockLogo key={run} animate />
            </View>
          )}
        </Replayable>
        <View style={styles.topBar}>
          <BlockLogo size="compact" />
        </View>
        <View style={[styles.topBar, styles.topBarStacked]}>
          <BlockLogo size={26} layout="stacked" />
        </View>
      </Block>

      <Block title="Level digits — 1 / 18 / 245">
        <View style={styles.levels}>
          <BlockDigits value={1} cell={9} color="pink" />
          <BlockDigits value={18} cell={9} color="red" />
          <BlockDigits value={245} cell={9} color="orange" />
        </View>
        <View style={styles.levels}>
          <BlockDigits value={3} cell={12} color="yellow" />
          <BlockDigits value={185} cell={12} color="red" />
        </View>
      </Block>

      <Block title="Backdrops — sky (menus) and play (gameplay)">
        <View style={styles.backdropBox}>
          <SkyBackground variant="sky" />
          <Text style={styles.backdropLabel}>sky</Text>
        </View>
        <View style={styles.backdropBox}>
          <SkyBackground variant="play" />
          <Text style={styles.backdropLabel}>play</Text>
        </View>
      </Block>

      <Block title="Bursts — ScoreBurst +100 / +400 and ComboBanner (loops)">
        <BurstStage />
      </Block>
    </View>
  );
}

function MiniBoard({ cell }: { cell: number }) {
  const gap = 3;
  return (
    <View style={styles.frame}>
      {BOARD.map((row, y) => (
        <View key={y} style={[styles.boardRow, { gap, marginTop: y === 0 ? 0 : gap }]}>
          {row.split('').map((ch, x) => {
            const key = `${y},${x}`;
            if (ch === '.') return <BlockTile key={key} size={cell} state="empty" />;
            const color = CODE[ch];
            if (color) return <BlockTile key={key} size={cell} color={color} />;
            return (
              <BlockTile
                key={key}
                size={cell}
                letter={ch}
                state={SELECTED.has(key) ? 'selected' : 'normal'}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

/** Replays its child on a loop (new key each run) and on tap. */
function Replayable({ children, everyMs = 0 }: { children: (run: number) => ReactNode; everyMs?: number }) {
  const [run, setRun] = useState(0);
  useEffect(() => {
    if (!everyMs) return;
    const id = setInterval(() => setRun((n) => n + 1), everyMs);
    return () => clearInterval(id);
  }, [everyMs]);
  return (
    <View>
      {children(run)}
      <Pressable accessibilityRole="button" onPress={() => setRun((n) => n + 1)} style={styles.replay}>
        <Text style={styles.replayText}>Replay</Text>
      </Pressable>
    </View>
  );
}

function BurstStage() {
  const [run, setRun] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setRun((n) => n + 1), 2600);
    return () => clearInterval(id);
  }, []);
  return (
    <View>
      <View style={styles.burstBox}>
        <SkyBackground variant="play" />
        <View style={styles.burstBoard}>
          <MiniBoard cell={30} />
          <ScoreBurst key={`a${run}`} text="+100" style={{ position: 'absolute', left: 70, top: 70 }} />
          <ScoreBurst key={`b${run}`} text="+100" style={{ position: 'absolute', left: 190, top: 150 }} />
          <ScoreBurst key={`c${run}`} text="+400" big style={{ position: 'absolute', left: 130, top: 110 }} />
        </View>
      </View>
      <View style={styles.burstBox}>
        <SkyBackground variant="play" />
        <View style={styles.burstBoard}>
          <MiniBoard cell={30} />
          <ComboBanner key={`d${run}`} text={run % 3 === 0 ? 'GREAT!' : run % 3 === 1 ? 'AMAZING!' : 'KRUSH!'} />
        </View>
      </View>
      <Pressable accessibilityRole="button" onPress={() => setRun((n) => n + 1)} style={styles.replay}>
        <Text style={styles.replayText}>Replay</Text>
      </Pressable>
    </View>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.block}>
      <Text style={styles.title}>{title}</Text>
      {children}
    </View>
  );
}

function Labelled({ label, children, dark = false }: { label: string; children: ReactNode; dark?: boolean }) {
  return (
    <View style={styles.labelled}>
      {children}
      <Text style={[styles.caption, dark && styles.captionDark]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 22 },
  block: { gap: 10 },
  title: { fontFamily: font.heavy, fontSize: 13, color: palette.white },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    padding: 8,
    backgroundColor: palette.frame,
    borderRadius: 14,
  },
  wrapFrame: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    padding: 12,
    backgroundColor: palette.creamFill,
    borderRadius: 14,
  },
  labelled: { alignItems: 'center', gap: 4 },
  caption: { fontFamily: font.body, fontSize: 11, color: palette.white },
  captionDark: { color: palette.ink },
  frame: {
    alignSelf: 'center',
    padding: 7,
    borderRadius: 16,
    backgroundColor: palette.frame,
    borderWidth: 2,
    borderColor: palette.frameDeep,
    borderTopColor: tint(palette.frame, 0.45),
  },
  boardRow: { flexDirection: 'row' },
  heroBox: {
    height: 230,
    borderRadius: 18,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    height: 52,
    borderRadius: 16,
    backgroundColor: palette.coralBottom,
    borderWidth: 3,
    borderColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarStacked: { height: 84 },
  levels: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 22,
    padding: 14,
    borderRadius: 14,
    backgroundColor: palette.creamFill,
  },
  backdropBox: {
    width: '100%',
    maxWidth: 390,
    height: 260,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: palette.white,
  },
  backdropLabel: {
    position: 'absolute',
    left: 12,
    top: 10,
    fontFamily: font.heavy,
    fontSize: 12,
    color: palette.white,
  },
  burstBox: {
    height: 300,
    marginBottom: 10,
    borderRadius: 18,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  burstBoard: { alignItems: 'center', justifyContent: 'center' },
  replay: {
    alignSelf: 'center',
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: palette.green,
  },
  replayText: { fontFamily: font.heavy, fontSize: 13, color: palette.white },
});
