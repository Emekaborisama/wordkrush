import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { captureAnalytics } from '../../analytics/client';
import { authErrorCategory } from '../../analytics/events';
import { requestMagicLink, verifyEmailOtp, type Profile } from '../../auth/auth';
import { authRedirectUrl } from '../../auth/redirect';
import {
  isUsernameTakenError,
  validateEmail,
  validateOtpCode,
  validateUsername,
} from '../../auth/validation';
import { type AnalyticsConsent } from '../../analytics/events';
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
  profile: Profile | null;
  onAuthed: (profile: Profile) => void;
  onSignOut: () => Promise<void>;
  onSkip?: () => void;
  /** True when coming from race intent (Race with team / Teams wall) */
  isRaceIntent?: boolean;
  analyticsConsent: AnalyticsConsent;
  onToggleAnalytics: (consent: AnalyticsConsent) => void;
};

export function AccountScreen({
  profile,
  onAuthed,
  onSignOut,
  onSkip,
  isRaceIntent = false,
  analyticsConsent,
  onToggleAnalytics,
}: Props) {
  const [mode, setMode] = useState<Mode>('signup');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isSignup = mode === 'signup';
  const analyticsMode = isSignup ? 'sign_up' : 'sign_in';

  async function sendCode() {
    const next: Record<string, string | null> = {
      username: isSignup ? validateUsername(username) : null,
      email: validateEmail(email),
    };
    setErrors(next);
    setFormError(null);
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
    const result = await requestMagicLink({
      email,
      redirectTo: authRedirectUrl(),
      createUser: isSignup,
      username: isSignup ? username : undefined,
    });
    setBusy(false);

    if (result.ok) {
      setSent(true);
      setCode('');
      return;
    }
    captureAnalytics('auth_failed', {
      mode: analyticsMode,
      error_category: authErrorCategory(result.error),
    });
    if (isUsernameTakenError(result.error)) {
      setErrors({ username: result.error });
      return;
    }
    setFormError(result.error);
  }

  async function submitCode() {
    const codeError = validateOtpCode(code);
    setErrors({ code: codeError });
    setFormError(null);
    if (codeError) {
      captureAnalytics('auth_submitted', {
        mode: analyticsMode,
        validation_result: 'invalid',
      });
      return;
    }

    setBusy(true);
    const result = await verifyEmailOtp(email, code);
    setBusy(false);

    if (result.ok) {
      onAuthed(result.profile);
      return;
    }
    captureAnalytics('auth_failed', {
      mode: analyticsMode,
      error_category: authErrorCategory(result.error),
    });
    setFormError(result.error);
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <BrandArtwork variant="lockup" size={168} />
          {!profile && <Text style={styles.eyebrow}>{isRaceIntent ? 'SIGN IN TO RACE' : 'OPTIONAL ACCOUNT'}</Text>}
          <Text style={styles.title}>
            {profile 
              ? 'Your Account'
              : isRaceIntent
                ? 'Racing requires an account'
                : isSignup
                  ? 'Keep your scores with you'
                  : 'Welcome back'}
          </Text>
          <Text style={styles.subtitle}>
            {profile
              ? 'You are signed in. Your eligible runs will sync globally.'
              : isRaceIntent
                ? 'Live races need an account so teammates can see who they\'re racing with. Solo play stays offline and does not need sign-in. One username per person. No password.'
                : 'Scores already save offline on this device. Sign in with email to post your best run to the global board. One username per person. No password.'}
          </Text>
        </View>

        {profile ? (
          <Surface level={1} borderColor={theme.border} radius={radius.md} style={styles.signedInCard}>
            <View style={styles.signedInHeader}>
              <Text style={styles.signedInUsername}>{profile.username}</Text>
              <Button title="Sign out" variant="outline" size="sm" onPress={onSignOut} />
            </View>
          </Surface>
        ) : (
          <>
            <Surface level={1} radius={radius.md} padded={false} style={styles.tabs}>
              <ModeTab
                label="Create account"
                active={isSignup}
                onPress={() => switchMode('signup')}
              />
              <ModeTab label="Sign in" active={!isSignup} onPress={() => switchMode('signin')} />
            </Surface>

            {sent ? (
              <>
                <FeedbackBanner
                  title="Check your inbox"
                  body={`We sent a sign-in link to ${email.trim()}. Open it on this device, or type the code from the email.`}
                  tone="success"
                />
                <TextField
                  label="Code"
                  value={code}
                  onChangeText={setCode}
                  error={errors.code ?? undefined}
                  placeholder="6-digit code"
                  keyboardType="number-pad"
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                />
                {formError ? <FeedbackBanner title="Couldn’t continue" body={formError} tone="danger" /> : null}
                <Button
                  title={busy ? 'Checking…' : 'Verify code'}
                  onPress={submitCode}
                  disabled={busy}
                  size="lg"
                  leading={busy ? <ActivityIndicator color={theme.bg} /> : undefined}
                />
                <Button
                  title={busy ? 'Sending…' : 'Resend link'}
                  variant="tonal"
                  onPress={sendCode}
                  disabled={busy}
                />
                <Button
                  title="Use a different email"
                  variant="ghost"
                  size="sm"
                  onPress={() => {
                    setSent(false);
                    setCode('');
                    setFormError(null);
                    setErrors({});
                  }}
                />
              </>
            ) : (
              <>
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

                {formError ? <FeedbackBanner title="Couldn’t continue" body={formError} tone="danger" /> : null}

                <Button
                  title={busy ? 'Sending…' : 'Email me a link'}
                  onPress={sendCode}
                  disabled={busy}
                  size="lg"
                  leading={busy ? <ActivityIndicator color={theme.bg} /> : undefined}
                />
              </>
            )}

            {onSkip && (
              <Button
                title={isRaceIntent ? 'Back to solo play' : 'Keep playing as guest'}
                variant="ghost"
                size="sm"
                onPress={onSkip}
              />
            )}
          </>
        )}

        <View style={styles.analyticsSection}>
          <Surface level={1} borderColor={theme.border} radius={radius.md}>
            <View style={styles.analyticsHeader}>
              <Text style={styles.analyticsTitle}>Analytics</Text>
              <Switch
                value={analyticsConsent === 'granted'}
                onValueChange={(val) => onToggleAnalytics(val ? 'granted' : 'denied')}
                trackColor={{ false: theme.border, true: theme.success }}
                thumbColor={Platform.OS === 'android' ? theme.bg : undefined}
              />
            </View>
            <Text style={styles.analyticsBody}>
              Analytics — WordKrush records which games you open and finish. No ads. Turn this off anytime.
            </Text>
          </Surface>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    setSent(false);
    setCode('');
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
  signedInCard: {
    padding: space.md,
  },
  signedInHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  signedInUsername: {
    ...type.body,
    color: theme.text,
    fontFamily: font.bold,
    fontWeight: '700',
  },
  analyticsSection: {
    marginTop: space.xl,
  },
  analyticsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.sm,
  },
  analyticsTitle: {
    ...type.body,
    color: theme.text,
    fontFamily: font.bold,
    fontWeight: '700',
  },
  analyticsBody: {
    ...type.caption,
    color: theme.textDim,
  },
});
