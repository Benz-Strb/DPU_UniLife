export const roleBadge: Record<string, string> = {
  STUDENT: "bg-slate-700 text-slate-300",
  ADMIN: "bg-violet-600/20 text-violet-400",
  SUPER_ADMIN: "bg-amber-600/20 text-amber-400",
};

export const userStatusBadge: Record<string, string> = {
  ACTIVE: "bg-emerald-600/20 text-emerald-400",
  SUSPENDED: "bg-red-600/20 text-red-400",
  DEACTIVATED: "bg-slate-700 text-slate-400",
  PENDING: "bg-amber-600/20 text-amber-400",
};

export const reportStatusBadge: Record<string, string> = {
  OPEN: "bg-red-600/20 text-red-400",
  IN_REVIEW: "bg-amber-600/20 text-amber-400",
  RESOLVED: "bg-emerald-600/20 text-emerald-400",
  DISMISSED: "bg-slate-700 text-slate-400",
};

export const visibilityBadge: Record<string, string> = {
  PUBLIC: "bg-emerald-600/20 text-emerald-400",
  FRIENDS: "bg-blue-600/20 text-blue-400",
  PRIVATE: "bg-slate-700 text-slate-400",
};

export const loginStatusBadge: Record<string, string> = {
  SUCCESS: "bg-emerald-600/20 text-emerald-400",
  FAILED: "bg-red-600/20 text-red-400",
};
