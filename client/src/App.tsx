import { useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import OnboardingPage from "./pages/OnboardingPage";
import MainApp from "./pages/MainApp";
import { colors } from "./utils/theme";

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: colors.bg, color: colors.text }}>
        <span style={{ fontSize: 14, color: colors.textDim }}>Cargando…</span>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  const profileComplete = Boolean(user.bio && user.zoneId);
  if (!profileComplete) return <OnboardingPage />;

  return <MainApp />;
}
