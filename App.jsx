import { AuthProvider, useAuth } from "./AuthPage.jsx";
import AuthPage from "./AuthPage.jsx";
import AdminDashboard from "./AdminDashboard.jsx";
import UserDashboard from "./UserDashboard.jsx";

function AppRouter() {
  const { isAuthenticated, user, ready } = useAuth();

  if (!ready) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "#0b0f18", fontFamily: "serif", fontSize: 28, color: "#38c4b8",
        fontStyle: "italic", letterSpacing: "-.02em"
      }}>
        <em>Libra</em>rium
      </div>
    );
  }

  if (!isAuthenticated) return <AuthPage />;

  return user?.role === "admin" ? <AdminDashboard /> : <UserDashboard />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
