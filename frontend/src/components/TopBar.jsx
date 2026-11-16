import { Link, useNavigate } from "react-router-dom";
import { LogOut, Languages, Download } from "lucide-react";
import { API, api } from "@/lib/api";

const downloadZip = async (e) => {
  e.preventDefault();
  const { data } = await api.get("/admin/export-zip", { responseType: "blob" });
  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = "the-unknown.zip";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};
import { useLang } from "@/context/LangContext";
import { useAuth } from "@/context/AuthContext";
import { LogoMark } from "@/components/BrandFooter";

export const LangToggle = ({ className = "" }) => {
  const { lang, setLang } = useLang();
  return (
    <button
      data-testid="lang-toggle-btn"
      onClick={() => setLang(lang === "ar" ? "en" : "ar")}
      className={`btn-ghost rounded-full h-9 px-3 text-xs flex items-center gap-1.5 ${className}`}
    >
      <Languages className="w-3.5 h-3.5" />
      {lang === "ar" ? "EN" : "عربي"}
    </button>
  );
};

export const TopBar = () => {
  const { user, logout } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  return (
    <header className="relative z-20 flex items-center justify-between px-5 sm:px-10 py-5">
      <Link to="/" data-testid="topbar-home-link" className="flex items-center gap-2.5 text-[#C0C7D0] hover:text-white transition-colors">
        <LogoMark className="w-7 h-7" />
        <span dir="ltr" className="font-brand text-xs tracking-[0.35em] hidden sm:inline">THE UNKNOWN</span>
      </Link>
      <div className="flex items-center gap-2">
        <LangToggle />
        {user && (
          <>
            {user.is_admin && (
              <a data-testid="export-zip-btn" href={`${API}/admin/export-zip`} onClick={downloadZip} className="btn-silver rounded-full h-9 px-4 text-xs font-semibold flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5" /> {t("exportZip")}
              </a>
            )}
            <span data-testid="topbar-user-name" className="hidden sm:inline text-xs text-[#8E95A2] px-2">{user.name}</span>
            <button
              data-testid="logout-btn"
              onClick={async () => { await logout(); navigate("/"); }}
              className="btn-ghost rounded-full h-9 px-3 text-xs flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" /> {t("logout")}
            </button>
          </>
        )}
      </div>
    </header>
  );
};
