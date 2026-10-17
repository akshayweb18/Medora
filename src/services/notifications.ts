import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import { Medicine } from '@/types';
import { isMedicineActiveOnDate, toDateStr } from '@/utils/date';

type NotificationsModule = typeof import('expo-notifications');
let _notifModule: NotificationsModule | null = null;
let _loadAttempted = false;

async function getNotif(): Promise<NotificationsModule | null> {
  if (_notifModule) return _notifModule;
  if (_loadAttempted) return null;
  if (Platform.OS === 'web') return null;
  try {
    _notifModule = await import('expo-notifications');
    return _notifModule;
  } catch (e) {
    _loadAttempted = true;
    console.warn('expo-notifications is not available in current runtime:', e);
    return null;
  }
}

// ─── Permission handling ───────────────────────────────────────────────────────
export async function requestNotificationPermission(): Promise<boolean> {
  const notif = await getNotif();
  if (!notif) return false;
  try {
    const { status: existing } = await notif.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await notif.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export async function hasNotificationPermission(): Promise<boolean> {
  const notif = await getNotif();
  if (!notif) return false;
  try {
    const { status } = await notif.getPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

// ─── Channel setup (Android) ──────────────────────────────────────────────────
export async function setupNotificationChannel() {
  const notif = await getNotif();
  if (!notif) return;
  try {
    notif.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    // In Expo Go on Android, NotificationsChannelsProvider is not registered and will throw a NullPointerException.
    // Custom channels require a standalone or development build.
    if (Platform.OS === 'android' && !isRunningInExpoGo()) {
      await notif.setNotificationChannelAsync('medicine-reminders', {
        name: 'Medicine Reminders',
        importance: notif.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2D9CDB',
        sound: 'default',
      });
    }
  } catch (e) {
    if (!isRunningInExpoGo()) {
      console.warn('Notification setup error:', e);
    }
  }
}

// ─── Schedule notifications for a medicine ────────────────────────────────────
/**
 * Schedules local notifications for the next N days for a medicine.
 * Old notifications for this medicine are cancelled first.
 */
export async function scheduleMedicineNotifications(
  medicine: Medicine,
  daysAhead = 7
): Promise<void> {
  const notif = await getNotif();
  if (!notif) return;

  const granted = await requestNotificationPermission();
  if (!granted) return;

  // Cancel existing notifications for this medicine
  await cancelMedicineNotifications(medicine.id);

  if (medicine.isArchived || medicine.frequency === 'as_needed') return;

  const today = new Date();
  const notificationIds: string[] = [];

  for (let dayOffset = 0; dayOffset < daysAhead; dayOffset++) {
    const date = new Date(today);
    date.setDate(today.getDate() + dayOffset);
    const dateStr = toDateStr(date);

    if (!isMedicineActiveOnDate(medicine.startDate, medicine.endDate, dateStr)) continue;

    // Check weekday constraint
    if (medicine.frequency === 'selected_weekdays' && medicine.weekdays) {
      if (!medicine.weekdays.includes(date.getDay())) continue;
    }

    for (const time of medicine.scheduledTimes) {
      const trigger = new Date(date);
      trigger.setHours(time.hour, time.minute, 0, 0);

      // Don't schedule notifications in the past
      if (trigger <= new Date()) continue;

      try {
        const id = await notif.scheduleNotificationAsync({
          content: {
            title: `💊 Time to take ${medicine.name}`,
            body: medicine.dosageInstructions || `${medicine.name}${medicine.strength ? ` ${medicine.strength}` : ''}`,
            data: { medicineId: medicine.id, scheduledFor: trigger.toISOString() },
            sound: 'default',
            ...(Platform.OS === 'android' && !isRunningInExpoGo() && { channelId: 'medicine-reminders' }),
          },
          trigger: {
            type: notif.SchedulableTriggerInputTypes.DATE,
            date: trigger,
          },
        });
        notificationIds.push(id);
      } catch (e) {
        console.warn('Failed to schedule notification:', e);
      }
    }
  }

  _medicineNotificationMap[medicine.id] = notificationIds;
}

/** Cancel all scheduled notifications for a medicine. */
export async function cancelMedicineNotifications(medicineId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  const notif = await getNotif();
  if (!notif) return;
  const ids = _medicineNotificationMap[medicineId] ?? [];
  for (const id of ids) {
    try { await notif.cancelScheduledNotificationAsync(id); } catch {}
  }
  delete _medicineNotificationMap[medicineId];
}

/** Cancel all MediVault notifications. */
export async function cancelAllMedicineNotifications(): Promise<void> {
  if (Platform.OS === 'web') return;
  const notif = await getNotif();
  if (!notif) return;
  try {
    await notif.cancelAllScheduledNotificationsAsync();
  } catch (e) {
    console.warn('cancelAllMedicineNotifications error:', e);
  }
  Object.keys(_medicineNotificationMap).forEach(k => delete _medicineNotificationMap[k]);
}

// Module-level map (cleared on app restart — acceptable for local notifications)
const _medicineNotificationMap: Record<string, string[]> = {};

// ─── Notification response listener ──────────────────────────────────────────
export function addNotificationResponseListener(
  handler: (response: any) => void
): { remove: () => void } {
  try {
    if (Platform.OS !== 'web' && _notifModule && typeof _notifModule.addNotificationResponseReceivedListener === 'function') {
      return _notifModule.addNotificationResponseReceivedListener(handler);
    }
  } catch (e) {
    console.warn('addNotificationResponseReceivedListener error:', e);
  }
  return { remove: () => {} };
}
