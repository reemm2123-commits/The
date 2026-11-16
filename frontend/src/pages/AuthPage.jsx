import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useLang } from "@/context/LangContext";
import { useAuth } from "@/context/AuthContext";
import { TopBar } from "@/components/TopBar";
import { api, errorCode } from "@/lib/api";
import { ASSETS } from "@/lib/assets";

const Field = ({ id, label, ...props }) => (
  <label className="block">
    <span className="text-xs text-[#8E95A2] mb-2 block">{label}</span>
    <input
      id={id}
      data-testid={id}
      {...props}
      className="w-full h-12 bg-[#0E1014] hairline rounded px-4 text-sm text-white placeholder:text-[#5b606b] outline-none focus:border-[#C0C7D0]/60 transition-colors"
    />
  </label>
);

export default function AuthPage() {
  const { t, errMsg } = useLang();
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dest = location.state?.from || "/cases";

  if (user) return <Navigate to={dest} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const body = mode === "login" ? { email: form.email, password: form.password } : form;
      const { data } = await api.post(`/auth/${mode}`, body);
      setUser(data);
      navigate(dest, { replace: true });
    } catch (err) {
      setError(errMsg(errorCode(err)));
    } finally {
      setBusy(false);
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="relative min-h-screen pb-14 grid lg:grid-cols-2" data-testid="auth-page">
      <div className="absolute inset-x-0 top-0 z-30"><TopBar /></div>
      <div className="flex flex-col pt-20">
        <div className="flex-1 flex items-center justify-center px-6 py-10">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
            <h1 className="font-display text-3xl sm:text-4xl silver-text mb-3">{t("authTitle")}</h1>
            <p className="text-sm text-[#8E95A2] mb-9">{t("authSub")}</p>
            <div className="grid grid-cols-2 mb-8 hairline rounded-full p-1">
              {["login", "register"].map((m) => (
                <button
                  key={m}
                  data-testid={`auth-tab-${m}`}
                  onClick={() => { setMode(m); setError(""); }}
                  className={`h-10 rounded-full text-sm transition-colors ${mode === m ? "bg-[#F0F4F8] text-black font-semibold" : "text-[#C0C7D0] hover:text-white"}`}
                >
                  {t(m)}
                </button>
              ))}
            </div>
            <form onSubmit={submit} className="space-y-5">
              {mode === "register" && <Field id="register-name-input" label={t("name")} value={form.name} onChange={set("name")} required maxLength={60} />}
              <Field id="login-email-input" label={t("email")} type="email" value={form.email} onChange={set("email")} required dir="ltr" />
              <Field id="login-password-input" label={t("password")} type="password" value={form.password} onChange={set("password")} required minLength={6} dir="ltr" />
              {mode === "login" && <Link to="/forgot-password" data-testid="login-forgot-password-link" className="block text-xs text-[#8E95A2] hover:text-white transition-colors -mt-2">{t("forgot")}</Link>}
              {error && <p data-testid="auth-error" className="text-sm text-[#F0F4F8] bg-white/5 hairline rounded px-3 py-2">{error}</p>}
              <button data-testid="login-submit-button" disabled={busy} className="btn-silver w-full h-12 rounded-full font-semibold flex items-center justify-center gap-2">
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                {mode === "login" ? t("loginBtn") : t("registerBtn")}
              </button>
            </form>
          </motion.div>
        </div>
      </div>
      <div className="hidden lg:block relative overflow-hidden">
        <img src={ASSETS.layan} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-l from-transparent via-[#08090B]/30 to-[#08090B] rtl:bg-gradient-to-r" />
        <p className="absolute bottom-20 inset-x-12 font-serif-en italic text-2xl text-[#C0C7D0]/80" dir="ltr">"Everyone in this house is hiding something."</p>
      </div>
    </div>
  );
}
