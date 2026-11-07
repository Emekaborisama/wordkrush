import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
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
  Button,
  CreamBox,
  CreamText,
  FeedbackBanner,
  Panel,
  PanelText,
  TabSwitch,
  TextField,
  Toggle,
} from '../components';
import { palette, space } from '../theme';

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

const MODES = [
  { id: 'signup', label: 'Create account' },
  { id: 'signin', label: 'Sign in' },
] as const;

/**
 * Optional account, as the kit's pop-up: a tab naming what this is, the why
 * in a cream box, cream fields, one green action. The analytics switch is
 * the kit's Music / SFX toggle in its own cream row.
 */
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

  const heading = profile
    ? 'Your account'
    : isRaceIntent
      ? 'Racing requires an account'
      : isSignup
        ? 'Keep your scores with you'
        : 'Welcome back';
  const why = profile
    ? 'You are signed in. Your eligible runs will sync globally.'
    : isRaceIntent
      ? 'Live races need an account so teammates can see who they’re racing with. Solo play stays offline and does not need sign-in. One username per person. No password.'
      : 'Scores already save offline on this device. Sign in with email to post your best run to the global board. One username per person. No password.';

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Panel title={profile ? 'Account' : isRaceIntent ? 'Sign in to race' : 'Account'}>
          <PanelText variant="heading">{heading}</PanelText>
          <CreamBox>
            <CreamText>{why}</CreamText>
          </CreamBox>

          {profile ? (
            <CreamBox>
              <View style={styles.signedIn}>
                <View style={styles.flex}>
                  <CreamText variant="label">PLAYER</CreamText>
                  <CreamText variant="title" numberOfLines={1}>
                    {profile.username}
                  </CreamText>
                </View>
                <Button title="Sign out" tone="red" size="sm" fullWidth={false} onPress={() => void onSignOut()} />
              </View>
            </CreamBox>
          ) : (
            <>
              <TabSwitch options={MODES} value={mode} onChange={switchMode} />

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
                    tone="green"
                    onPress={() => void submitCode()}
                    disabled={busy}
                    size="lg"
                    leading={busy ? <ActivityIndicator color={palette.white} /> : undefined}
                  />
                  <Button
                    title={busy ? 'Sending…' : 'Resend link'}
                    tone="sky"
                    onPress={() => void sendCode()}
                    disabled={busy}
                  />
                  <Button
                    title="Use a different email"
                    tone="purple"
                    size="md"
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
                    tone="green"
                    onPress={() => void sendCode()}
                    disabled={busy}
                    size="lg"
                    leading={busy ? <ActivityIndicator color={palette.white} /> : undefined}
                  />
                </>
              )}

              {onSkip && (
                <Button
                  title={isRaceIntent ? 'Back to solo play' : 'Keep playing as guest'}
                  tone="blue"
                  size="md"
                  onPress={onSkip}
                />
              )}
            </>
          )}

          <CreamBox>
            <View style={styles.signedIn}>
              <CreamText variant="teal">Analytics</CreamText>
              <Toggle
                value={analyticsConsent === 'granted'}
                onChange={(on) => onToggleAnalytics(on ? 'granted' : 'denied')}
                accessibilityLabel="Analytics"
              />
            </View>
            <CreamText style={styles.note}>
              WordKrush records which games you open and finish. No ads. Turn this off anytime.
            </CreamText>
          </CreamBox>
        </Panel>
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

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: space.md,
    paddingTop: space.lg,
    paddingBottom: space.xxl,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  signedIn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  flex: { flex: 1 },
  note: { fontSize: 13, lineHeight: 18, marginTop: space.xs, color: palette.inkSoft },
});
