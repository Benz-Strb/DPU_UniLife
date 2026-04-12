import { LayoutDashboard, Users, FileText, Flag, ScrollText, Settings2, ArrowRight } from "lucide-react";

const sections = [
  {
    id: "dashboard",
    icon: LayoutDashboard,
    label: "Dashboard",
    description: "ภาพรวมสถิติระบบ ผู้ใช้งาน โพสต์ และรายงาน",
    color: "from-violet-600 to-violet-800",
    iconBg: "bg-violet-500/20",
    size: "col-span-2 row-span-2",
  },
  {
    id: "users",
    icon: Users,
    label: "User Management",
    description: "จัดการผู้ใช้งาน ระงับบัญชี และดูข้อมูลสมาชิก",
    color: "from-blue-600 to-blue-800",
    iconBg: "bg-blue-500/20",
    size: "col-span-1 row-span-1",
  },
  {
    id: "posts",
    icon: FileText,
    label: "Posts",
    description: "ดูและลบโพสต์ในระบบ",
    color: "from-emerald-600 to-emerald-800",
    iconBg: "bg-emerald-500/20",
    size: "col-span-1 row-span-1",
  },
  {
    id: "reports",
    icon: Flag,
    label: "Report Center",
    description: "จัดการรายงานที่ user แจ้งเข้ามา",
    color: "from-rose-600 to-rose-800",
    iconBg: "bg-rose-500/20",
    size: "col-span-1 row-span-1",
  },
  {
    id: "logs",
    icon: ScrollText,
    label: "Activity Logs",
    description: "ประวัติการ login ของผู้ใช้งานทั้งหมด",
    color: "from-amber-600 to-amber-800",
    iconBg: "bg-amber-500/20",
    size: "col-span-1 row-span-1",
  },
  {
    id: "settings",
    icon: Settings2,
    label: "System Settings",
    description: "ตั้งค่าระบบ maintenance mode และ config",
    color: "from-slate-600 to-slate-800",
    iconBg: "bg-slate-500/20",
    size: "col-span-2 row-span-1",
    superAdminOnly: true,
  },
];

interface HomeProps {
  onNavigate: (page: string) => void;
  user: any;
}

export default function Home({ onNavigate, user }: HomeProps) {
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const visible = sections.filter((s: any) => !s.superAdminOnly || isSuperAdmin);

  return (
    <div className="p-8 h-full">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-white">Welcome back, {user?.fullName?.split(" ")[0]} 👋</h1>
        <p className="text-slate-400 text-sm mt-1">เลือก section ที่ต้องการจัดการ</p>
      </div>

      <div className="grid grid-cols-4 grid-rows-3 gap-4 h-[calc(100%-5rem)]">
        {visible.map((section: any) => {
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              onClick={() => onNavigate(section.id)}
              className={`${section.size} relative group rounded-3xl bg-gradient-to-br ${section.color} p-6 text-left overflow-hidden transition-all duration-200 hover:scale-[1.02] hover:shadow-2xl`}
            >
              {/* Background decoration */}
              <div className="absolute -bottom-6 -right-6 w-32 h-32 rounded-full bg-white/5" />
              <div className="absolute -top-4 -left-4 w-20 h-20 rounded-full bg-black/10" />

              {/* Icon */}
              <div className={`w-11 h-11 rounded-2xl ${section.iconBg} border border-white/20 flex items-center justify-center mb-4`}>
                <Icon size={22} className="text-white" />
              </div>

              {/* Text */}
              <p className="text-white font-black text-lg leading-tight">{section.label}</p>
              <p className="text-white/60 text-xs font-medium mt-1 leading-relaxed">{section.description}</p>

              {/* Arrow */}
              <div className="absolute bottom-5 right-5 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight size={14} className="text-white" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
