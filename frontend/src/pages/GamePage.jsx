import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Spline, Eraser, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/context/LangContext";
import { useGame, useBoardState } from "@/hooks/useGame";
import { Loader } from "@/components/Loader";
import { CrimeBoard } from "@/components/game/CrimeBoard";
import { EvidenceModal } from "@/components/game/EvidenceModal";
import { ScoreBar } from "@/components/game/ScoreBar";
import { QuestionsPanel } from "@/components/game/QuestionsPanel";
import { ShadowPanel } from "@/components/game/ShadowPanel";
import { AccusationDialog } from "@/components/game/AccusationDialog";
import { ResultOverlay } from "@/components/game/ResultOverlay";
import { Tutorial } from "@/components/game/Tutorial";
import { WaitingRoom, BriefingDialog } from "@/components/game/WaitingRoom";
import { sfx, startAmbient, stopAmbient } from "@/lib/sound";

const fitZoom = () => (window.innerWidth < 640 ? 0.5 : window.innerWidth < 1280 ? 0.7 : 0.85);

const TurnBanner = ({ name }) => {
  const { t } = useLang();
  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
      data-testid="turn-banner"
      className="absolute top-4 left-1/2 -translate-x-1/2 z-30 glass hairline px-6 py-3 text-center pointer-events-none"
    >
      <div className="text-[10px] font-mono-tu tracking-[0.3em] text-[#8E95A2] uppercase">{t("turnNow")}</div>
      <div className="font-display text-xl text-white">{name}</div>
    </motion.div>
  );
};

const ToolBtn = ({ id, tour, active, onClick, icon: Icon, label }) => (
  <button data-testid={id} data-tour={tour} data-active={active} onClick={onClick} className="btn-ghost rounded-full h-10 px-3 sm:px-4 text-xs flex items-center gap-2 bg-[#0B0C0F]/80" aria-label={label}>
    <Icon className="w-4 h-4" />{label && <span className="hidden sm:inline">{label}</span>}
  </button>
);

