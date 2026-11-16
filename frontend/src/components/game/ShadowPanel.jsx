import { useEffect, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useLang } from "@/context/LangContext";
import { api, API, refreshSession } from "@/lib/api";
import { LogoMark } from "@/components/BrandFooter";

async function postHint(gameId, body, retry = true) {
  const res = await fetch(`${API}/games/${gameId}/hint`, {
    method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  if (res.status === 401 && retry) {
    await refreshSession();
    return postHint(gameId, body, false);
  }
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || "default");
  return res;
}

async function readStream(res, onDelta) {
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const parts = buf.split("\n\n");
    buf = parts.pop();
    parts.forEach((p) => {
      if (!p.startsWith("data: ")) return;
      const d = JSON.parse(p.slice(6));
      if (d.delta) onDelta(d.delta);
      if (d.error) throw new Error(d.error);
    });
  }
}

const Bubble = ({ q, a, teamName, pending }) => (
  <div className="space-y-2">
    <div className="ms-auto max-w-[85%] w-fit bg-[#F0F4F8] text-black text-sm px-4 py-2.5 rounded-2xl rounded-se-sm">
      <div className="text-[10px] opacity-60 mb-0.5">{teamName}</div>{q}
    </div>
    <div className="flex gap-2.5 max-w-[92%]">
      <LogoMark className="w-6 h-6 text-[#C0C7D0] shrink-0 mt-1" />
      <div className="bg-[#14171C] hairline text-[#E3E8EE] text-sm leading-relaxed px-4 py-3 rounded-2xl rounded-ss-sm whitespace-pre-wrap">
        {a || (pending && <Loader2 className="w-4 h-4 animate-spin text-[#8E95A2]" />)}
      </div>
    </div>
  </div>
);

export const ShadowPanel = ({ open, onOpenChange, game, onAfter }) => {
  const { t, lang, errMsg } = useLang();
  const [hints, setHints] = useState([]);
  const [msg, setMsg] = useState("");
  const [team, setTeam] = useState(game.turn);
  const [pending, setPending] = useState(null);
  const endRef = useRef(null);
  const asking = game.mode === "room" ? game.my_team : team;

  useEffect(() => {
    if (!open) return;
    setTeam(game.turn);
    api.get(`/games/${game.game_id}/hints`).then((r) => setHints(r.data)).catch(() => {});
  }, [open, game.game_id, game.turn]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [hints, pending]);

  const send = async (e) => {
    e.preventDefault();
    if (!msg.trim() || pending) return;
    const question = msg.trim();
    setMsg("");
    setPending({ question, answer: "", team: asking });
    try {
      const res = await postHint(game.game_id, { message: question, lang, team: asking });
      onAfter();
      let answer = "";
      await readStream(res, (d) => { answer += d; setPending((p) => ({ ...p, answer })); });
      setHints((h) => [...h, { question, answer, team: asking, hint_id: Date.now() }]);
    } catch (err) {
      toast.error(err.message === "SHADOW_UNAVAILABLE" ? t("shadowErr") : errMsg(err.message));
    } finally {
      setPending(null);
      onAfter();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={lang === "ar" ? "left" : "right"} dir={lang === "ar" ? "rtl" : "ltr"} data-testid="ai-shadow-panel" className="w-full sm:max-w-md bg-[#0B0C0F] border-white/10 p-0 flex flex-col">
        <SheetHeader className="p-6 pe-12 pb-4 border-b border-white/10 text-start">
          <SheetTitle className="font-display text-2xl text-white font-normal flex items-center gap-3"><LogoMark className="w-7 h-7 text-[#C0C7D0]" />{t("shadowTitle")}</SheetTitle>
          <SheetDescription className="text-xs text-[#8E95A2]">{t("shadowSub")}</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto tu-scroll p-5 space-y-6">
          {hints.length === 0 && !pending && <p className="font-serif-en italic text-[#8E95A2] text-center pt-10 px-6 leading-relaxed">{t("shadowEmpty")}</p>}
          {hints.map((h) => <Bubble key={h.hint_id} q={h.question} a={h.answer} teamName={game.teams[h.team].name} />)}
          {pending && <Bubble q={pending.question} a={pending.answer} teamName={game.teams[pending.team].name} pending />}
          <div ref={endRef} />
        </div>
        {game.status === "active" && (
          <form onSubmit={send} className="border-t border-white/10 p-4 pb-14 space-y-3">
            {game.mode === "local" && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[#8E95A2]">{t("askingTeam")}:</span>
                {game.teams.map((tm, i) => (
                  <button type="button" key={i} data-testid={`shadow-team-select-${i}`} data-active={team === i} onClick={() => setTeam(i)} className="btn-ghost rounded-full px-3 h-7">{tm.name}</button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                data-testid="ai-shadow-input"
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                maxLength={600}
                placeholder={t("shadowPh")}
                className="flex-1 min-w-0 h-11 bg-[#0E1014] hairline rounded-full px-4 text-sm outline-none focus:border-[#C0C7D0]/60"
              />
              <button data-testid="ai-shadow-hint-btn" disabled={!msg.trim() || !!pending} className="btn-silver shrink-0 rounded-full h-11 px-4 text-xs font-semibold flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 rtl:-scale-x-100" />{t("ask")}
              </button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
};
