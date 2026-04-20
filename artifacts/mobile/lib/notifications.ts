import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { router } from "expo-router";

const CHANNEL_ID = "reminders";

try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch (err) {
  console.warn("[notifications] setNotificationHandler failed", err);
}

let initialized = false;

export async function initNotifications(): Promise<void> {
  if (initialized) return;
  initialized = true;
  console.log("[notifications] init start");

  try {
    const existing = await Notifications.getPermissionsAsync();
    if (existing.status !== "granted") {
      await Notifications.requestPermissionsAsync();
    }
  } catch (err) {
    console.warn("[notifications] permissions failed", err);
  }

  if (Platform.OS === "android") {
    try {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: "Relances prospects",
        importance: Notifications.AndroidImportance.HIGH,
        sound: "default",
        vibrationPattern: [0, 250, 250, 250],
        enableVibrate: true,
      });
    } catch (err) {
      console.warn("[notifications] setNotificationChannel failed", err);
    }
  }

  try {
    Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as { contactId?: number };
      if (data?.contactId) {
        router.push(`/contact/${data.contactId}` as never);
      }
    });
  } catch (err) {
    console.warn("[notifications] addListener failed", err);
  }
  console.log("[notifications] init done");
}

function identifierForAction(actionId: number): string {
  return `action-${actionId}`;
}

export async function scheduleActionReminder(params: {
  actionId: number;
  contactId: number;
  contactName: string;
  actionTitle: string;
  dueDate: string | null | undefined;
}): Promise<void> {
  await cancelActionReminder(params.actionId);
  if (!params.dueDate) return;

  const fireDate = new Date(params.dueDate);
  if (!Number.isFinite(fireDate.getTime()) || fireDate.getTime() <= Date.now()) {
    return;
  }

  try {
    await Notifications.scheduleNotificationAsync({
      identifier: identifierForAction(params.actionId),
      content: {
        title: `Relance : ${params.contactName}`,
        body: params.actionTitle,
        data: { contactId: params.contactId, actionId: params.actionId },
        sound: "default",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireDate,
        channelId: CHANNEL_ID,
      },
    });
  } catch (err) {
    console.warn("[notifications] scheduleNotification failed", err);
  }
}

export async function cancelActionReminder(actionId: number): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(identifierForAction(actionId));
  } catch {
    // no-op: identifier may not exist
  }
}

export async function cancelMultipleActionReminders(actionIds: number[]): Promise<void> {
  await Promise.all(actionIds.map((id) => cancelActionReminder(id)));
}
