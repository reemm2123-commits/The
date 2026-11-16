import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Trophy, Timer } from "lucide-react";
import { useLang } from "@/context/LangContext";
import { TopBar } from "@/components/TopBar";
import { api } from "@/lib/api";

const fmt = (s) => (s == null ? "—" : `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`);

const Row = ({ r, i, metric }) => (
  <motion.tr
    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
    data-testid={`leaderboard-row-${i}`}
    className={`border-b border-white/5 ${r.mine ? "bg-white/[0.05]" : ""}`}
  >
    <td className="py-4 ps-4 font-mono-tu text-sm text-[#8E95A2]"><span dir="ltr">{String(i + 1).padStart(2, "0")}</span></td>
    <td className="py-4 text-white">{i < 3 && <Trophy className={`inline w-3.5 h-3.5 me-2 ${i === 0 ? "text-white" : "text-[#8E95A2]"}`} />}<bdi>{r.team}</bdi>{" "}<span className="text-xs text-[#5b606b]">· vs <bdi>{r.rival}</bdi></span></td>
    <td className={`py-4 pe-4 font-mono-tu tabular-nums ${metric === "score" ? "text-white text-lg" : "text-[#C0C7D0]"}`}><span dir="ltr">{r.score}</span></td>
    <td className={`py-4 pe-4 font-mono-tu tabular-nums ${metric === "time" ? "text-white text-lg" : "text-[#C0C7D0]"}`}><span dir="ltr">{fmt(r.duration_s)}</span></td>
    <td className="py-4 pe-4 text-xs text-[#8E95A2] hidden sm:table-cell"><span dir="ltr">{r.date.slice(0, 10)}</span></td>
  </motion.tr>
);

export default function LeaderboardPage() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const { t, pick } = useLang();
  const [cases, setCases] = useState([]);
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("score");

  useEffect(() => { api.get("/cases").then((r) => setCases(r.data)); }, []);
  useEffect(() => { setData(null); api.get(`/leaderboard/${caseId}`).then((r) => setData(r.data)).catch(() => setData({ top_score: [], fastest: [], total_solved: 0 })); }, [caseId]);

  const rows = data ? (tab === "score" ? data.top_score : data.fastest) : [];

  return (
    <div className="min-h-screen pb-20" data-testid="leaderboard-page">
      <TopBar />
      <main className="px-6 sm:px-12 lg:px-24 pt-6 max-w-5xl mx-auto">
        <h1 className="font-display text-4xl sm:text-5xl silver-text">{t("lbTitle")}</h1>
        <p className="text-[#8E95A2] mt-3">{t("lbSub")}</p>
        <div className="flex flex-wrap gap-2 mt-10">
          {cases.map((c) => (
            <button key={c.id} data-testid={`leaderboard-case-${c.id}`} data-active={c.id === caseId} onClick={() => navigate(`/leaderboard/${c.id}`)} className="btn-ghost rounded-full h-10 px-5 text-sm">
              {c.number} · {pick(c.title)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-6 mt-8 border-b border-white/10">
          {[["score", Trophy, "lbScore"], ["time", Timer, "lbFastest"]].map(([id, Icon, label]) => (
            <button key={id} data-testid={`leaderboard-tab-${id}`} onClick={() => setTab(id)} className={`pb-3 text-sm flex items-center gap-2 border-b-2 transition-colors ${tab === id ? "border-white text-white" : "border-transparent text-[#8E95A2] hover:text-white"}`}>
              <Icon className="w-4 h-4" />{t(label)}
            </button>
          ))}
          {data && <span className="ms-auto pb-3 text-xs text-[#8E95A2]">{t("lbSolved", { n: data.total_solved })}</span>}
        </div>
        {!data ? (
          <div data-testid="leaderboard-loading" className="py-20 flex justify-center"><div className="h-px w-32 bg-gradient-to-r from-transparent via-[#C0C7D0] to-transparent animate-pulse" /></div>
        ) : rows.length === 0 ? (
          <p data-testid="leaderboard-empty" className="py-20 text-center font-serif-en italic text-[#8E95A2]">{t("lbEmpty")}</p>
        ) : (
          <table className="w-full text-start mt-2">
            <thead>
              <tr className="text-[11px] text-[#8E95A2] font-mono-tu uppercase">
                <th className="py-3 ps-4 text-start">#</th><th className="text-start">{t("team")}</th>
                <th className="text-start">{t("pts")}</th><th className="text-start">{t("lbTime")}</th><th className="text-start hidden sm:table-cell">{t("lbDate")}</th>
              </tr>
            </thead>
            <tbody>{rows.map((r, i) => <Row key={`${r.date}-${i}`} r={r} i={i} metric={tab} />)}</tbody>
          </table>
        )}
      </main>
    </div>
  );
}
