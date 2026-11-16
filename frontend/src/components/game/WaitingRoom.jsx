import { motion } from "framer-motion";
import { Copy, Link2 } from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/context/LangContext";
import { TopBar } from "@/components/TopBar";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RichText } from "@/components/game/RichText";
import { ASSETS } from "@/lib/assets";

const copy = (text, msg) => navigator.clipboard?.writeText(text).then(() => toast(msg)).catch(() => {});

export const WaitingRoom = ({ game }) => {
  const { t } = useLang();
  const link = `${window.location.origin}/join?code=${game.room_code}`;
  return (
    <div className="min-h-screen pb-16" data-testid="waiting-room">
      <TopBar />
      <div className="flex flex-col items-center text-center px-6 pt-16">
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2.4, repeat: Infinity }} className="w-3 h-3 rounded-full bg-white mb-8 shadow-[0_0_20px_white]" />
        <h1 className="font-display text-4xl sm:text-5xl silver-text">{t("waitTitle")}</h1>
        <p className="text-[#8E95A2] mt-4 max-w-md">{t("waitSub")}</p>
        <div className="mt-12 font-mono-tu text-xs tracking-[0.3em] text-[#8E95A2]">{t("roomCode")}</div>
        <div data-testid="room-code-display" dir="ltr" className="mt-3 font-mono-tu text-5xl sm:text-6xl tracking-[0.35em] text-white hairline px-8 py-5 bg-[#0E1014]">{game.room_code}</div>
        <div className="flex flex-wrap justify-center gap-3 mt-8">
          <button data-testid="copy-room-code-btn" onClick={() => copy(game.room_code, t("copied"))} className="btn-ghost rounded-full h-11 px-5 text-sm flex items-center gap-2"><Copy className="w-4 h-4" />{t("copy")}</button>
          <button data-testid="copy-invite-link-btn" onClick={() => copy(link, t("copied"))} className="btn-silver rounded-full h-11 px-6 text-sm font-semibold flex items-center gap-2"><Link2 className="w-4 h-4" />{t("shareLink")}</button>
        </div>
        <div className="mt-12 flex gap-10 text-sm">
          {game.teams.map((tm, i) => <span key={i} className={i === 0 ? "text-white" : "text-[#5b606b]"}>{tm.name}</span>)}
        </div>
      </div>
    </div>
  );
};

export const BriefingDialog = ({ open, onClose, caseData }) => {
  const { t, pick, lang } = useLang();
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent data-testid="briefing-dialog" dir={lang === "ar" ? "rtl" : "ltr"} className="max-w-2xl p-0 bg-[#0B0C0F] border-white/10 overflow-hidden max-h-[88vh] flex flex-col">
        <div className="relative h-44 shrink-0">
          <img src={ASSETS[caseData.briefing_image || "victim"]} alt="" className="absolute inset-0 w-full h-full object-cover object-top grayscale opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0C0F] to-transparent" />
          <span className="absolute top-5 start-6 font-mono-tu text-[10px] tracking-[0.35em] bg-white text-black px-2 py-1">CASE {caseData.number} · CLASSIFIED</span>
        </div>
        <div className="p-7 sm:p-9 pt-2 overflow-y-auto tu-scroll">
          <DialogTitle className="font-display text-3xl sm:text-4xl font-normal silver-text">{pick(caseData.title)}</DialogTitle>
          <DialogDescription className="font-serif-en italic text-[#A9B8CC] text-lg mt-1 mb-6" dir="ltr">{caseData.title.en}</DialogDescription>
          <RichText text={pick(caseData.briefing)} />
          <button data-testid="briefing-start-btn" onClick={onClose} className="btn-silver h-12 px-8 rounded-full font-semibold mt-8">{t("briefingGo")}</button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
