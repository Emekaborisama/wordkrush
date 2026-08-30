import { useEffect, useState } from 'react';
import { Platform, ScrollView, Share, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { captureAnalytics } from '../../analytics/client';
import type { Profile } from '../../auth/auth';
import { isBackendConfigured } from '../../auth/client';
import { levelByNumber } from '../../data/wordfall';
import {
  LIVE_ROSTER_LABEL,
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
import { isWideLayout } from '../layout';
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
  const wide = isWideLayout(useWindowDimensions().width);

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
      <View style={[styles.root, styles.empty]}>
        <EmptyState
          title="Teams are offline"
          body="Live races need the optional backend. Solo play still works."
        />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.root, styles.empty]}>
        <EmptyState
          title="Sign in to race"
          body={`Guests keep solo Play. Sign in to race ${LIVE_ROSTER_LABEL} friends on an invite-only team.`}
          actionLabel="Sign in"
          onAction={onNeedAuth}
        />
      </View>
    );
  }

  if (!ready) return <View style={styles.root} />;

  if (!snapshot) {
    return (
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader
          eyebrow="TEAMS"
          title="Create or join a race room"
          size={wide ? 'display' : 'title'}
          subtitle={`Private invite only. Race with ${LIVE_ROSTER_LABEL} people on More or Less, Clueless, or Wordfall.`}
        />
        {error ? <FeedbackBanner title="Couldn’t continue" body={error} tone="danger" /> : null}
        <Surface style={styles.card}>
          <Text style={styles.cardTitle}>Create a room</Text>
          <TextField label="Room name" value={name} onChangeText={setName} autoCapitalize="words" />
          <Button title="Create room" onPress={() => void handleCreate()} disabled={busy || name.trim().length < 2} />
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
          <Button title="Join room" variant="tonal" onPress={() => void handleJoin()} disabled={busy} />
        </Surface>
      </ScrollView>
    );
  }

  const raceActions = (
    <View style={styles.actions}>
      <Button
        title="Host race"
        onPress={() => void handleHost()}
        color={accent}
        disabled={busy || selected == null}
      />
      <Button
        title="Join open lobby"
        variant="tonal"
        color={accent}
        onPress={() => void handleJoinOpen()}
        disabled={busy}
      />
    </View>
  );

  return (
    <View style={[styles.root, wide && styles.rootWide]}>
      <ScrollView
        style={wide ? styles.sidebar : styles.topScroll}
        contentContainerStyle={styles.top}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        <ScreenHeader
          eyebrow="TEAM"
          title={snapshot.team.name}
          size={wide ? 'display' : 'title'}
          subtitle={`${snapshot.members.length} ${snapshot.members.length === 1 ? 'player' : 'players'} · races hold ${LIVE_ROSTER_LABEL} · code ${snapshot.team.inviteCode}`}
        />
        {error ? <FeedbackBanner title="Couldn’t continue" body={error} tone="danger" /> : null}

        <Surface style={styles.inviteCard}>
          <Text style={styles.inviteTitle}>Invite players</Text>
          <Text style={styles.inviteCode}>{snapshot.team.inviteCode}</Text>
          <Button 
            title="Share invite link" 
            size="lg"
            onPress={() => void shareInvite()} 
            color={accent}
          />
        </Surface>

        <Surface style={styles.card}>
          <Text style={styles.cardTitle}>Roster</Text>
          {snapshot.members.map((member) => (
            <View key={member.playerId} style={styles.member}>
              <Text style={styles.memberName}>{member.username}</Text>
              <Badge label={member.role === 'owner' ? 'HOST' : 'PLAYER'} />
            </View>
          ))}
        </Surface>

        <Text style={styles.section}>SELECT GAME</Text>
        <View style={styles.gameRow}>
          {PATH_GAME_IDS.map((id) => {
            const game = GAMES.find((item) => item.id === id);
            const active = gameId === id;
            return (
              <Button
                key={id}
                title={game?.name ?? id}
                size="md"
                variant={active ? 'primary' : 'tonal'}
                color={game?.accent ?? theme.accent}
                fullWidth={false}
                style={styles.gameChip}
                onPress={() => {
                  setGameId(id);
                  setSelected(null);
                }}
              />
            );
          })}
        </View>
        <Text style={styles.hint} numberOfLines={2}>
          Team path {teamPath} · your path {personalUnlocked}. A race needs {LIVE_ROSTER_LABEL}{' '}
          ready players.
        </Text>
        {wide ? raceActions : null}
      </ScrollView>

      <View style={styles.main}>
        <CampaignPicker
          style={styles.picker}
          rows={rows}
          personalUnlocked={personalUnlocked}
          teamUnlocked={teamPath}
          selected={selected}
          accent={accent}
          onSelect={setSelected}
        />
        {wide ? null : raceActions}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.bg,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
  },
  rootWide: { flexDirection: 'row', gap: space.lg, minHeight: 0 },
  empty: { justifyContent: 'center' },
  content: { paddingBottom: space.md, gap: space.md },
  top: { gap: space.sm, paddingBottom: space.sm },
  topScroll: { flexGrow: 0, flexShrink: 1, maxHeight: 320 },
  sidebar: { width: 340, flexShrink: 0, alignSelf: 'stretch' },
  main: { flex: 1, minHeight: 0 },
  card: { gap: space.sm },
  cardTitle: { ...type.subtitle, color: theme.text, fontSize: 16 },
  inviteCard: { gap: space.md, alignItems: 'center', padding: space.lg },
  inviteTitle: { ...type.subtitle, color: theme.text, fontSize: 18 },
  inviteCode: { ...type.display, color: theme.accent, fontSize: 32, letterSpacing: 4 },
  member: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  memberName: { ...type.bodyStrong, color: theme.text },
  section: { ...type.overline, color: theme.textDim },
  gameRow: { flexDirection: 'row', gap: space.xs },
  gameChip: { flex: 1, minWidth: 0 },
  hint: { ...type.caption, color: theme.textMuted },
  picker: { flex: 1, minHeight: 0, height: 0, overflow: 'hidden' },
  actions: { gap: space.xs, paddingTop: space.sm, paddingBottom: space.md, flexShrink: 0 },
});

