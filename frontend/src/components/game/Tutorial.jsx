import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLang } from "@/context/LangContext";

const TARGETS = ["board", "card-victim", "thread-btn", "scores", "questions-btn", "shadow-btn", "accuse-btn", "card-autopsy"];

export const Tutorial = ({ open, onClose, startTip }) => {
  const { t } = useLang();
  const base = t("tour");
  const steps = startTip ? [...base.slice(0, -1), [base[base.length - 1][0], startTip]] : base;
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);

  const measure = useCallback(() => {
    const el = document.querySelector(`[data-tour="${TARGETS[i]}"]`);
    if (!el) return setRect(null);
    const r = el.getBoundingClientRect();
    const pad = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const x = Math.max(4, r.left - pad);
    const y = Math.max(4, r.top - pad);
    return setRect({ x, y, w: Math.min(vw - 8, r.right + pad) - x, h: Math.min(vh - 52, r.bottom + pad) - y });
  }, [i]);

  useEffect(() => { if (open) setI(0); }, [open]);

  useLayoutEffect(() => {
    if (!open) return undefined;
    const el = document.querySelector(`[data-tour="${TARGETS[i]}"]`);
    el?.scrollIntoView?.({ block: "center", inline: "center", behavior: "smooth" });
    const timer = setTimeout(measure, 380);
    window.addEventListener("resize", measure);
    return () => { clearTimeout(timer); window.removeEventListener("resize", measure); };
  }, [open, i, measure]);

  if (!open) return null;
  const last = i === steps.length - 1;
  const big = rect && rect.h > window.innerHeight * 0.5;
  const below = rect && rect.y + rect.h + 220 < window.innerHeight;
  const tipW = Math.min(340, window.innerWidth - 24);
  const tipStyle = !rect || big
    ? { left: (window.innerWidth - tipW) / 2, top: Math.max(12, window.innerHeight / 2 - 120) }
    : { left: Math.min(Math.max(12, rect.x), window.innerWidth - tipW - 12), top: below ? rect.y + rect.h + 14 : Math.max(12, rect.y - 214) };

  return (
    <div className="fixed inset-0 z-[70]" data-testid="tutorial-overlay">
      {rect ? (
        <motion.div
          animate={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
          transition={{ type: "spring", stiffness: 220, damping: 28 }}
          className="absolute rounded-md border border-[#F0F4F8]/70 pointer-events-none"
          style={{ boxShadow: "0 0 0 9999px rgba(4,5,7,.78), 0 0 40px rgba(240,244,248,.25)" }}
        />
      ) : <div className="absolute inset-0 bg-black/80" />}
      <motion.div
        key={i}
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="absolute bg-[#0E1014] hairline p-6 shadow-2xl"
        style={{ ...tipStyle, width: tipW }}
      >
        <div className="flex items-center justify-between font-mono-tu text-[10px] tracking-[0.3em] text-[#8E95A2] mb-3">
          <span>TOUR</span><span dir="ltr">{i + 1} / {steps.length}</span>
        </div>
        <h3 data-testid="tutorial-step-title" className="font-display text-xl mb-2">{steps[i][0]}</h3>
        <p className="text-sm text-[#C0C7D0] leading-relaxed">{steps[i][1]}</p>
        <div className="flex items-center gap-2 mt-6">
          <button data-testid="tutorial-skip-btn" onClick={onClose} className="text-xs text-[#8E95A2] hover:text-white transition-colors me-auto">{t("skip")}</button>
          {i > 0 && <button data-testid="tutorial-prev-btn" onClick={() => setI(i - 1)} className="btn-ghost rounded-full h-9 px-4 text-xs">{t("prev")}</button>}
          <button data-testid="tutorial-next-btn" onClick={() => (last ? onClose() : setI(i + 1))} className="btn-silver rounded-full h-9 px-5 text-xs font-semibold">
            {last ? t("done") : t("next")}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
