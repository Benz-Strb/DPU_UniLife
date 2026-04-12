import Sidebar from "./Sidebar";

interface LayoutProps {
  page: string;
  onNavigate: (page: string) => void;
  user: any;
  onLogout: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  children: React.ReactNode;
}

export default function Layout({ page, onNavigate, user, onLogout, isDark, onToggleTheme, children }: LayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-950" data-theme={isDark ? "dark" : "light"}>
      <Sidebar page={page} onNavigate={onNavigate} user={user} onLogout={onLogout} isDark={isDark} onToggleTheme={onToggleTheme} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
