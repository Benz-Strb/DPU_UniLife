// Mock notification helper to avoid Expo Go SDK 53 errors
export const scheduleCourseReminders = async (courseName: string, _schedules: any[]) => {
  console.log(`Notifications: Scheduled reminder for ${courseName} (Mock)`);
};
