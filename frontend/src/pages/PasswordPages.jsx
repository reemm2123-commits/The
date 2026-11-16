import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/context/LangContext";
import { TopBar } from "@/components/TopBar";
import { api, errorCode } from "@/lib/api";

const Shell = ({ title, sub, children }) => (
  <div className="min-h-screen pb-20" data-testid="password-page">
    <TopBar />
    <main className="flex justify-center px-6 pt-16">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-3xl sm:text-4xl silver-text mb-3">{title}</h1>
        <p className="text-sm text-[#8E95A2] mb-9 leading-relaxed">{sub}</p>
        {children}
      </div>
    </main>
  </div>
);

const inputCls = "w-full h-12 bg-[#0E1014] hairline rounded px-4 text-sm text-white outline-none focus:border-[#C0C7D0]/60 transition-colors";

export const ForgotPasswordPage = () => {
  const { t, lang, errMsg } = useLang();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/auth/forgot-password", { email, lang });
      setSent(true);
    } catch (err) {
      toast.error(errMsg(errorCode(err)));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Shell title={t("forgotTitle")} sub={t("forgotSub")}>
      {sent ? (
        <p data-testid="forgot-sent-message" className="text-sm text-white bg-white/5 hairline rounded p-4 leading-relaxed">{t("forgotSent")}</p>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <input data-testid="forgot-email-input" type="email" required dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("email")} className={inputCls} />
          <button data-testid="forgot-submit-btn" disabled={busy} className="btn-silver w-full h-12 rounded-full font-semibold flex items-center justify-center gap-2">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}{t("forgotBtn")}
          </button>
        </form>
      )}
      <Link to="/auth" data-testid="back-to-login-link" className="block mt-8 text-xs text-[#8E95A2] hover:text-white transition-colors">{t("backToLogin")}</Link>
    </Shell>
  );
};

export const ResetPasswordPage = () => {
  const { t, errMsg } = useLang();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (pw !== pw2) return toast.error(t("pwMismatch"));
    setBusy(true);
    try {
      await api.post("/auth/reset-password", { token: params.get("token") || "", password: pw });
      toast(t("resetDone"));
      navigate("/auth", { replace: true });
    } catch (err) {
      toast.error(errMsg(errorCode(err)));
    } finally {
      setBusy(false);
    }
    return null;
  };
  return (
    <Shell title={t("resetTitle")} sub={t("resetSub")}>
      <form onSubmit={submit} className="space-y-5">
        <input data-testid="reset-password-input" type="password" required minLength={6} dir="ltr" value={pw} onChange={(e) => setPw(e.target.value)} placeholder={t("newPassword")} className={inputCls} />
        <input data-testid="reset-password-confirm-input" type="password" required minLength={6} dir="ltr" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder={t("confirmPassword")} className={inputCls} />
        <button data-testid="reset-submit-btn" disabled={busy} className="btn-silver w-full h-12 rounded-full font-semibold flex items-center justify-center gap-2">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}{t("resetBtn")}
        </button>
      </form>
    </Shell>
  );
};
