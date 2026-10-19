import { useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { font, palette, space, theme } from '../theme';

/**
 * RN-web's TextInput reset is `font: 14px System`. The `font` shorthand
 * discards a sibling `fontFamily` longhand. Native uses `fontFamily` on
 * `styles.input` (D-030).
 *
 * Chrome/Safari `:focus-visible` uses an `outline` shorthand whose
 * specificity beats RN-web's atomic `outlineWidth` class — that is the
 * sharp rectangle inside the rounded shell (orange, then white). A real
 * stylesheet rule with !important is the thing that wins.
 */
const WEB_INPUT_RESET_ID = 'wk-textfield-ua-reset';

type WebStyleSheet = {
  id: string;
  textContent: string;
};

type WebDoc = {
  getElementById(id: string): WebStyleSheet | null;
  createElement(tag: 'style'): WebStyleSheet;
  head: { appendChild(node: WebStyleSheet): void };
};

function ensureWebInputReset() {
  if (Platform.OS !== 'web') return;
  const doc = (globalThis as { document?: WebDoc }).document;
  if (!doc || doc.getElementById(WEB_INPUT_RESET_ID)) return;
  const style = doc.createElement('style');
  style.id = WEB_INPUT_RESET_ID;
  style.textContent =
    'input:focus,input:focus-visible,textarea:focus,textarea:focus-visible{outline:none!important;box-shadow:none!important;border:none!important}';
  doc.head.appendChild(style);
}

const webInputStyle: StyleProp<TextStyle> =
  Platform.OS === 'web'
    ? ({
        font: `17px ${font.heavy}`,
        outlineWidth: 0,
        outlineColor: 'transparent',
        borderWidth: 0,
      } as TextStyle)
    : null;

type Props = Omit<TextInputProps, 'style'> & {
  label?: string;
  /** Label ink: white (outlined) on a coral panel or the sky, navy on cream. */
  labelTone?: 'light' | 'dark';
  error?: string;
  accent?: string;
  trailing?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
};

export function TextField({
  label,
  labelTone = 'light',
  error,
  accent = theme.accent,
  trailing,
  containerStyle,
  inputStyle,
  onFocus,
  onBlur,
  accessibilityLabel,
  ...props
}: Props) {
  ensureWebInputReset();
  const [focused, setFocused] = useState(false);
  const borderColor = error ? palette.red : focused ? palette.teal : palette.creamEdge;

  return (
    <View style={[styles.root, containerStyle]}>
      {label ? <Text style={[styles.label, labelTone === 'dark' && styles.labelDark]}>{label}</Text> : null}
      <View
        style={[
          styles.shell,
          { borderColor, backgroundColor: focused ? palette.white : palette.creamFill },
        ]}
      >
        <TextInput
          {...props}
          accessibilityLabel={accessibilityLabel ?? label ?? props.placeholder}
          placeholderTextColor={palette.inkSoft}
          selectionColor={accent === theme.accent ? palette.teal : accent}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[styles.input, webInputStyle, inputStyle]}
        />
        {trailing}
      </View>
      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.xs },
  label: {
    fontFamily: font.heavy,
    fontSize: 13,
    lineHeight: 17,
    color: palette.white,
    paddingLeft: 4,
    textShadowColor: palette.coralEdge,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  labelDark: { color: palette.inkSoft, textShadowRadius: 0 },
  shell: {
    minHeight: 52,
    borderWidth: 2.5,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.md,
  },
  input: {
    flex: 1,
    minHeight: 48,
    color: palette.ink,
    // TextInput does not inherit type from surrounding Text. Without an
    // explicit face the UA stylesheet (system sans) wins — D-030.
    fontFamily: font.heavy,
    fontSize: 17,
    paddingVertical: 0,
  },
  error: {
    fontFamily: font.heavy,
    fontSize: 13,
    lineHeight: 18,
    color: palette.white,
    paddingLeft: 4,
    textShadowColor: palette.redDeep,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
