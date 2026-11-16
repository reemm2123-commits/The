import { useCallback, useEffect, useState } from "react";
import { api, errorCode } from "@/lib/api";

export function useGame(gameId) {
  const [game, setGame] = useState(null);
  const [caseData, setCaseData] = useState(null);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    const { data } = await api.get(`/games/${gameId}`);
    setGame((g) => (!g || g.version !== data.version || g.status !== data.status ? data : g));
    return data;
  }, [gameId]);

  useEffect(() => {
    reload()
      .then((d) => api.get(`/cases/${d.case_id}`))
      .then((r) => setCaseData(r.data))
      .catch((e) => setError(errorCode(e)));
  }, [reload]);

  const live = game && game.mode === "room" && game.status !== "finished";
  useEffect(() => {
    if (!live) return undefined;
    const id = setInterval(() => reload().catch(() => {}), 2500);
    return () => clearInterval(id);
  }, [live, reload]);

  return { game, setGame, caseData, error, reload };
}

export function useBoardState(gameId) {
  const key = `tu-board-${gameId}`;
  const [state, setState] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key)) || { pos: {}, threads: [] }; } catch (_) { return { pos: {}, threads: [] }; }
  });

  useEffect(() => { localStorage.setItem(key, JSON.stringify(state)); }, [key, state]);

  const setPos = useCallback((id, p) => setState((s) => ({ ...s, pos: { ...s.pos, [id]: p } })), []);
  const toggleThread = useCallback((a, b) => setState((s) => {
    const exists = s.threads.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
    return { ...s, threads: exists ? s.threads.filter(([x, y]) => !((x === a && y === b) || (x === b && y === a))) : [...s.threads, [a, b]] };
  }), []);
  const clearThreads = useCallback(() => setState((s) => ({ ...s, threads: [] })), []);

  return { pos: state.pos, threads: state.threads, setPos, toggleThread, clearThreads };
}
