import Sidebar from "./Sidebar";

interface LayoutProps {
  page: string;
  onNavigate: (page: string) => void;
  user: any;
  onLogout: () => void;
  children: React.ReactNode;
}

export default function Layout({ page, onNavigate, user, onLogout, children }: LayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      <Sidebar page={page} onNavigate={onNavigate} user={user} onLogout={onLogout} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
