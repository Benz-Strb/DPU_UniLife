import TopNav from "./TopNav";

interface LayoutProps {
  page: string;
  onNavigate: (page: string) => void;
  user: any;
  onLogout: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  children: React.ReactNode;
}

// Layout หลักของ dashboard ที่ครอบ top navigation และพื้นที่แสดงเนื้อหาของแต่ละหน้า
export default function Layout({ page, onNavigate, user, onLogout, isDark, onToggleTheme, children }: LayoutProps) {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950 text-white" data-theme={isDark ? "dark" : "light"}>
      <TopNav
        page={page}
        user={user}
        isDark={isDark}
        onToggleTheme={onToggleTheme}
        onLogout={onLogout}
        onHome={() => onNavigate("home")}
      />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
