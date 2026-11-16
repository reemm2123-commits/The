import { useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useLang } from "@/context/LangContext";
import { postAction, errorCode } from "@/lib/api";
import { ASSETS } from "@/lib/assets";

const Choice = ({ id, active, onClick, children }) => (
  <button
    data-testid={id}
    onClick={onClick}
    className={`w-full text-start text-sm px-4 py-3 hairline rounded transition-colors ${active ? "bg-[#F0F4F8] text-black" : "bg-[#0B0C0F] hover:bg-[#14171C] text-[#C0C7D0]"}`}
  >
    {children}
  </button>
);

const Section = ({ n, title, children }) => (
  <section>
    <h3 className="flex items-center gap-3 font-display text-lg mb-3"><span className="font-mono-tu text-xs text-[#8E95A2]">0{n}</span>{title}</h3>
    {children}
  </section>
);

export const AccusationDialog = ({ open, onOpenChange, game, caseData, closedCount, canAct, onResult }) => {
  const { t, pick, errMsg, lang } = useLang();
  const [sel, setSel] = useState({ suspect: null, motive: null, method: null });
  const [busy, setBusy] = useState(false);
  const acc = caseData.accusation;
  const people = Object.fromEntries(caseData.evidence.map((e) => [e.id, e]));
  const used = game.teams[game.turn].accused;

  const submit = async () => {
    setBusy(true);
    try {
      const { data } = await postAction(`/games/${game.game_id}/accuse`, sel);
      onResult(data);
      if (!data.correct) toast(t("accWrong"));
      setSel({ suspect: null, motive: null, method: null });
      onOpenChange(false);
    } catch (e) {
      toast.error(errMsg(errorCode(e)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="accusation-dialog" dir={lang === "ar" ? "rtl" : "ltr"} className="max-w-3xl bg-[#0B0C0F] border-white/10 max-h-[88vh] overflow-y-auto tu-scroll p-7 sm:p-10">
        <DialogTitle className="font-display text-3xl font-normal silver-text pe-10">{t("accTitle")}</DialogTitle>
        <DialogDescription className="text-sm text-[#8E95A2]">{t("accWarn")}</DialogDescription>
        {!game.accusation_open ? (
          <div data-testid="accusation-locked" className="py-14 text-center space-y-5">
            <Lock className="w-8 h-8 mx-auto text-[#8E95A2]" />
            <p className="text-[#C0C7D0]">{t("accLocked", { n: caseData.accusation_threshold, c: closedCount })}</p>
            <div className="h-1 bg-white/10 max-w-xs mx-auto rounded-full overflow-hidden">
              <div className="h-full bg-[#F0F4F8] transition-[width] duration-700" style={{ width: `${Math.min(100, (closedCount / caseData.accusation_threshold) * 100)}%` }} />
            </div>
          </div>
        ) : (
          <div className="space-y-8 mt-4">
            <Section n={1} title={t("accSuspect")}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {acc.suspects.map((id) => (
                  <button
                    key={id}
                    data-testid={`accuse-suspect-${id}`}
                    onClick={() => setSel({ ...sel, suspect: id })}
                    className={`group relative aspect-[3/4] overflow-hidden hairline transition-[box-shadow] ${sel.suspect === id ? "ring-2 ring-white shadow-[0_0_30px_rgba(240,244,248,.35)]" : ""}`}
                  >
                    <img src={ASSETS[people[id].image_key]} alt="" className={`absolute inset-0 w-full h-full object-cover grayscale transition-opacity ${sel.suspect === id ? "opacity-100" : "opacity-50 group-hover:opacity-80"}`} />
                    <span className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black p-2 pt-8 text-xs text-white">{pick(people[id].title)}</span>
                  </button>
                ))}
              </div>
            </Section>
            <Section n={2} title={t("accMotive")}>
              <div className="space-y-2">{acc.motives.map((m) => <Choice key={m.id} id={`accuse-motive-${m.id}`} active={sel.motive === m.id} onClick={() => setSel({ ...sel, motive: m.id })}>{pick(m.label)}</Choice>)}</div>
            </Section>
            <Section n={3} title={t("accMethod")}>
              <div className="space-y-2">{acc.methods.map((m) => <Choice key={m.id} id={`accuse-method-${m.id}`} active={sel.method === m.id} onClick={() => setSel({ ...sel, method: m.id })}>{pick(m.label)}</Choice>)}</div>
            </Section>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                data-testid="accuse-submit-btn"
                disabled={busy || !canAct || used || !sel.suspect || !sel.motive || !sel.method}
                onClick={submit}
                className="btn-silver h-12 px-8 rounded-full font-semibold flex items-center gap-2"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}{t("accSubmit")}
              </button>
              <span className="text-xs text-[#8E95A2]">
                {!canAct ? t("notYourTurn") : used ? t("accUsed") : t("answeringFor", { t: game.teams[game.turn].name })}
              </span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
