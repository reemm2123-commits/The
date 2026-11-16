import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, MonitorSmartphone, Radio, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/context/LangContext";
import { TopBar } from "@/components/TopBar";
import { api, errorCode } from "@/lib/api";

const TABS = [
  { id: "local", icon: MonitorSmartphone, label: "tabLocal", desc: "localDesc" },
  { id: "room", icon: Radio, label: "tabRoom", desc: "roomDesc" },
  { id: "join", icon: KeyRound, label: "tabJoin", desc: "joinDesc" },
];

const Input = (props) => (
  <input {...props} className="w-full h-12 bg-[#0E1014] hairline rounded px-4 text-sm text-white outline-none focus:border-[#C0C7D0]/60 transition-colors" />
);

export default function SetupPage() {
  const { caseId } = useParams();
  const [params] = useSearchParams();
  const { t, errMsg } = useLang();
  const navigate = useNavigate();
  const [tab, setTab] = useState(caseId ? "local" : "join");
  const [names, setNames] = useState([t("team1d"), t("team2d")]);
  const [code, setCode] = useState(params.get("code") || "");
  const [busy, setBusy] = useState(false);
  const tabs = caseId ? TABS : TABS.filter((x) => x.id === "join");
  const current = TABS.find((x) => x.id === tab);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = tab === "join"
        ? await api.post("/games/join", { code })
        : await api.post("/games", { case_id: caseId, mode: tab, team_names: names });
      navigate(`/game/${data.game_id}`);
    } catch (err) {
      toast.error(errMsg(errorCode(err)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen pb-20" data-testid="setup-page">
      <TopBar />
      <main className="px-6 sm:px-12 lg:px-24 pt-6 max-w-5xl">
        <h1 className="font-display text-4xl sm:text-5xl silver-text">{t("setupTitle")}</h1>
        <div className="grid md:grid-cols-3 gap-3 mt-12">
          {tabs.map((x) => (
            <button
              key={x.id}
              data-testid={`setup-tab-${x.id}`}
              onClick={() => setTab(x.id)}
              className={`text-start p-6 hairline transition-colors ${tab === x.id ? "bg-[#F0F4F8] text-black" : "bg-[#0E1014] hover:bg-[#14171C]"}`}
            >
              <x.icon className="w-5 h-5 mb-5" />
              <div className="font-display text-lg">{t(x.label)}</div>
            </button>
          ))}
        </div>
        <motion.form key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onSubmit={submit} className="mt-10 max-w-xl space-y-5">
          <p className="text-[#C0C7D0] text-sm leading-relaxed">{t(current.desc)}</p>
          {tab === "join" ? (
            <label className="block">
              <span className="text-xs text-[#8E95A2] mb-2 block">{t("roomCode")}</span>
              <input
                data-testid="join-code-input"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={6}
                required
                dir="ltr"
                className="w-full h-16 bg-[#0E1014] hairline rounded px-4 text-center font-mono-tu text-3xl tracking-[0.5em] text-white outline-none focus:border-[#C0C7D0]/60"
              />
            </label>
          ) : (
            [0, 1].map((i) => (
              <label key={i} className="block">
                <span className="text-xs text-[#8E95A2] mb-2 block">{t(i ? "team2" : "team1")}</span>
                <Input
                  data-testid={`team-name-input-${i + 1}`}
                  value={names[i]}
                  maxLength={30}
                  required
                  onChange={(e) => setNames(names.map((n, j) => (j === i ? e.target.value : n)))}
                />
              </label>
            ))
          )}
          <button data-testid="setup-submit-btn" disabled={busy} className="btn-silver h-14 px-10 rounded-full font-semibold flex items-center gap-2">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {tab === "local" ? t("openFile") : tab === "room" ? t("createRoom") : t("joinBtn")}
          </button>
        </motion.form>
      </main>
    </div>
  );
}
