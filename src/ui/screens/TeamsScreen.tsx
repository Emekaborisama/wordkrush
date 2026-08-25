import { useEffect, useState } from 'react';
import { Platform, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { captureAnalytics } from '../../analytics/client';
import type { Profile } from '../../auth/auth';
import { isBackendConfigured } from '../../auth/client';
import { levelByNumber } from '../../data/wordfall';
import {
  PATH_GAME_IDS,
  pickerStatus,
  type PathGameId,
} from '../../games/campaign';
import { loadPersonalUnlocked } from '../../games/campaignStorage';
import { GAMES, getGame } from '../../games/registry';
import { isLevelReleased } from '../../games/wordfall/schedule';
import { createMatch, loadActiveMatch } from '../../live/api';
import { pathRowByNumber, pathRows } from '../../live/catalog';
import { createTeam, joinTeam, loadMyTeam, teamUnlocked } from '../../teams/api';
import { teamInviteUrl } from '../../teams/codes';
import type { TeamSnapshot } from '../../teams/types';
import { CampaignPicker } from '../CampaignPicker';
import {
  Badge,
  Button,
  EmptyState,
  FeedbackBanner,
  ScreenHeader,
  Surface,
  TextField,
} from '../components';
import { space, theme, type } from '../theme';

type Props = {
  profile: Profile | null;
  pendingInviteCode?: string | null;
  onNeedAuth: () => void;
  onOpenLobby: (matchId: string) => void;
  onInviteConsumed: () => void;
};

export function TeamsScreen({
  profile,
  pendingInviteCode,
  onNeedAuth,
  onOpenLobby,
  onInviteConsumed,
}: Props) {
  const [snapshot, setSnapshot] = useState<TeamSnapshot | null>(null);
  const [gameId, setGameId] = useState<PathGameId>('wordfall');
  const [selected, setSelected] = useState<number | null>(null);
  const [personalUnlocked, setPersonalUnlocked] = useState(1);
  const [name, setName] = useState('');
  const [code, setCode] = useState(pendingInviteCode ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!profile || !isBackendConfigured) {
        setReady(true);
        return;
      }
      const result = await loadMyTeam();
      if (cancelled) return;
      if (!result.ok) setError(result.error);
      else setSnapshot(result.value);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [profile]);

  useEffect(() => {
    if (!profile || !pendingInviteCode || snapshot) return;
    let cancelled = false;
    void (async () => {
      setBusy(true);
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

  useEffect(() => {
    let cancelled = false;
    void loadPersonalUnlocked(gameId).then((unlocked) => {
      if (!cancelled) setPersonalUnlocked(unlocked);
    });
    return () => {
      cancelled = true;
    };
  }, [gameId, snapshot]);

  const rows = pathRows(gameId);
  const teamPath = snapshot ? teamUnlocked(snapshot, gameId) : 1;
  const accent = getGame(gameId)?.accent ?? theme.accent;

  async function handleCreate() {
    setError(null);
    setBusy(true);
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
    setError(null);
    setBusy(true);
    const result = await joinTeam(code);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    captureAnalytics('team_joined', { via: 'code' });
    setSnapshot(result.value);
  }

  async function handleHost() {
    if (selected == null) return;
    const row = pathRowByNumber(gameId, selected);
    if (!row) return;
    const status = pickerStatus(selected, personalUnlocked, teamPath);
    if (status === 'locked' || !row.released || row.dailySpoiler) return;
    if (gameId === 'wordfall') {
      const level = levelByNumber(selected);
      if (!level || !isLevelReleased(level, new Date())) return;
    }
    setBusy(true);
    setError(null);
    const existing = await loadActiveMatch(gameId);
    if (existing.ok && existing.value) {
      setBusy(false);
      onOpenLobby(existing.value.match.id);
      return;
    }
    const created = await createMatch(gameId, selected);
    setBusy(false);
    if (!created.ok) {
      setError(created.error);
      return;
    }
    captureAnalytics('match_created', {
      game_id: gameId,
      level_number: selected,
    });
    onOpenLobby(created.value.match.id);
  }

  async function handleJoinOpen() {
    setBusy(true);
    setError(null);
    const existing = await loadActiveMatch(gameId);
    setBusy(false);
    if (!existing.ok) {
      setError(existing.error);
      return;
    }
    if (!existing.value) {
      setError('No open lobby for this game.');
      return;
    }
    onOpenLobby(existing.value.match.id);
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
      <View style={styles.root}>
        <EmptyState
          title="Teams are offline"
          body="Live races need the optional backend. Solo play still works."
        />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.root}>
        <EmptyState
          title="Sign in to race"
          body="Guests keep solo Play. A team is invite-only and needs an account."
          actionLabel="Sign in"
          onAction={onNeedAuth}
        />
      </View>
    );
  }

  if (!ready) return <View style={styles.root} />;

  if (!snapshot) {
    return (
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ScreenHeader
          eyebrow="TEAMS"
          title="Start a crew"
          subtitle="Private invite only. Race More or Less, Clueless, or Wordfall together."
        />
        {error ? <FeedbackBanner title="Couldn’t continue" body={error} tone="danger" /> : null}
        <Surface style={styles.card}>
          <Text style={styles.cardTitle}>Create a team</Text>
          <TextField label="Team name" value={name} onChangeText={setName} autoCapitalize="words" />
          <Button title="Create team" onPress={() => void handleCreate()} disabled={busy || name.trim().length < 2} />
        </Surface>
        <Surface style={styles.card}>
          <Text style={styles.cardTitle}>Join with a code</Text>
          <TextField
            label="Invite code"
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <Button title="Join team" variant="tonal" onPress={() => void handleJoin()} disabled={busy} />
        </Surface>
      </ScrollView>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} nestedScrollEnabled>
        <ScreenHeader
          eyebrow="TEAM"
          title={snapshot.team.name}
          subtitle={`${snapshot.members.length} ${snapshot.members.length === 1 ? 'player' : 'players'} · code ${snapshot.team.inviteCode}`}
        />
        {error ? <FeedbackBanner title="Couldn’t continue" body={error} tone="danger" /> : null}

        <Surface style={styles.card}>
          <View style={styles.rosterHead}>
            <Text style={styles.cardTitle}>Roster</Text>
            <Button title="Share invite" variant="ghost" size="sm" onPress={() => void shareInvite()} />
          </View>
          {snapshot.members.map((member) => (
            <View key={member.playerId} style={styles.member}>
              <Text style={styles.memberName}>{member.username}</Text>
              <Badge label={member.role === 'owner' ? 'OWNER' : 'MEMBER'} />
            </View>
          ))}
        </Surface>

        <Text style={styles.section}>RACE A TITLE</Text>
        <View style={styles.gameRow}>
          {PATH_GAME_IDS.map((id) => {
            const game = GAMES.find((item) => item.id === id);
            const active = gameId === id;
            return (
              <Button
                key={id}
                title={game?.name ?? id}
                size="sm"
                variant={active ? 'primary' : 'tonal'}
                color={game?.accent ?? theme.accent}
                onPress={() => {
                  setGameId(id);
                  setSelected(null);
                }}
              />
            );
          })}
        </View>
        <Text style={styles.hint}>
          Team path {teamPath} · your path {personalUnlocked}. Everyone plays the team’s selected
          level. Completing it is what moves your own cursor.
        </Text>
      </ScrollView>

      <View style={styles.pickerWrap}>
        <CampaignPicker
          rows={rows}
          personalUnlocked={personalUnlocked}
          teamUnlocked={teamPath}
          selected={selected}
          accent={accent}
          onSelect={setSelected}
        />
        <View style={styles.actions}>
          <Button
            title="Host race"
            onPress={() => void handleHost()}
            color={accent}
            disabled={busy || selected == null}
          />
          <Button title="Join open lobby" variant="tonal" color={accent} onPress={() => void handleJoinOpen()} disabled={busy} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  content: { paddingHorizontal: space.lg, paddingBottom: space.md, gap: space.md },
  card: { gap: space.sm },
  cardTitle: { ...type.subtitle, color: theme.text, fontSize: 16 },
  rosterHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  member: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  memberName: { ...type.bodyStrong, color: theme.text },
  section: { ...type.overline, color: theme.textDim, marginTop: space.xs },
  gameRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  hint: { ...type.caption, color: theme.textMuted },
  pickerWrap: { flex: 1, paddingHorizontal: space.lg, paddingBottom: space.md, gap: space.sm },
  actions: { gap: space.xs },
});

