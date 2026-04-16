interface PageHeaderProps {
  title: string;
  description?: string;
  className?: string;
}

export default function PageHeader({ title, description, className = "mb-6" }: PageHeaderProps) {
  return (
    <div className={className}>
      <h1 className="text-2xl font-black text-white">{title}</h1>
      {description && <p className="text-slate-400 text-sm mt-1">{description}</p>}
    </div>
  );
}
