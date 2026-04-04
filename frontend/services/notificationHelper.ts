// Mock notification helper to avoid Expo Go SDK 53 errors
export const requestNotificationPermissions = async () => {
  console.log("Notifications: Permission requested (Mock)");
  return true;
};

export const scheduleCourseReminders = async (courseName: string, schedules: any[]) => {
  console.log(`Notifications: Scheduled reminder for ${courseName} (Mock)`);
};

export const cancelAllNotifications = async () => {
  console.log("Notifications: Cancelled all (Mock)");
};
