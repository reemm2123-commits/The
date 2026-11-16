import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollText, MessagesSquare, Gavel, HelpCircle, Lock, Timer } from "lucide-react";
import { useLang } from "@/context/LangContext";
import { LangToggle } from "@/components/TopBar";
import { LogoMark } from "@/components/BrandFooter";
import { SoundToggle } from "@/components/game/SoundToggle";

const Elapsed = ({ start, end }) => {
  const [, tick] = useState(0);
  useEffect(() => {
    if (end) return undefined;
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [end]);
  if (!start) return null;
  const s = Math.max(0, Math.floor(((end ? new Date(end) : new Date()) - new Date(start)) / 1000));
  const fmt = (n) => String(n).padStart(2, "0");
  return <span data-testid="game-timer" dir="ltr" className="font-mono-tu">{fmt(Math.floor(s / 3600))}:{fmt(Math.floor((s % 3600) / 60))}:{fmt(s % 60)}</span>;
};

const TeamScore = ({ team, idx, active, mine }) => {
  const { t } = useLang();
  return (
    <div
      data-testid={`team-score-${idx}`}
      className={`relative flex items-center gap-3 px-3 sm:px-4 h-12 transition-colors duration-300 ${active ? "bg-[#F0F4F8] text-black" : "bg-transparent text-[#C0C7D0]"}`}
    >
      <div className="min-w-0">
        <div className="text-[11px] sm:text-xs truncate max-w-[7rem] sm:max-w-[10rem] font-semibold">{team.name}</div>
        <div className="text-[9px] font-mono-tu tracking-widest opacity-70 uppercase">
          {active ? t("turn") : " "}{mine ? ` · ${t("yourTeam")}` : ""}
        </div>
      </div>
      <AnimatePresence mode="popLayout">
        <motion.span
          key={team.score}
          initial={{ y: -12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }}
          data-testid={`team-score-value-${idx}`}
          className="font-mono-tu text-lg sm:text-xl font-semibold tabular-nums"
          dir="ltr"
        >
          {team.score}
        </motion.span>
      </AnimatePresence>
    </div>
  );
};

const HudBtn = ({ id, tour, icon: Icon, label, onClick, locked, badge }) => (
  <button
    data-testid={id}
    data-tour={tour}
    onClick={onClick}
    className="btn-ghost relative rounded-full h-10 px-3 sm:px-4 text-xs sm:text-sm flex items-center gap-2 bg-[#0E1014]/60"
  >
    {locked ? <Lock className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
    <span className="hidden md:inline">{label}</span>
    {badge && <span className="font-mono-tu text-[10px] text-[#8E95A2]" dir="ltr">{badge}</span>}
  </button>
);

export const ScoreBar = ({ game, caseData, closedCount, onQuestions, onShadow, onAccuse, onHelp }) => {
  const { t, pick } = useLang();
  return (
    <header className="glass border-b border-white/10 relative z-40 px-3 sm:px-5 py-2.5 flex flex-wrap items-center gap-3 justify-between">
      <div className="flex items-center gap-3 min-w-0">
        <LogoMark className="w-7 h-7 text-[#C0C7D0] shrink-0" />
        <div className="min-w-0 hidden sm:block">
          <div className="font-mono-tu text-[10px] tracking-[0.3em] text-[#8E95A2]">CASE {caseData.number}</div>
          <div className="font-display text-sm truncate">{pick(caseData.title)}</div>
        </div>
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-[#8E95A2] ms-3">
          <Timer className="w-3.5 h-3.5" /><Elapsed start={game.started_at} end={game.finished_at} />
        </div>
      </div>
      <div data-tour="scores" className="flex hairline rounded-sm overflow-hidden order-last w-full sm:w-auto sm:order-none justify-center">
        {game.teams.map((tm, i) => (
          <TeamScore key={i} team={tm} idx={i} active={game.turn === i && game.status === "active"} mine={game.my_team === i} />
        ))}
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <HudBtn id="questions-btn" tour="questions-btn" icon={ScrollText} label={t("questions")} onClick={onQuestions} badge={`${closedCount}/${caseData.questions.length}`} />
        <HudBtn id="ai-shadow-btn" tour="shadow-btn" icon={MessagesSquare} label={t("shadow")} onClick={onShadow} />
        <HudBtn id="final-accusation-btn" tour="accuse-btn" icon={Gavel} label={t("accuse")} onClick={onAccuse} locked={!game.accusation_open} />
        <button data-testid="tutorial-help-btn" onClick={onHelp} className="btn-ghost rounded-full w-10 h-10 flex items-center justify-center" aria-label={t("help")}>
          <HelpCircle className="w-4 h-4" />
        </button>
        <SoundToggle />
        <LangToggle />
      </div>
    </header>
  );
};
