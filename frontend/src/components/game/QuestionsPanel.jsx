import { useState } from "react";
import { Check, Loader2, Lock, CircleDot } from "lucide-react";
import { toast } from "sonner";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useLang } from "@/context/LangContext";
import { postAction, errorCode } from "@/lib/api";

const MAX_TRIES = 2;

const Status = ({ st, closed, teams }) => {
  const { t } = useLang();
  if (st.solved_by !== null) return <span className="flex items-center gap-1 text-[11px] bg-white text-black px-2 py-0.5 rounded-full"><Check className="w-3 h-3" />{t("solvedBy", { t: teams[st.solved_by].name })}</span>;
  if (closed) return <span className="text-[11px] text-[#8E95A2] hairline px-2 py-0.5 rounded-full">{t("closedUnsolved")}</span>;
  return <CircleDot className="w-3.5 h-3.5 text-[#8E95A2]" />;
};

const AnswerForm = ({ q, game, onResult, canAct }) => {
  const { t, pick, errMsg } = useLang();
  const [val, setVal] = useState("");
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);
  const noTries = game.questions[q.id].tries[game.turn] >= MAX_TRIES;

  const submit = async () => {
    setBusy(true);
    try {
      const { data } = await postAction(`/games/${game.game_id}/answer`, { question_id: q.id, answer: val });
      if (!data.correct) { setShake(true); setTimeout(() => setShake(false), 450); }
      setVal("");
      onResult(data);
    } catch (e) {
      toast.error(errMsg(errorCode(e)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`space-y-3 ${shake ? "shake" : ""}`}>
      {q.type === "number" ? (
        <div dir="ltr" className="flex flex-col items-center gap-2 py-2">
          <span className="text-xs text-[#8E95A2]">{t("codeLabel")}</span>
          <InputOTP data-testid={`question-${q.id}-code-input`} maxLength={4} pattern={REGEXP_ONLY_DIGITS} value={val} onChange={setVal}>
            <InputOTPGroup>
              {[0, 1, 2, 3].map((i) => <InputOTPSlot key={i} index={i} className="w-12 h-14 text-xl font-mono-tu border-white/20 bg-[#0B0C0F]" />)}
            </InputOTPGroup>
          </InputOTP>
        </div>
      ) : (
        <div className="space-y-2">
          {q.options.map((o) => (
            <button
              key={o.id}
              data-testid={`question-${q.id}-option-${o.id}`}
              onClick={() => setVal(o.id)}
              className={`w-full text-start text-sm px-4 py-3 hairline rounded transition-colors ${val === o.id ? "bg-[#F0F4F8] text-black" : "bg-[#0B0C0F] hover:bg-[#14171C] text-[#C0C7D0]"}`}
            >
              {pick(o.label)}
            </button>
          ))}
        </div>
      )}
      <button
        data-testid={`question-${q.id}-submit-btn`}
        disabled={!val || busy || !canAct || noTries}
        onClick={submit}
        className="btn-silver w-full h-11 rounded-full text-sm font-semibold flex items-center justify-center gap-2"
      >
        {busy && <Loader2 className="w-4 h-4 animate-spin" />}
        {!canAct ? t("notYourTurn") : noTries ? t("err").NO_TRIES_LEFT : t("submit")}
      </button>
    </div>
  );
};

export const QuestionsPanel = ({ open, onOpenChange, game, caseData, closedIds, onResult, canAct }) => {
  const { t, pick, lang } = useLang();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={lang === "ar" ? "right" : "left"} dir={lang === "ar" ? "rtl" : "ltr"} data-testid="questions-panel" className="w-full sm:max-w-lg bg-[#0B0C0F] border-white/10 p-0 flex flex-col">
        <SheetHeader className="p-6 pe-12 pb-4 border-b border-white/10 text-start">
          <SheetTitle className="font-display text-2xl text-white font-normal">{t("questions")}</SheetTitle>
          <SheetDescription className="text-xs text-[#8E95A2] leading-relaxed">{t("qRules")}</SheetDescription>
          <div data-testid="questions-turn-indicator" className="mt-3 text-sm text-white bg-white/5 hairline rounded px-3 py-2">
            {t("answeringFor", { t: game.teams[game.turn].name })}
          </div>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto tu-scroll p-4 pb-16">
          <Accordion type="single" collapsible className="space-y-2">
            {caseData.questions.map((q, i) => {
              const st = game.questions[q.id];
              const closed = closedIds.includes(q.id);
              return (
                <AccordionItem key={q.id} value={q.id} data-testid={`question-item-${q.id}`} className="hairline bg-[#0E1014] px-4 border-b-0">
                  <AccordionTrigger className="hover:no-underline py-4 gap-3">
                    <div className="flex items-center gap-3 text-start flex-1">
                      <span className="font-mono-tu text-xs text-[#8E95A2]" dir="ltr">{String(i + 1).padStart(2, "0")}</span>
                      <span className="font-display text-base">{pick(q.title)}</span>
                      {q.type === "number" && <Lock className="w-3.5 h-3.5 text-[#8E95A2]" />}
                    </div>
                    <Status st={st} closed={closed} teams={game.teams} />
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pb-5">
                    <p className="text-[15px] text-white leading-relaxed">{pick(q.prompt)}</p>
                    <p className="text-xs text-[#A9B8CC] italic border-s border-[#A9B8CC]/40 ps-3">{t("direction")}: {pick(q.clue)}</p>
                    <div className="flex gap-4 text-[11px] text-[#8E95A2] font-mono-tu">
                      {game.teams.map((tm, j) => <span key={j}>{t("triesLeft", { a: tm.name, n: MAX_TRIES - st.tries[j] })}</span>)}
                    </div>
                    {closed ? (
                      game.explanations[q.id] && (
                        <div data-testid={`question-${q.id}-explanation`} className="bg-white/[0.04] hairline rounded p-4 text-sm text-[#C0C7D0] leading-relaxed">
                          <div className="font-mono-tu text-[10px] tracking-[0.25em] text-[#A9B8CC] mb-2 uppercase">{t("reasoning")}</div>
                          {pick(game.explanations[q.id])}
                        </div>
                      )
                    ) : (
                      game.status === "active" && <AnswerForm q={q} game={game} onResult={onResult} canAct={canAct} />
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      </SheetContent>
    </Sheet>
  );
};
