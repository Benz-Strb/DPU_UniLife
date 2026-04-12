import { useState } from "react";
import Login from "./pages/Login";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Posts from "./pages/Posts";
import Reports from "./pages/Reports";
import Logs from "./pages/Logs";

const STORAGE_KEY = "dpu-admin-user";

function getStoredUser() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch { return null; }
}

export default function App() {
  const [user, setUser] = useState<any>(getStoredUser);
  const [page, setPage] = useState("dashboard");

  const handleLogin = (u: any) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    setUser(u);
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    setPage("dashboard");
  };

  if (!user) return <Login onLogin={handleLogin} />;

  const renderPage = () => {
    switch (page) {
      case "dashboard": return <Dashboard />;
      case "users": return <Users currentUser={user} />;
      case "posts": return <Posts currentUser={user} />;
      case "reports": return <Reports currentUser={user} />;
      case "logs": return <Logs />;
      default: return <Dashboard />;
    }
  };

  return (
    <Layout page={page} onNavigate={setPage} user={user} onLogout={handleLogout}>
      {renderPage()}
    </Layout>
  );
}
