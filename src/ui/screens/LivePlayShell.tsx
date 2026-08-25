import { useEffect, useRef, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { PathGameId } from '../../games/campaign';
import { finishMatch } from '../../live/api';
import type { LiveMatchSnapshot } from '../../live/types';
import { remainingMs } from '../../live/types';
import { useMatch } from '../../live/useMatch';
import { LiveRaceHud } from './LiveRaceHud';

type Props = {
  matchId: string;
  playerId: string;
  gameId: PathGameId;
  children: ReactNode;
  onFinished: (snapshot: LiveMatchSnapshot) => void;
};

export function LivePlayShell({ matchId, playerId, gameId, children, onFinished }: Props) {
  const { snapshot } = useMatch(matchId);
  const reported = useRef(false);

  useEffect(() => {
    if (!snapshot || reported.current) return;
    if (snapshot.match.status === 'finished') {
      reported.current = true;
      onFinished(snapshot);
      return;
    }
    if (snapshot.match.status === 'racing') {
      const allDone =
        snapshot.players.length > 0 && snapshot.players.every((player) => player.status === 'done');
      if (allDone || remainingMs(snapshot.match.endsAt) <= 0) {
        reported.current = true;
        void finishMatch(matchId).then((result) => {
          if (result.ok) onFinished(result.value);
          else reported.current = false;
        });
      }
    }
  }, [snapshot, matchId, onFinished]);

  return (
    <View style={styles.root}>
      <LiveRaceHud
        gameId={gameId}
        endsAt={snapshot?.match.endsAt ?? null}
        players={snapshot?.players ?? []}
        selfId={playerId}
      />
      <View style={styles.play}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  play: { flex: 1 },
});
