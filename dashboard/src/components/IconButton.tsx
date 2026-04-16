import type { ReactNode } from "react";

type IconButtonVariant = "danger" | "success" | "warning" | "info" | "default";

const variantClasses: Record<IconButtonVariant, string> = {
  danger:  "text-red-400 hover:bg-red-600/10",
  success: "text-emerald-400 hover:bg-emerald-600/10",
  warning: "text-orange-400 hover:bg-orange-600/10",
  info:    "text-violet-400 hover:bg-violet-600/10",
  default: "text-slate-400 hover:bg-slate-700",
};

interface IconButtonProps {
  icon: ReactNode;
  onClick: () => void;
  variant?: IconButtonVariant;
  title?: string;
  disabled?: boolean;
}

export default function IconButton({ icon, onClick, variant = "default", title, disabled = false }: IconButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-2 rounded-lg transition disabled:opacity-40 ${variantClasses[variant]}`}
    >
      {icon}
    </button>
  );
}
