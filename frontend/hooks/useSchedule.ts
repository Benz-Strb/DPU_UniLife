import { useState, useEffect, useCallback } from 'react';
import { scheduleService } from '@/services/api';
import { useUser } from '@/store/UserContext';
import { handleApiError } from '@/services/errorHandler';
import * as Haptics from 'expo-haptics';

export function useSchedule() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scheduleData, setScheduleData] = useState<any[]>([]);

  const fetchSchedule = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await scheduleService.getSchedule(user.id);
      setScheduleData(data);
    } catch (error) {
      handleApiError(error, "ไม่สามารถโหลดตารางเรียนได้");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const deleteCourse = useCallback(async (courseId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    try {
      await scheduleService.deleteCourse(courseId);
      await fetchSchedule();
    } catch (error) {
      handleApiError(error, "ไม่สามารถลบวิชาได้");
    }
  }, [fetchSchedule]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSchedule();
  }, [fetchSchedule]);

  return {
    scheduleData,
    loading,
    refreshing,
    onRefresh,
    deleteCourse,
    fetchSchedule
  };
}
