import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, LayoutGrid, MessagesSquare, ScrollText, Gavel } from "lucide-react";
import { useLang } from "@/context/LangContext";
import { useAuth } from "@/context/AuthContext";
import { TopBar } from "@/components/TopBar";
import { ASSETS } from "@/lib/assets";

const STEPS = [
  { icon: LayoutGrid, t: "how1t", d: "how1d" },
  { icon: ScrollText, t: "how2t", d: "how2d" },
  { icon: MessagesSquare, t: "how3t", d: "how3d" },
  { icon: Gavel, t: "how4t", d: "how4d" },
];

export default function Landing() {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const navigate = useNavigate();
  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;
  const go = () => navigate(user ? "/cases" : "/auth");

  return (
    <div className="pb-16" data-testid="landing-page">
      <section className="relative min-h-[92vh] flex flex-col overflow-hidden">
        <img src={ASSETS.hero} alt="" className="absolute inset-0 w-full h-full object-cover opacity-45 scale-105" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#08090B]/60 via-[#08090B]/70 to-[#08090B]" />
        <div className="absolute inset-0 bg-gradient-to-l from-[#08090B]/90 via-transparent to-transparent rtl:bg-gradient-to-r" />
        <TopBar />
        <div className="relative z-10 flex-1 flex items-center px-6 sm:px-12 lg:px-24">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9 }} className="max-w-2xl">
            <p data-testid="hero-kicker" className="font-mono-tu text-[11px] tracking-[0.3em] uppercase text-[#A9B8CC] mb-6 flex items-center gap-3">
              <span className="h-px w-10 bg-[#A9B8CC]/60" /> {t("heroKicker")}
            </p>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-[1.15] whitespace-pre-line silver-text">{t("heroTitle")}</h1>
            <p className="mt-7 text-base sm:text-lg text-[#C0C7D0] leading-relaxed max-w-xl">{t("heroSub")}</p>
            <div className="mt-10 flex flex-wrap items-center gap-5">
              <button data-testid="start-investigation-btn" onClick={go} className="btn-silver rounded-full h-14 px-9 text-base font-semibold flex items-center gap-3">
                {t("start")} <Arrow className="w-5 h-5" />
              </button>
              <span className="text-xs text-[#8E95A2] max-w-[16rem] leading-relaxed">{t("heroMeta")}</span>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="px-6 sm:px-12 lg:px-24 py-24">
        <h2 className="font-display text-base md:text-lg text-[#A9B8CC] tracking-wide mb-14 flex items-center gap-4">
          <span className="font-mono-tu text-xs text-[#8E95A2]">//</span> {t("howTitle")}
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-white/5 hairline">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.t}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12 }}
              data-testid={`how-step-${i + 1}`}
              className="bg-[#0B0C0F] p-8 group hover:bg-[#101217] transition-colors"
            >
              <div className="flex items-center justify-between mb-10">
                <s.icon className="w-6 h-6 text-[#C0C7D0] group-hover:text-white transition-colors" />
                <span className="font-mono-tu text-xs text-[#8E95A2]">0{i + 1}</span>
              </div>
              <h3 className="font-display text-xl mb-3">{t(s.t)}</h3>
              <p className="text-sm text-[#8E95A2] leading-relaxed">{t(s.d)}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="px-6 sm:px-12 lg:px-24 pb-24">
        <div className="relative overflow-hidden hairline grid lg:grid-cols-5">
          <div className="lg:col-span-3 p-10 sm:p-14 relative z-10">
            <span className="font-mono-tu text-xs tracking-[0.3em] text-[#8E95A2]">CASE 01</span>
            <h3 className="font-display text-3xl sm:text-4xl mt-4 mb-2">{lang === "ar" ? "الأرشيف الفضي" : "The Silver Archive"}</h3>
            <p className="font-serif-en italic text-[#A9B8CC] text-lg mb-6" dir="ltr">The Silver Archive</p>
            <p className="text-[#C0C7D0] leading-relaxed max-w-lg">
              {lang === "ar" ? "مخطوط واحد. أربعة وجوه. حقيقة واحدة مدفونة بين الصفحات." : "One manuscript. Four faces. One truth buried between the pages."}
            </p>
            <button data-testid="landing-open-case-btn" onClick={go} className="btn-ghost rounded-full h-11 px-6 mt-9 text-sm flex items-center gap-2">
              {t("caseOpen")} <Arrow className="w-4 h-4" />
            </button>
          </div>
          <div className="lg:col-span-2 relative min-h-[260px]">
            <img src={ASSETS.scene} alt="" className="absolute inset-0 w-full h-full object-cover opacity-70" />
            <div className="absolute inset-0 bg-gradient-to-l from-transparent to-[#08090B] rtl:bg-gradient-to-r" />
          </div>
        </div>
      </section>
    </div>
  );
}
