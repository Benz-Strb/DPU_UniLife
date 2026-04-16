interface FilterTabsProps {
  items: { label: string; value: string }[];
  active: string;
  onChange: (value: string) => void;
}

export default function FilterTabs({ items, active, onChange }: FilterTabsProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {items.map(item => (
        <button
          key={item.value}
          onClick={() => onChange(item.value)}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition ${
            active === item.value
              ? "bg-violet-600 text-white"
              : "bg-slate-800 text-slate-400 hover:bg-slate-700"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
