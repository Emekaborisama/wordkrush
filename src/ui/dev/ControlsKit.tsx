import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { CreamBox } from '../components/CreamBox';
import { HudPanel } from '../components/HudPanel';
import { Panel, PanelDivider, PanelText, CreamText, PopupModal } from '../components/Panel';
import { ResourcePill } from '../components/ResourcePill';
import { RibbonTitle } from '../components/RibbonTitle';
import { SquareButton } from '../components/SquareButton';
import { StarBar } from '../components/StarBar';
import { StarRibbon } from '../components/StarRibbon';
import { StarRow } from '../components/StarRow';
import { Toggle } from '../components/Toggle';
import { HowToPlay } from '../HowToPlay';
import { font, palette, space } from '../theme';

function Dot({ color }: { color: string }) {
  return <View style={[styles.dot, { backgroundColor: color }]} />;
}

/** Buttons, panels, HUD and reward controls preview. */
export function ControlsKit() {
  const [music, setMusic] = useState(false);
  const [sfx, setSfx] = useState(true);
  const [popup, setPopup] = useState(false);
  const [help, setHelp] = useState(false);
  const noop = () => {};
  return (
    <View style={styles.root}>
      <Panel title="Settings" onClose={noop}>
        <CreamBox>
          <View style={styles.settingRow}>
            <CreamText variant="teal">Music</CreamText>
            <Toggle value={music} onChange={setMusic} accessibilityLabel="Music" />
          </View>
          <View style={styles.settingRow}>
            <CreamText variant="teal">SFX</CreamText>
            <Toggle value={sfx} onChange={setSfx} accessibilityLabel="Sound effects" />
          </View>
        </CreamBox>
        <Button title="Connect" tone="blue" size="md" onPress={noop} />
        <View style={styles.pair}>
          <Button title="Terms" tone="green" size="md" style={styles.flex} onPress={noop} />
          <Button title="Privacy" tone="green" size="md" style={styles.flex} onPress={noop} />
        </View>
        <Button title="Contact us" tone="gold" size="md" onPress={noop} />
        <PanelText>User ID 999999999</PanelText>
      </Panel>

      <Panel title="LEVEL 2" onClose={noop}>
        <PanelText variant="heading">Bomb cells</PanelText>
        <PanelText>Blast bombs before they go off</PanelText>
        <PanelDivider />
        <StarRow earned={2} />
        <CreamBox>
          <CreamText variant="teal" style={styles.center}>
            Goal
          </CreamText>
          <CreamText variant="title" style={styles.center}>
            Streak of 10
          </CreamText>
        </CreamBox>
        <Button title="PLAY" tone="green" size="lg" onPress={() => setPopup(true)} />
      </Panel>

      <Panel title="More Lives?" ribbon="banner" onClose={noop}>
        <CreamBox>
          <CreamText style={styles.center}>To next life 29:59</CreamText>
        </CreamBox>
        <Button title="Buy Full" tone="green" size="md" onPress={noop} />
        <Button title="Extra life" tone="blue" size="md" onPress={noop} />
      </Panel>

      <Button title="How to play (popup)" tone="blue" size="md" onPress={() => setHelp(true)} />
      <HowToPlay
        visible={help}
        onClose={() => setHelp(false)}
        title="How to play More or Less"
        intro="Two things, one revealed number. Guess whether the hidden one is bigger or smaller."
        steps={[1, 2, 3, 4, 5, 6].map((n) => ({
          n,
          title: `Step ${n} title that is fairly long`,
          body: 'Get it right and the winner slides left to face a new challenger. One wrong answer ends the run.',
        }))}
      />

      <Text style={styles.label}>Buttons</Text>
      <Button title="Play" tone="gold" size="xl" onPress={noop} />
      {(['green', 'blue', 'red', 'purple', 'teal', 'coral', 'sky'] as const).map((t) => (
        <Button key={t} title={t} tone={t} size="md" onPress={noop} />
      ))}
      <Button title="Disabled" tone="green" size="md" disabled onPress={noop} />
      <Button title="Small" tone="blue" size="sm" fullWidth={false} onPress={noop} />

      <Text style={styles.label}>Tiles</Text>
      <View style={styles.wrapRow}>
        <SquareButton icon={<Dot color="#fff" />} accessibilityLabel="Joker" onPress={noop} price={50} caption="Joker" />
        <SquareButton icon={<Dot color="#fff" />} accessibilityLabel="Star" onPress={noop} tone="sky" badge={3} />
        <SquareButton icon={<Dot color="#7B3FD0" />} accessibilityLabel="Settings" onPress={noop} tone="gold" shape="circle" />
        <SquareButton icon={<Dot color="#fff" />} accessibilityLabel="Off" onPress={noop} disabled price={40} />
      </View>

      <Text style={styles.label}>Top bar</Text>
      <View style={styles.topBar}>
        <ResourcePill icon={<Dot color={palette.red} />} value={3} suffix="DAYS" accessibilityLabel="3 day streak" />
        <ResourcePill icon={<Dot color={palette.gold} />} value={1250} accessibilityLabel="1250 coins" />
      </View>

      <Text style={styles.label}>HUD</Text>
      <View style={styles.hud}>
        <HudPanel label="Moves" value={25} />
        <HudPanel label="Goal">
          <View style={styles.wrapRow}>
            <Dot color={palette.pink} />
            <Text style={styles.goal}>10</Text>
          </View>
        </HudPanel>
        <HudPanel label="Score" value={999999} />
      </View>
      <View style={styles.hud}>
        <HudPanel label="Moves" value={3} urgent />
      </View>
      <StarBar progress={0.72} label="72%" />

      <Text style={styles.label}>Ribbons and stars</Text>
      <RibbonTitle label="LEVEL 999" />
      <RibbonTitle label="NEW RECORD!" kind="banner" />
      <StarRibbon earned={3} />
      <StarRibbon earned={1} />

      <PopupModal visible={popup} onClose={() => setPopup(false)} title="Level completed">
        <StarRibbon earned={3} />
        <CreamBox>
          <CreamText variant="title" style={styles.center}>
            1000 pts
          </CreamText>
        </CreamBox>
        <Button title="Continue" tone="green" size="lg" onPress={() => setPopup(false)} />
      </PopupModal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.lg },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  pair: { flexDirection: 'row', gap: space.sm },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  label: { fontFamily: font.black, fontSize: 16, color: palette.white },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.md },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', padding: space.sm, backgroundColor: palette.coral, borderRadius: 18 },
  hud: { flexDirection: 'row', gap: space.sm },
  goal: { fontFamily: font.black, fontSize: 14, color: palette.ink },
  dot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: palette.ink },
});
