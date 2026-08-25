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
import { font, radius, space, theme, type, withAlpha } from '../theme';

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
        font: `600 16px ${font.semibold}`,
        outlineWidth: 0,
        outlineColor: 'transparent',
        borderWidth: 0,
      } as TextStyle)
    : null;

type Props = Omit<TextInputProps, 'style'> & {
  label?: string;
  error?: string;
  accent?: string;
  trailing?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
};

export function TextField({
  label,
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
  const borderColor = error ? theme.danger : focused ? accent : theme.border;

  return (
    <View style={[styles.root, containerStyle]}>
      {label ? <Text style={[type.overline, styles.label]}>{label}</Text> : null}
      <View
        style={[
          styles.shell,
          {
            borderColor,
            backgroundColor: focused ? withAlpha(accent, 0.08) : theme.bgElevated,
          },
        ]}
      >
        <TextInput
          {...props}
          accessibilityLabel={accessibilityLabel ?? label ?? props.placeholder}
          placeholderTextColor={theme.textDim}
          selectionColor={accent}
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
  label: { color: theme.textMuted, paddingLeft: 2 },
  shell: {
    minHeight: 54,
    borderWidth: 1,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.md,
  },
  input: {
    flex: 1,
    minHeight: 52,
    color: theme.text,
    // TextInput does not inherit type from surrounding Text. Without an
    // explicit face the UA stylesheet (system sans) wins — D-030.
    fontFamily: font.semibold,
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 0,
  },
  error: { ...type.caption, color: theme.danger, paddingLeft: 2 },
});
