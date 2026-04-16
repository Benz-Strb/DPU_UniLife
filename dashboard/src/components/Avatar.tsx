const BASE_URL = "http://localhost:8080";

type AvatarSize = "xs" | "sm" | "md";
type AvatarVariant = "violet" | "slate";

const sizeMap: Record<AvatarSize, { wrapper: string; text: string }> = {
  xs: { wrapper: "w-7 h-7", text: "text-[11px]" },
  sm: { wrapper: "w-8 h-8", text: "text-xs" },
  md: { wrapper: "w-9 h-9", text: "text-sm" },
};

const variantMap: Record<AvatarVariant, { bg: string; text: string }> = {
  violet: { bg: "bg-violet-600/20", text: "text-violet-400" },
  slate:  { bg: "bg-slate-700",     text: "text-slate-400" },
};

interface AvatarProps {
  avatarUrl?: string;
  name?: string;
  size?: AvatarSize;
  variant?: AvatarVariant;
  className?: string;
}

export default function Avatar({ avatarUrl, name, size = "sm", variant = "violet", className = "" }: AvatarProps) {
  const { wrapper, text } = sizeMap[size];
  const { bg, text: textColor } = variantMap[variant];
  const src = avatarUrl
    ? avatarUrl.startsWith("http") ? avatarUrl : `${BASE_URL}${avatarUrl}`
    : null;

  return (
    <div className={`${wrapper} ${bg} rounded-xl flex items-center justify-center overflow-hidden shrink-0 ${className}`}>
      {src ? (
        <img src={src} className="w-full h-full object-cover" />
      ) : (
        <span className={`${textColor} font-black ${text}`}>{name?.charAt(0) ?? "?"}</span>
      )}
    </div>
  );
}
