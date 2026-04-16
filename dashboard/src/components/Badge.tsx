interface BadgeProps {
  label: string;
  className?: string;
}

export default function Badge({ label, className = "bg-slate-700 text-slate-300" }: BadgeProps) {
  return (
    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${className}`}>
      {label}
    </span>
  );
}
