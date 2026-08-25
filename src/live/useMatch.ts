import { useCallback, useEffect, useRef, useState } from 'react';
import { loadMatch, subscribeMatch } from './api';
import type { LiveMatchSnapshot } from './types';

export function useMatch(matchId: string | null) {
  const [snapshot, setSnapshot] = useState<LiveMatchSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const matchIdRef = useRef(matchId);
  matchIdRef.current = matchId;

  const refresh = useCallback(async () => {
    if (!matchId) return;
    const result = await loadMatch(matchId);
    if (matchIdRef.current !== matchId) return;
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    setSnapshot(result.value);
  }, [matchId]);

  useEffect(() => {
    setSnapshot(null);
    setError(null);
    if (!matchId) return;
    void refresh();
    const unsubscribe = subscribeMatch(matchId, () => {
      void refresh();
    });
    const poll = setInterval(() => {
      void refresh();
    }, 1500);
    return () => {
      unsubscribe();
      clearInterval(poll);
    };
  }, [matchId, refresh]);

  return { snapshot, error, refresh };
}
