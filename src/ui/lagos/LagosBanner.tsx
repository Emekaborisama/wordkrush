import { StyleSheet, Text, View } from 'react-native';
import { Badge, Button, GameIcon, PanelText, PopupModal, PressableScale } from '../components';
import { font, palette, shadow, space, tone } from '../theme';
import { DanfoBus } from './DanfoBus';
import { danfo, lagosCopy } from './danfoTheme';

/**
 * Shown once to a returning player so they know I Sabi Lagos exists: the
 * danfo, what it is, and two ways out.
 */
export function LagosAnnouncement({
  visible,
  onEnter,
  onLater,
}: {
  visible: boolean;
  onEnter: () => void;
  onLater: () => void;
}) {
  return (
    <PopupModal
      visible={visible}
      onClose={onLater}
      title="NEW!"
      ribbon="banner"
      ribbonColor={danfo.sign}
      footer={
        <>
          <Button
            title={lagosCopy.enter}
            tone="danfo"
            size="lg"
            leading={<GameIcon name="play" size={24} color={tone.danfo.outline} />}
            onPress={onEnter}
          />
          <Button title="Later" tone="sky" size="sm" onPress={onLater} />
        </>
      }
    >
      <View style={styles.hero}>
        <DanfoBus width={220} destination="ISABI LAGOS" driving />
      </View>
      <PanelText variant="heading">I Sabi Lagos don land!</PanelText>
      <PanelText>
        Higher or Lower, Lagos edition. Places, food, Afrobeats, Nollywood, Naija football and the wild Lagos stories — how much you sabi?
      </PanelText>
    </PopupModal>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    borderWidth: 3,
    borderColor: danfo.black,
    backgroundColor: danfo.yellow,
    padding: space.sm,
    paddingTop: space.md,
    overflow: 'hidden',
    ...shadow.card,
  },
  stripes: { position: 'absolute', left: 0, right: 0, bottom: 40, gap: 4 },
  stripe: { height: 7, backgroundColor: danfo.black, opacity: 0.85 },
  stripeThin: { height: 3 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  title: { fontFamily: font.black, fontSize: 24, lineHeight: 28, color: danfo.black },
  subtitle: { fontFamily: font.heavy, fontSize: 13, lineHeight: 17, color: danfo.black },
  cta: {
    marginTop: space.sm,
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    minHeight: 34,
    borderRadius: 17,
    backgroundColor: danfo.black,
  },
  ctaText: { fontFamily: font.black, fontSize: 15, color: palette.white },
  hero: { alignItems: 'center', paddingVertical: space.xs },
});
