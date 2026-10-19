import { StyleSheet, View } from 'react-native';
import { GoldText } from '../components/BlockLogo';
import { StrokeText } from '../components/StrokeText';
import { danfo } from './danfoTheme';

/**
 * "I SABI / LAGOS!": white outlined lettering over chunky danfo-yellow
 * letters with a black keyline — the WORD KRUSH! logo's treatment, in the
 * colours of a Lagos bus.
 */
export function LagosWordmark({ size = 48 }: { size?: number }) {
  return (
    <View style={styles.wrap} accessible accessibilityRole="header" accessibilityLabel="I Sabi Lagos">
      <StrokeText size={Math.round(size * 0.55)} stroke={danfo.black} strokeWidth={3} depth={3}>
        I SABI
      </StrokeText>
      <GoldText
        text="LAGOS!"
        size={size}
        colors={[danfo.yellowTop, danfo.yellow, danfo.yellow, danfo.yellowDeep]}
        extrude={['#B57A00', '#7D5300']}
        outline={danfo.black}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', marginTop: -4 },
});
