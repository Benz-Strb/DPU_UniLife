import Avatar from "./Avatar";

type AvatarSize = "xs" | "sm" | "md";
type AvatarVariant = "violet" | "slate";

interface UserCellProps {
  name?: string;
  username?: string;
  sub?: string;
  avatarUrl?: string;
  avatarSize?: AvatarSize;
  avatarVariant?: AvatarVariant;
}

export default function UserCell({ name, username, sub, avatarUrl, avatarSize = "sm", avatarVariant = "violet" }: UserCellProps) {
  const subtitle = sub ?? (username ? `@${username}` : undefined);
  return (
    <div className="flex items-center gap-2.5">
      <Avatar avatarUrl={avatarUrl} name={name} size={avatarSize} variant={avatarVariant} />
      <div>
        <p className="text-white text-sm font-bold">{name ?? "—"}</p>
        {subtitle && <p className="text-slate-500 text-xs">{subtitle}</p>}
      </div>
    </div>
  );
}
