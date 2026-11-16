import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Trophy } from "lucide-react";
import { useLang } from "@/context/LangContext";
import { ASSETS } from "@/lib/assets";

export const ResultOverlay = ({ game, caseData, onClose }) => {
  const { t, pick } = useLang();
  const navigate = useNavigate();
  const acc = caseData.accusation;
  const ans = game.accusation_answer;
  const killer = caseData.evidence.find((e) => e.id === ans.suspect);
  const winner = game.winner === -1 ? t("resTie") : game.teams[game.winner].name;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      data-testid="result-overlay"
      className="fixed inset-0 z-[45] bg-[#08090B]/95 backdrop-blur-xl overflow-y-auto tu-scroll pb-16"
    >
      <div className="max-w-5xl mx-auto px-6 py-14 grid lg:grid-cols-[1fr_1.3fr] gap-12">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
          <span className="font-mono-tu text-xs tracking-[0.35em] text-[#8E95A2]">CASE {caseData.number} · CLOSED</span>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl silver-text mt-4">{t("resTitle")}</h1>
          <div className="mt-10 hairline p-6 bg-[#0E1014]">
            <div className="flex items-center gap-2 text-xs text-[#8E95A2] mb-2"><Trophy className="w-4 h-4" />{t("resWinner")}</div>
            <div data-testid="result-winner" className="font-display text-3xl">{winner}</div>
            <div className="mt-6 grid grid-cols-2 gap-px bg-white/10">
              {game.teams.map((tm, i) => (
                <div key={i} className={`p-4 ${game.winner === i ? "bg-[#F0F4F8] text-black" : "bg-[#0B0C0F]"}`}>
                  <div className="text-xs opacity-70">{tm.name}</div>
                  <div data-testid={`result-score-${i}`} className="font-mono-tu text-2xl font-semibold" dir="ltr">{tm.score}</div>
                </div>
              ))}
            </div>
            <p className="text-sm text-[#C0C7D0] mt-5">
              {game.solved_by !== null ? t("resSolved", { t: game.teams[game.solved_by].name }) : t("resUnsolved")}
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <button data-testid="result-new-game-btn" onClick={() => navigate(`/setup/${caseData.id}`)} className="btn-silver h-12 px-7 rounded-full font-semibold">{t("newGame")}</button>
            <button data-testid="result-cases-btn" onClick={() => navigate("/cases")} className="btn-ghost h-12 px-6 rounded-full text-sm">{t("toCases")}</button>
            <button data-testid="result-leaderboard-btn" onClick={() => navigate(`/leaderboard/${caseData.id}`)} className="btn-ghost h-12 px-6 rounded-full text-sm">{t("leaderboard")}</button>
            <button data-testid="result-view-board-btn" onClick={onClose} className="btn-ghost h-12 px-6 rounded-full text-sm">{t("viewBoard")}</button>
          </div>
        </motion.div>
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.45 }}>
          <div className="flex gap-5 items-end mb-8">
            <img src={ASSETS[killer.image_key]} alt="" className="w-28 h-36 object-cover grayscale hairline" />
            <div className="space-y-1.5 text-sm">
              <div className="font-display text-2xl">{pick(killer.title)}</div>
              <div className="text-[#A9B8CC]">{pick(acc.motives.find((m) => m.id === ans.motive).label)}</div>
              <div className="text-[#8E95A2]">{pick(acc.methods.find((m) => m.id === ans.method).label)}</div>
            </div>
          </div>
          <h2 className="font-mono-tu text-xs tracking-[0.3em] text-[#A9B8CC] uppercase mb-4">{t("truth")}</h2>
          <p data-testid="result-solution" className="text-[#E3E8EE] leading-loose whitespace-pre-line">{pick(game.solution)}</p>
        </motion.div>
      </div>
    </motion.div>
  );
};
