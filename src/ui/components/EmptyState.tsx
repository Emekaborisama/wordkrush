import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { font, palette, shadow, space } from '../theme';
import { Button } from './Button';
import { CreamBox } from './CreamBox';

type Props = {
  title: string;
  body: string;
  art?: ReactNode;
  /** Kept so existing call sites compile; actions use the kit's blue. */
  accent?: string;
  actionLabel?: string;
  onAction?: () => void;
};

/**
 * Nothing-here-yet card: art in a white-rimmed tile riding the top of a
 * cream box, navy title and copy, an optional blue action.
 */
export function EmptyState({ title, body, art, actionLabel, onAction }: Props) {
  return (
    <View style={styles.root}>
      {art ? <View style={styles.art}>{art}</View> : null}
      <CreamBox style={[styles.box, art ? styles.withArt : null]}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
        {actionLabel && onAction ? (
          <Button title={actionLabel} onPress={onAction} tone="blue" size="sm" fullWidth={false} style={styles.action} />
        ) : null}
      </CreamBox>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', alignSelf: 'stretch', paddingVertical: space.md },
  art: {
    width: 76,
    height: 76,
    borderRadius: 20,
    borderWidth: 4,
    borderColor: palette.white,
    backgroundColor: palette.creamFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    marginBottom: -30,
    ...shadow.card,
  },
  box: { alignSelf: 'stretch', alignItems: 'center', paddingVertical: space.lg },
  withArt: { paddingTop: 40 },
  title: { fontFamily: font.black, fontSize: 22, lineHeight: 27, color: palette.ink, textAlign: 'center' },
  body: {
    fontFamily: font.body,
    fontSize: 15,
    lineHeight: 21,
    color: palette.inkSoft,
    textAlign: 'center',
    marginTop: space.xs,
    maxWidth: 320,
  },
  action: { marginTop: space.md },
});
