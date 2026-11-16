import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useLang } from "@/context/LangContext";
import { ASSETS } from "@/lib/assets";
import { RichText } from "@/components/game/RichText";

export const EvidenceModal = ({ item, onClose }) => {
  const { pick, lang } = useLang();
  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        data-testid="evidence-modal"
        dir={lang === "ar" ? "rtl" : "ltr"}
        className="max-w-3xl p-0 bg-[#0E1014] border-white/10 overflow-hidden max-h-[88vh] flex flex-col sm:flex-row gap-0"
      >
        {item?.image_key && (
          <div className="sm:w-2/5 shrink-0 bg-black relative">
            <img src={ASSETS[item.image_key]} alt="" className="w-full h-56 sm:h-full object-cover grayscale" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0E1014] via-transparent to-transparent sm:bg-gradient-to-l rtl:sm:bg-gradient-to-r" />
          </div>
        )}
        {item && (
          <div className="flex-1 overflow-y-auto tu-scroll p-7 sm:p-9">
            <span className="font-mono-tu text-[10px] tracking-[0.3em] text-[#8E95A2] uppercase">EVIDENCE · {item.id}</span>
            <DialogTitle data-testid="evidence-modal-title" className="font-display text-2xl sm:text-3xl mt-3 text-white font-normal">{pick(item.title)}</DialogTitle>
            <DialogDescription className="text-sm text-[#A9B8CC] mt-1 mb-6">{pick(item.subtitle)}</DialogDescription>
            <div data-testid="evidence-modal-body"><RichText text={pick(item.body)} /></div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
