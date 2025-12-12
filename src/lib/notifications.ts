import { database } from './firebase';
import { ref, push, set, onValue } from 'firebase/database';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'promotion' | 'news' | 'credits' | 'system';
  targetUserId?: string; // If null, sends to all users
  createdAt: string;
  read: boolean;
}

// Request notification permission
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

// Show browser notification
export const showBrowserNotification = (title: string, options?: NotificationOptions) => {
  if (Notification.permission === 'granted') {
    new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...options,
    });
  }
};

// Create notification in Firebase
export const createNotification = async (
  title: string,
  message: string,
  type: Notification['type'],
  targetUserId?: string
) => {
  try {
    const notificationRef = push(ref(database, 'notifications'));
    const notification: Omit<Notification, 'id'> = {
      title,
      message,
      type,
      targetUserId,
      createdAt: new Date().toISOString(),
      read: false,
    };
    await set(notificationRef, notification);
    return true;
  } catch (error) {
    console.error('Error creating notification:', error);
    return false;
  }
};

// Send promotion notification
export const sendPromotionNotification = async (productName: string, discount: number) => {
  return createNotification(
    '🔥 Nova Promoção!',
    `${productName} com ${discount}% de desconto! Aproveite agora.`,
    'promotion'
  );
};

// Send news notification
export const sendNewsNotification = async (title: string, description: string) => {
  return createNotification(
    '✨ Novidade!',
    description,
    'news'
  );
};

// Send credits notification
export const sendCreditsNotification = async (userId: string, amount: number, reason: string) => {
  return createNotification(
    '💰 Créditos Recebidos!',
    `Você recebeu ${amount} créditos: ${reason}`,
    'credits',
    userId
  );
};

// Get user notifications
export const getUserNotifications = (
  userId: string,
  callback: (notifications: Notification[]) => void
) => {
  const notificationsRef = ref(database, 'notifications');
  
  return onValue(notificationsRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const allNotifications = Object.entries(data).map(([id, value]: [string, any]) => ({
        id,
        ...value,
      })) as Notification[];

      // Filter notifications for this user (targetUserId matches or is null for broadcast)
      const userNotifications = allNotifications.filter(
        n => !n.targetUserId || n.targetUserId === userId
      );

      // Sort by date, newest first
      userNotifications.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      callback(userNotifications);
    } else {
      callback([]);
    }
  });
};

// Mark notification as read
export const markNotificationAsRead = async (notificationId: string) => {
  try {
    await set(ref(database, `notifications/${notificationId}/read`), true);
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
};

// Mark all notifications as read for a user
export const markAllNotificationsAsRead = async (userId: string, notificationIds: string[]) => {
  try {
    await Promise.all(
      notificationIds.map(id => 
        set(ref(database, `notifications/${id}/read`), true)
      )
    );
  } catch (error) {
    console.error('Error marking notifications as read:', error);
  }
};
