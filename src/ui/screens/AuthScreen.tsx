import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { captureAnalytics } from '../../analytics/client';
import { authErrorCategory } from '../../analytics/events';
import { signIn, signUp, type Profile } from '../../auth/auth';
import { validateEmail, validatePassword, validateUsername } from '../../auth/validation';
import { radius, theme } from '../theme';

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
      captureAnalytics('auth_succeeded', { mode: analyticsMode });
      onAuthed(result.profile);
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
          <Text style={styles.title}>{isSignup ? 'Create an account' : 'Welcome back'}</Text>
          <Text style={styles.subtitle}>
            Optional. Your scores already save on this device — an account lets them follow you
            across devices and onto the global board.
          </Text>
        </View>

        {isSignup && (
          <Field
            label="Username"
            value={username}
            onChange={setUsername}
            error={errors.username}
            placeholder="Shown on the leaderboard"
            autoCapitalize="none"
            maxLength={24}
          />
        )}

        <Field
          label="Email"
          value={email}
          onChange={setEmail}
          error={errors.email}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />

        <Field
          label="Password"
          value={password}
          onChange={setPassword}
          error={errors.password}
          placeholder={isSignup ? 'At least 8 characters' : ''}
          secureTextEntry
          autoCapitalize="none"
          autoComplete={isSignup ? 'new-password' : 'current-password'}
        />

        {formError && <Text style={styles.formError}>{formError}</Text>}

        <Pressable
          style={({ pressed }) => [styles.primary, (pressed || busy) && styles.pressed]}
          onPress={submit}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color={theme.bg} />
          ) : (
            <Text style={styles.primaryText}>{isSignup ? 'CREATE ACCOUNT' : 'SIGN IN'}</Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => {
            setMode(isSignup ? 'signin' : 'signup');
            setErrors({});
            setFormError(null);
          }}
        >
          <Text style={styles.switch}>
            {isSignup ? 'Already have an account? Sign in' : 'Need an account? Create one'}
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.skip, pressed && styles.pressed]}
          onPress={onSkip}
        >
          <Text style={styles.skipText}>Keep playing without an account</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  value,
  onChange,
  error,
  ...input
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
  // TextInput has its own event-based `onChange`/`value`; omit both so our
  // text-only callback does not collide with it.
} & Omit<React.ComponentProps<typeof TextInput>, 'onChange' | 'value'>) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      <TextInput
        style={[styles.input, error ? styles.inputError : null]}
        value={value}
        onChangeText={onChange}
        placeholderTextColor={theme.textDim}
        {...input}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 24, gap: 16, paddingTop: 48, paddingBottom: 40 },
  header: { gap: 8, marginBottom: 4 },
  title: { color: theme.text, fontSize: 26, fontWeight: '900' },
  subtitle: { color: theme.textDim, fontSize: 13, lineHeight: 19 },

  field: { gap: 6 },
  label: { color: theme.textDim, fontSize: 10, letterSpacing: 1.5, fontWeight: '700' },
  input: {
    backgroundColor: theme.bgElevated,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: theme.text,
    fontSize: 15,
  },
  inputError: { borderColor: theme.danger },
  fieldError: { color: theme.danger, fontSize: 11 },
  formError: {
    color: theme.danger,
    fontSize: 13,
    textAlign: 'center',
    backgroundColor: theme.dangerDim,
    borderRadius: radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    overflow: 'hidden',
  },

  primary: {
    backgroundColor: theme.accent,
    paddingVertical: 17,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: 4,
    minHeight: 54,
    justifyContent: 'center',
  },
  primaryText: { color: theme.bg, fontSize: 15, fontWeight: '900', letterSpacing: 2 },
  switch: { color: theme.accent, fontSize: 13, textAlign: 'center', paddingVertical: 6 },
  skip: { paddingVertical: 14, alignItems: 'center' },
  skipText: { color: theme.textDim, fontSize: 13, textDecorationLine: 'underline' },
  pressed: { opacity: 0.75 },
});
