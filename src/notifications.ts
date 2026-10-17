import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { hhmmToMinutes } from './utils';

const REMINDER_CHANNEL = 'hatirlatici';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function ensurePermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (
      current.granted ||
      current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
    ) {
      return true;
    }
    const asked = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    });
    return (
      asked.granted ||
      asked.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
    );
  } catch {
    return false;
  }
}

async function scheduleDailyReminder(time: string): Promise<boolean> {
  const minutes = hhmmToMinutes(time);
  if (minutes == null) return false;
  if (!(await ensurePermission())) return false;

  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL, {
        name: 'Günlük hatırlatıcı',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    } catch {
      // kanal kurulamazsa varsayılan kanal kullanılır
    }
  }

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Günlük hatırlatıcı',
        body: 'Bugünkü işlemlerini ve ders çalışmanı kaydetmeyi unutma.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: Math.floor(minutes / 60),
        minute: minutes % 60,
        ...(Platform.OS === 'android' ? { channelId: REMINDER_CHANNEL } : {}),
      },
    });
    return true;
  } catch {
    return false;
  }
}

export async function cancelAllReminders(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // sessizce yoksay
  }
}

export async function syncDailyReminder(enabled: boolean, time: string): Promise<boolean> {
  await cancelAllReminders();
  if (!enabled) return true;
  return scheduleDailyReminder(time);
}

export async function requestReminderPermission(): Promise<boolean> {
  return ensurePermission();
}
