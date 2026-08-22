import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { captureAnalytics } from '../../analytics/client';
import { authErrorCategory } from '../../analytics/events';
import { signIn, signUp, type Profile } from '../../auth/auth';
import { validateEmail, validatePassword, validateUsername } from '../../auth/validation';
import {
  BrandArtwork,
  Button,
  FeedbackBanner,
  PressableScale,
  Surface,
  TextField,
} from '../components';
import { font, radius, space, theme, type } from '../theme';

type Mode = 'signin' | 'signup';

type Props = {
  onAuthed: (profile: Profile) => void;
  onSkip: () => void;
};

export function AuthScreen({ onAuthed, onSkip }: Props) {
  const [mode, setMode] = useState<Mode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isSignup = mode === 'signup';

  async function submit() {
    const next: Record<string, string | null> = {
      email: validateEmail(email),
      password: validatePassword(password),
      username: isSignup ? validateUsername(username) : null,
    };
    setErrors(next);
    setFormError(null);
    const analyticsMode = isSignup ? 'sign_up' : 'sign_in';
    if (Object.values(next).some(Boolean)) {
      captureAnalytics('auth_submitted', {
        mode: analyticsMode,
        validation_result: 'invalid',
      });
      return;
    }

    captureAnalytics('auth_submitted', {
      mode: analyticsMode,
      validation_result: 'valid',
    });

    setBusy(true);
    const result = isSignup
      ? await signUp(email, password, username)
      : await signIn(email, password);
    setBusy(false);

    if (result.ok) {
      onAuthed(result.profile);
      captureAnalytics('auth_succeeded', { mode: analyticsMode });
    } else {
      captureAnalytics('auth_failed', {
        mode: analyticsMode,
        error_category: authErrorCategory(result.error),
      });
      setFormError(result.error);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <BrandArtwork variant="lockup" size={168} />
          <Text style={styles.eyebrow}>OPTIONAL ACCOUNT</Text>
          <Text style={styles.title}>{isSignup ? 'Keep your scores with you' : 'Welcome back'}</Text>
          <Text style={styles.subtitle}>
            Scores already save offline on this device. Sign in to post your best
            run to the global board and keep an account across devices.
          </Text>
        </View>

        <Surface level={1} radius={radius.md} padded={false} style={styles.tabs}>
          <ModeTab
            label="Create account"
            active={isSignup}
            onPress={() => switchMode('signup')}
          />
          <ModeTab label="Sign in" active={!isSignup} onPress={() => switchMode('signin')} />
        </Surface>

        {isSignup && (
          <TextField
            label="Username"
            value={username}
            onChangeText={setUsername}
            error={errors.username ?? undefined}
            placeholder="Shown on the leaderboard"
            autoCapitalize="none"
            maxLength={24}
          />
        )}

        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          error={errors.email ?? undefined}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />

        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          error={errors.password ?? undefined}
          placeholder={isSignup ? 'At least 8 characters' : ''}
          secureTextEntry
          autoCapitalize="none"
          autoComplete={isSignup ? 'new-password' : 'current-password'}
        />

        {formError ? <FeedbackBanner title="Couldn’t continue" body={formError} tone="danger" /> : null}

        <Button
          title={busy ? 'Working…' : isSignup ? 'Create account' : 'Sign in'}
          onPress={submit}
          disabled={busy}
          size="lg"
          leading={busy ? <ActivityIndicator color={theme.bg} /> : undefined}
        />

        <Button
          title="Keep playing as guest"
          variant="ghost"
          size="sm"
          onPress={onSkip}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );

  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    setErrors({});
    setFormError(null);
  }
}

function ModeTab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      style={[styles.tab, active && styles.tabActive]}
    >
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  content: {
    padding: space.lg,
    gap: space.md,
    paddingTop: space.xl,
    paddingBottom: space.xxl,
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
  },
  header: { alignItems: 'center', marginBottom: space.xs },
  eyebrow: { ...type.overline, color: theme.accent, marginTop: space.md },
  title: {
    ...type.display,
    color: theme.text,
    fontSize: 31,
    lineHeight: 36,
    textAlign: 'center',
    marginTop: space.xs,
  },
  subtitle: {
    ...type.body,
    color: theme.textMuted,
    textAlign: 'center',
    marginTop: space.sm,
    maxWidth: 360,
  },
  tabs: {
    flexDirection: 'row',
    padding: 4,
    marginBottom: space.xs,
  },
  tab: {
    flex: 1,
    minHeight: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: { backgroundColor: theme.cardHigh },
  tabText: { color: theme.textDim, fontFamily: font.medium, fontSize: 13, fontWeight: '500' },
  tabTextActive: { color: theme.text, fontFamily: font.semibold, fontWeight: '600' },
});
