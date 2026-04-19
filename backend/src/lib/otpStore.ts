// เก็บ OTP ใน memory — key: email, value: { otp, expiresAt }
const store = new Map<string, { otp: string; expiresAt: number }>();

const OTP_TTL_MS = 10 * 60 * 1000; // 10 นาที

export const setOtp = (email: string, otp: string) => {
  store.set(email, { otp, expiresAt: Date.now() + OTP_TTL_MS });
};

export const verifyOtp = (email: string, otp: string): boolean => {
  const entry = store.get(email);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    store.delete(email);
    return false;
  }
  return entry.otp === otp;
};

export const deleteOtp = (email: string) => {
  store.delete(email);
};
