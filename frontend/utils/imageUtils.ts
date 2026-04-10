import { BASE_URL } from "@/services/api";

export const DEFAULT_AVATAR = `https://ui-avatars.com/api/?name=${encodeURIComponent("User")}&background=7C3AED&color=fff`;

/** สำหรับ avatar — ถ้าไม่มี url ใช้ ui-avatars fallback พร้อม name */
export const getAvatarUrl = (url: string | null | undefined, name?: string): string => {
  if (!url) {
    if (name) return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=7C3AED&color=fff`;
    return DEFAULT_AVATAR;
  }
  if (url.startsWith("http")) return url;
  return `${BASE_URL}${url}`;
};

/** สำหรับ media/post image — ถ้าไม่มี url คืน undefined */
export const getImageUrl = (url: string | null | undefined): string | undefined => {
  if (!url) return undefined;
  if (url.startsWith("http")) return url;
  return `${BASE_URL}${url}`;
};
