import { useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "sonner";
import "@/App.css";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { LangProvider } from "@/context/LangContext";
import { api } from "@/lib/api";
import { BrandFooter } from "@/components/BrandFooter";
import { Loader } from "@/components/Loader";
import Landing from "@/pages/Landing";
import AuthPage from "@/pages/AuthPage";
import CasesPage from "@/pages/CasesPage";
import SetupPage from "@/pages/SetupPage";
import GamePage from "@/pages/GamePage";
import LeaderboardPage from "@/pages/LeaderboardPage";
import { ForgotPasswordPage, ResetPasswordPage } from "@/pages/PasswordPages";

const AuthCallback = () => {
  const done = useRef(false);
  const navigate = useNavigate();
  const { setUser } = useAuth();
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const sid = new URLSearchParams(window.location.hash.slice(1)).get("session_id");
    api.post("/auth/google/session", { session_id: sid })
      .then(({ data }) => { setUser(data); navigate("/cases", { replace: true }); })
      .catch(() => { setUser(false); navigate("/auth", { replace: true }); });
  }, [navigate, setUser]);
  return <Loader />;
};

const Protected = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  if (user === null) return <Loader />;
  if (!user) return <Navigate to="/auth" state={{ from: location.pathname + location.search }} replace />;
  return children;
};

const AppRouter = () => {
  const location = useLocation();
  if (location.hash?.includes("session_id=")) return <AuthCallback />;
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/leaderboard/:caseId" element={<Protected><LeaderboardPage /></Protected>} />
      <Route path="/cases" element={<Protected><CasesPage /></Protected>} />
      <Route path="/setup/:caseId" element={<Protected><SetupPage /></Protected>} />
      <Route path="/join" element={<Protected><SetupPage /></Protected>} />
      <Route path="/game/:gameId" element={<Protected><GamePage /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <LangProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="tu-root grain">
            <AppRouter />
            <BrandFooter />
          </div>
          <Toaster position="bottom-center" offset={64} theme="dark" toastOptions={{ className: "tu-toast" }} />
        </BrowserRouter>
      </AuthProvider>
    </LangProvider>
  );
}

export default App;
