import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Sparkles, Tag, Coins, Info, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  getUserNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  requestNotificationPermission,
  showBrowserNotification,
  Notification 
} from '@/lib/notifications';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [lastNotificationCount, setLastNotificationCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = getUserNotifications(user.uid, (notifs) => {
      setNotifications(notifs);

      // Show browser notification for new unread notifications
      const unreadCount = notifs.filter(n => !n.read).length;
      if (unreadCount > lastNotificationCount) {
        const newestNotif = notifs.find(n => !n.read);
        if (newestNotif) {
          showBrowserNotification(newestNotif.title, {
            body: newestNotif.message,
          });
        }
      }
      setLastNotificationCount(unreadCount);
    });

    // Request permission for browser notifications
    requestNotificationPermission();

    return () => unsubscribe();
  }, [user, lastNotificationCount]);

  const handleMarkAsRead = async (id: string) => {
    await markNotificationAsRead(id);
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    await markAllNotificationsAsRead(user.uid, unreadIds);
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'promotion':
        return <Tag className="w-5 h-5 text-yellow-500" />;
      case 'news':
        return <Sparkles className="w-5 h-5 text-blue-500" />;
      case 'credits':
        return <Coins className="w-5 h-5 text-green-500" />;
      default:
        return <Info className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Agora';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}min`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return date.toLocaleDateString('pt-BR');
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-sm bg-card z-50 shadow-2xl"
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-foreground" />
                <h2 className="font-semibold text-foreground">Notificações</h2>
                {unreadCount > 0 && (
                  <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-sm text-primary hover:underline"
                  >
                    Marcar todas
                  </button>
                )}
                <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto h-[calc(100%-60px)]">
              {notifications.length > 0 ? (
                <div className="divide-y divide-border">
                  {notifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-4 ${!notification.read ? 'bg-primary/5' : ''}`}
                    >
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-background flex items-center justify-center">
                          {getIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-medium text-foreground text-sm">{notification.title}</h3>
                            {!notification.read && (
                              <button
                                onClick={() => handleMarkAsRead(notification.id)}
                                className="flex-shrink-0 p-1 text-primary hover:bg-primary/10 rounded"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">{notification.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">{formatTime(notification.createdAt)}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Bell className="w-12 h-12 mb-2 opacity-20" />
                  <p>Nenhuma notificação</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NotificationCenter;

// Hook for notification badge count
export const useUnreadNotificationCount = () => {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setCount(0);
      return;
    }

    const unsubscribe = getUserNotifications(user.uid, (notifs) => {
      setCount(notifs.filter(n => !n.read).length);
    });

    return () => unsubscribe();
  }, [user]);

  return count;
};
