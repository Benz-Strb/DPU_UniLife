import { useState } from "react";
import Login from "./pages/Login";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Admins from "./pages/Admins";
import Posts from "./pages/Posts";
import Reports from "./pages/Reports";
import Logs from "./pages/Logs";
import Settings from "./pages/Settings";
import Home from "./pages/Home";

const STORAGE_KEY = "dpu-admin-user";
const THEME_KEY = "dpu-admin-theme";

function getStoredUser() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch { return null; }
}

// Root component ของ admin dashboard สำหรับจัดการ session, theme และเลือกหน้าที่จะแสดง
export default function App() {
  const [user, setUser] = useState<any>(getStoredUser);
  const [page, setPage] = useState("home");
  const [isDark, setIsDark] = useState(() => localStorage.getItem(THEME_KEY) !== "light");

  const toggleTheme = () => {
    setIsDark(prev => {
      const next = !prev;
      localStorage.setItem(THEME_KEY, next ? "dark" : "light");
      return next;
    });
  };

  const handleLogin = (u: any) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    setUser(u);
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    setPage("home");
  };

  if (!user) return <Login onLogin={handleLogin} />;

  const renderPage = () => {
    switch (page) {
      case "home": return <Home onNavigate={setPage} user={user} />;
      case "dashboard": return <Dashboard />;
      case "users": return <Users currentUser={user} />;
      case "admins": return <Admins currentUser={user} />;
      case "posts": return <Posts currentUser={user} />;
      case "reports": return <Reports currentUser={user} />;
      case "logs": return <Logs />;
      case "settings": return <Settings currentUser={user} />;
      default: return <Home onNavigate={setPage} user={user} />;
    }
  };

  return (
    <Layout page={page} onNavigate={setPage} user={user} onLogout={handleLogout} isDark={isDark} onToggleTheme={toggleTheme}>
      {renderPage()}
    </Layout>
  );
}
