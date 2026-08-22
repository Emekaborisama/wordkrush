import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { radius, space, theme, type, withAlpha } from '../theme';

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
          style={[styles.input, inputStyle]}
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
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 0,
  },
  error: { ...type.caption, color: theme.danger, paddingLeft: 2 },
});
