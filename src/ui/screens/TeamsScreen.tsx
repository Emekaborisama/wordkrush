import { useEffect, useState } from 'react';
import { Platform, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { captureAnalytics } from '../../analytics/client';
import type { Profile } from '../../auth/auth';
import { isBackendConfigured } from '../../auth/client';
import { LIVE_ROSTER_LABEL, PATH_GAME_IDS, type PathGameId } from '../../games/campaign';
import { GAMES } from '../../games/registry';
import { createMatch, loadActiveMatch } from '../../live/api';
import { clearExistingMembership, createTeam, joinTeam } from '../../teams/api';
import { teamInviteUrl } from '../../teams/codes';
import type { TeamSnapshot } from '../../teams/types';
import {
  Badge,
  Button,
  CreamBox,
  CreamText,
  EmptyState,
  FeedbackBanner,
  Panel,
  PanelText,
  StrokeText,
  TabSwitch,
  TextField,
} from '../components';
import { font, palette, space } from '../theme';

type Props = {
  profile: Profile | null;
  pendingInviteCode?: string | null;
  onNeedAuth: () => void;
  onOpenLobby: (matchId: string) => void;
  onInviteConsumed: () => void;
};

/**
 * Private rooms for live races, as kit pop-ups: create and join each get a
 * panel; a room shows its invite code big, its roster as cream rows, and the
 * game switch as small glossy tabs over a green Open lobby.
 */
export function TeamsScreen({ profile, pendingInviteCode, onNeedAuth, onOpenLobby, onInviteConsumed }: Props) {
  const [snapshot, setSnapshot] = useState<TeamSnapshot | null>(null);
  const [gameId, setGameId] = useState<PathGameId>('wordfall');
  const [name, setName] = useState('');
  const [code, setCode] = useState(pendingInviteCode ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!profile || !isBackendConfigured) {
      setReady(true);
      return;
    }
    // Room ends after race - no crew revival
    setReady(true);
  }, [profile]);

  useEffect(() => {
    if (!profile || !pendingInviteCode || snapshot) return;
    let cancelled = false;
    void (async () => {
      setBusy(true);
      await clearExistingMembership(profile.id);
      const result = await joinTeam(pendingInviteCode);
      if (cancelled) return;
      setBusy(false);
      onInviteConsumed();
      if (!result.ok) {
        setError(result.error);
        setCode(pendingInviteCode);
        return;
      }
      captureAnalytics('team_joined', { via: 'invite' });
      setSnapshot(result.value);
    })();
    return () => {
      cancelled = true;
    };
  }, [profile, pendingInviteCode, snapshot, onInviteConsumed]);

  async function handleCreate() {
    if (!profile) return;
    setError(null);
    setBusy(true);
    await clearExistingMembership(profile.id);
    const result = await createTeam(name);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    captureAnalytics('team_created', {});
    setSnapshot(result.value);
  }

  async function handleJoin() {
    if (!profile) return;
    setError(null);
    setBusy(true);
    await clearExistingMembership(profile.id);
    const result = await joinTeam(code);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    captureAnalytics('team_joined', { via: 'code' });
    setSnapshot(result.value);
  }

  async function handleOpenLobby() {
    setBusy(true);
    setError(null);
    const existing = await loadActiveMatch(gameId);
    if (existing.ok && existing.value) {
      setBusy(false);
      onOpenLobby(existing.value.match.id);
      return;
    }
    // No open lobby - create level 1
    const created = await createMatch(gameId, 1);
    setBusy(false);
    if (!created.ok) {
      setError(created.error);
      return;
    }
    captureAnalytics('match_created', {
      game_id: gameId,
      level_number: 1,
    });
    onOpenLobby(created.value.match.id);
  }

  async function shareInvite() {
    if (!snapshot) return;
    const origin = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : undefined;
    const url = teamInviteUrl(snapshot.team.inviteCode, origin);
    try {
      await Share.share({ message: `Join ${snapshot.team.name} on WordKrush: ${url}` });
    } catch {
      setError(`Invite code ${snapshot.team.inviteCode}`);
    }
  }

  if (!isBackendConfigured) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Panel title="Teams">
          <EmptyState title="Teams are offline" body="Live races need the optional backend. Solo play still works." />
        </Panel>
      </ScrollView>
    );
  }

  if (!profile) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Panel title="Teams">
          <EmptyState
            title="Sign in to race"
            body={`Guests keep solo Play. Sign in to race ${LIVE_ROSTER_LABEL} friends on an invite-only team.`}
            actionLabel="Sign in"
            onAction={onNeedAuth}
          />
        </Panel>
      </ScrollView>
    );
  }

  if (!ready) return <View style={styles.flex} />;

  if (!snapshot) {
    return (
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Panel title="Teams">
          <PanelText>{`Private invite only. Race with ${LIVE_ROSTER_LABEL} people on More or Less, Clueless, or Wordfall.`}</PanelText>
          {error ? <FeedbackBanner title="Couldn’t continue" body={error} tone="danger" /> : null}
          <PanelText variant="heading">Create a room</PanelText>
          <TextField label="Room name" value={name} onChangeText={setName} autoCapitalize="words" />
          <Button
            title="Create room"
            size="lg"
            tone="green"
            onPress={() => void handleCreate()}
            disabled={busy || name.trim().length < 2}
          />
        </Panel>
        <Panel title="Join" tone="purple">
          <TextField
            label="Invite code"
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <Button title="Join room" tone="green" size="md" onPress={() => void handleJoin()} disabled={busy} />
        </Panel>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Panel title="Your room">
        <PanelText variant="heading">{snapshot.team.name}</PanelText>
        <PanelText>
          {`${snapshot.members.length} ${snapshot.members.length === 1 ? 'player' : 'players'} · races hold ${LIVE_ROSTER_LABEL}`}
        </PanelText>
        {error ? <FeedbackBanner title="Couldn’t continue" body={error} tone="danger" /> : null}

        <CreamBox style={styles.invite}>
          <CreamText variant="teal">Invite players</CreamText>
          <StrokeText size={34} stroke={palette.ink} strokeWidth={2.5} depth={2} letterSpacing={4}>
            {snapshot.team.inviteCode}
          </StrokeText>
          <Button title="Share invite link" size="md" tone="blue" onPress={() => void shareInvite()} />
        </CreamBox>

        <View style={styles.roster}>
          {snapshot.members.map((member) => (
            <CreamBox key={member.playerId} style={styles.member}>
              <View style={styles.memberRow}>
                <Text style={styles.memberName} numberOfLines={1}>
                  {member.username}
                </Text>
                <Badge label={member.role === 'owner' ? 'HOST' : 'PLAYER'} tone={member.role === 'owner' ? 'warning' : 'accent'} />
              </View>
            </CreamBox>
          ))}
        </View>

        <TabSwitch
          options={PATH_GAME_IDS.map((id) => ({ id, label: GAMES.find((item) => item.id === id)?.name ?? id }))}
          value={gameId}
          onChange={setGameId}
        />
        <Button title="Open lobby" size="lg" tone="green" onPress={() => void handleOpenLobby()} disabled={busy} />
      </Panel>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    gap: space.xl,
    paddingHorizontal: space.md,
    paddingTop: space.lg,
    paddingBottom: space.xxl,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  invite: { alignItems: 'center', gap: space.xs },
  roster: { gap: space.xs },
  member: { paddingVertical: space.xs + 2 },
  memberRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  memberName: { flex: 1, fontFamily: font.black, fontSize: 16, color: palette.ink },
});