export default function GamePage() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { t, pick, errMsg } = useLang();
  const { game, setGame, caseData, error, reload } = useGame(gameId);
  const board = useBoardState(gameId);
  const [zoom, setZoom] = useState(fitZoom);
  const [openItem, setOpenItem] = useState(null);
  const [panel, setPanel] = useState(null);
  const [threadMode, setThreadMode] = useState(false);
  const [pickA, setPickA] = useState(null);
  const [briefing, setBriefing] = useState(false);
  const [tour, setTour] = useState(false);
  const [banner, setBanner] = useState(null);
  const [showResult, setShowResult] = useState(true);
  const lastTurn = useRef(null);
  const seenEvents = useRef(null);

  useEffect(() => {
    const start = () => startAmbient();
    window.addEventListener("pointerdown", start, { once: true });
    return () => { window.removeEventListener("pointerdown", start); stopAmbient(); };
  }, []);

  useEffect(() => { if (error) { toast.error(errMsg(error)); navigate("/cases"); } }, [error, errMsg, navigate]);

  useEffect(() => {
    if (game?.status === "active" && !localStorage.getItem(`tu-briefed-${gameId}`)) setBriefing(true);
  }, [game?.status, gameId]);

  useEffect(() => {
    if (!game || game.status !== "active") return undefined;
    if (lastTurn.current !== null && lastTurn.current !== game.turn) {
      setBanner(game.teams[game.turn].name);
      sfx("turn");
      const id = setTimeout(() => setBanner(null), 1800);
      lastTurn.current = game.turn;
      return () => clearTimeout(id);
    }
    lastTurn.current = game.turn;
    return undefined;
  }, [game]);

  useEffect(() => {
    if (!game || !caseData) return;
    const ids = game.events.map((e) => e.id);
    if (seenEvents.current && game.mode === "room") {
      game.events.filter((e) => !seenEvents.current.includes(e.id) && e.team !== game.my_team).forEach((e) => {
        if (e.kind === "unlock") return;
        toast(t(`ev_${e.kind}`, { t: game.teams[e.team].name }) + (e.delta ? `  (${e.delta > 0 ? "+" : ""}${e.delta})` : ""));
      });
      game.events.filter((e) => !seenEvents.current.includes(e.id) && e.kind === "unlock").forEach((e) => {
        const ev = game.unlocked_evidence.find((x) => x.id === e.ref);
        if (ev) toast(t("unlockedToast", { e: pick(ev.title) }));
      });
    }
    seenEvents.current = ids;
  }, [game, caseData, t, pick]);

  const items = useMemo(() => {
    if (!game || !caseData) return [];
    const unlocked = Object.fromEntries(game.unlocked_evidence.map((e) => [e.id, e]));
    const qTitle = Object.fromEntries(caseData.questions.map((q) => [q.id, q.title]));
    const hidden = caseData.hidden_slots.map((s) => unlocked[s.id]
      ? { ...unlocked[s.id], x: s.x, y: s.y, rot: s.rot, isNew: !localStorage.getItem(`tu-seen-${gameId}-${s.id}`) }
      : { ...s, sealed: true, lockTitle: qTitle[s.unlock_by] });
    return [...caseData.evidence, ...hidden];
  }, [game, caseData, gameId]);

  if (!game || !caseData) return <Loader />;
  if (game.status === "waiting") return <WaitingRoom game={game} />;

  const closedIds = Object.entries(game.questions)
    .filter(([, st]) => st.solved_by !== null || st.tries.every((n) => n >= 2)).map(([id]) => id);
  const canAct = game.status === "active" && (game.mode === "local" || game.my_team === game.turn);

  const onTap = (item) => {
    if (item.sealed) return;
    if (threadMode) {
      if (!pickA) return setPickA(item.id);
      if (pickA !== item.id) { board.toggleThread(pickA, item.id); sfx("thread"); }
      return setPickA(null);
    }
    if (item.isNew) localStorage.setItem(`tu-seen-${gameId}-${item.id}`, "1");
    sfx("paper");
    return setOpenItem(item);
  };

  const onAnswer = (data) => {
    setGame(data.game);
    toast(data.correct ? `${t("correct")}  +${data.delta}` : `${t("wrong")}  ${data.delta}`);
    sfx(data.correct ? "correct" : "wrong");
    if (data.unlocked) {
      setTimeout(() => sfx("unlock"), 600);
      const ev = data.game.unlocked_evidence.find((e) => e.id === data.unlocked);
      if (ev) setTimeout(() => toast(t("unlockedToast", { e: pick(ev.title) })), 500);
    }
  };

  const closeBriefing = () => {
    localStorage.setItem(`tu-briefed-${gameId}`, "1");
    setBriefing(false);
    if (!localStorage.getItem("tu-tour-done")) setTimeout(() => setTour(true), 300);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden" data-testid="game-page">
      <ScoreBar
        game={game} caseData={caseData} closedCount={closedIds.length}
        onQuestions={() => setPanel("questions")} onShadow={() => setPanel("shadow")}
        onAccuse={() => setPanel("accuse")} onHelp={() => setTour(true)}
      />
      <div className="relative flex-1 min-h-0">
        <CrimeBoard
          board={caseData.board} items={items} pos={board.pos} setPos={board.setPos}
          threads={board.threads} toggleThread={board.toggleThread} zoom={zoom} onTap={onTap} selectedId={pickA}
        />
        <AnimatePresence>{banner && <TurnBanner key={banner + game.version} name={banner} />}</AnimatePresence>
        {threadMode && (
          <div data-testid="thread-mode-hint" className="absolute top-4 start-4 z-20 glass hairline px-4 py-2 text-xs text-white">
            {pickA ? t("threadPick") : t("threadOn")}
          </div>
        )}
        <div className="absolute bottom-14 start-4 z-20 flex flex-wrap gap-2">
          <ToolBtn id="connect-thread-btn" tour="thread-btn" active={threadMode} onClick={() => { setThreadMode(!threadMode); setPickA(null); }} icon={Spline} label={t("thread")} />
          {board.threads.length > 0 && <ToolBtn id="clear-threads-btn" onClick={board.clearThreads} icon={Eraser} label={t("clearThreads")} />}
        </div>
        <div className="absolute bottom-14 end-4 z-20 flex gap-2">
          <ToolBtn id="zoom-out-btn" onClick={() => setZoom((z) => Math.max(0.35, +(z - 0.1).toFixed(2)))} icon={ZoomOut} />
          <ToolBtn id="zoom-fit-btn" onClick={() => setZoom(fitZoom())} icon={Maximize2} />
          <ToolBtn id="zoom-in-btn" onClick={() => setZoom((z) => Math.min(1.5, +(z + 0.1).toFixed(2)))} icon={ZoomIn} />
        </div>
      </div>

      <EvidenceModal item={openItem} onClose={() => setOpenItem(null)} />
      <QuestionsPanel open={panel === "questions"} onOpenChange={(o) => setPanel(o ? "questions" : null)} game={game} caseData={caseData} closedIds={closedIds} onResult={onAnswer} canAct={canAct} />
      <ShadowPanel open={panel === "shadow"} onOpenChange={(o) => setPanel(o ? "shadow" : null)} game={game} onAfter={() => reload().catch(() => {})} />
      <AccusationDialog open={panel === "accuse"} onOpenChange={(o) => setPanel(o ? "accuse" : null)} game={game} caseData={caseData} closedCount={closedIds.length} canAct={canAct} onResult={(d) => { setGame(d.game); sfx(d.correct ? "reveal" : "wrong"); }} />
      <BriefingDialog open={briefing} onClose={closeBriefing} caseData={caseData} />
      <Tutorial startTip={pick(caseData.start_tip)} open={tour} onClose={() => { localStorage.setItem("tu-tour-done", "1"); setTour(false); }} />
      {game.status === "finished" && showResult && <ResultOverlay game={game} caseData={caseData} onClose={() => setShowResult(false)} />}
    </div>
  );
}
