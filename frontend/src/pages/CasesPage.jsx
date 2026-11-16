import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Clock, Users, Trophy } from "lucide-react";
import { useLang } from "@/context/LangContext";
import { TopBar } from "@/components/TopBar";
import { api } from "@/lib/api";
import { ASSETS } from "@/lib/assets";

const CaseCard = ({ c, onOpen }) => {
  const { pick, t, lang } = useLang();
  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      data-testid={`case-card-${c.id}`}
      onClick={onOpen}
      className="group relative text-start overflow-hidden hairline w-full grid md:grid-cols-[1.1fr_1fr] min-h-[340px] bg-[#0B0C0F] hover:border-[#C0C7D0]/40 transition-colors"
    >
      <div className="relative z-10 p-8 sm:p-12 flex flex-col">
        <span className="font-mono-tu text-xs tracking-[0.35em] text-[#8E95A2]">CASE {c.number}</span>
        <h2 className="font-display text-3xl sm:text-4xl mt-4">{pick(c.title)}</h2>
        <p className="font-serif-en italic text-[#A9B8CC] text-lg mt-1" dir="ltr">{c.title.en}</p>
        <p className="text-[#C0C7D0] mt-6 leading-relaxed max-w-md">{pick(c.tagline)}</p>
        <div className="mt-auto pt-8 flex flex-wrap items-center gap-5 text-xs text-[#8E95A2]">
          <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{pick(c.duration)}</span>
          <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />2</span>
          <span className="hairline rounded-full px-3 py-1">{pick(c.difficulty)}</span>
          <span className="ms-auto flex items-center gap-2 text-white text-sm group-hover:gap-3 transition-all">{t("caseOpen")} <Arrow className="w-4 h-4" /></span>
        </div>
      </div>
      <div className="relative min-h-[220px]">
        <img src={ASSETS[c.cover_key]} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-[opacity,transform] duration-700" />
        <div className="absolute inset-0 bg-gradient-to-l from-transparent to-[#0B0C0F] rtl:bg-gradient-to-r" />
      </div>
    </motion.button>
  );
};

export default function CasesPage() {
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [games, setGames] = useState([]);

  useEffect(() => {
    api.get("/cases").then((r) => setCases(r.data));
    api.get("/games").then((r) => setGames(r.data.filter((g) => g.status !== "finished")));
  }, []);

  return (
    <div className="min-h-screen pb-20" data-testid="cases-page">
      <TopBar />
      <main className="px-6 sm:px-12 lg:px-24 pt-8">
        <h1 className="font-display text-4xl sm:text-5xl silver-text">{t("casesTitle")}</h1>
        <p className="text-[#8E95A2] mt-3 mb-12">{t("casesSub")}</p>
        <div className="space-y-6">
          {cases.map((c) => (
            <div key={c.id} className="relative">
              <CaseCard c={c} onOpen={() => navigate(`/setup/${c.id}`)} />
              <button data-testid={`case-leaderboard-btn-${c.id}`} onClick={() => navigate(`/leaderboard/${c.id}`)} className="absolute top-5 end-5 z-20 glass btn-ghost rounded-full h-9 px-4 text-xs flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5" />{t("leaderboard")}
              </button>
            </div>
          ))}
        </div>
        {games.length > 0 && (
          <section className="mt-16">
            <h2 className="text-sm text-[#A9B8CC] mb-5 font-mono-tu tracking-widest uppercase">{t("resume")}</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {games.map((g) => (
                <button
                  key={g.game_id}
                  data-testid={`resume-game-${g.game_id}`}
                  onClick={() => navigate(`/game/${g.game_id}`)}
                  className="hairline text-start p-5 bg-[#0E1014] hover:bg-[#14171C] transition-colors"
                >
                  <div className="flex justify-between text-xs text-[#8E95A2] mb-3">
                    <span>{t(`m_${g.mode}`)}{g.room_code ? ` · ${g.room_code}` : ""}</span>
                    <span>{t(`st_${g.status}`)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    {g.teams.map((tm, i) => (
                      <span key={i}>{tm.name} <b className="font-mono-tu">{tm.score}</b></span>
                    ))}
                  </div>
                  <div className="mt-3 text-xs text-white/80">{t("resumeBtn")} {lang === "ar" ? "←" : "→"}</div>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
