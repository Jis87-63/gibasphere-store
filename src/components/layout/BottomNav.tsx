import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Tag, CircleDot, MessageCircle, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { database } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { useAuth } from '@/contexts/AuthContext';

const navItems = [
  { path: '/home', icon: Home, label: 'Home' },
  { path: '/promocoes', icon: Tag, label: 'Promoções' },
  { path: '/roleta', icon: CircleDot, label: 'Roleta' },
  { path: '/novidades', icon: Sparkles, label: 'Novidades' },
  { path: '/suporte', icon: MessageCircle, label: 'Chat' },
];

export const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [promotionsCount, setPromotionsCount] = useState(0);
  const [newsCount, setNewsCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (!user) return;

    // Listen to promotions
    const promotionsRef = ref(database, 'promotions');
    const readPromotionsRef = ref(database, `userPromotionsRead/${user.uid}`);
    
    let promotions: string[] = [];
    let readPromotions: string[] = [];

    const unsubPromotions = onValue(promotionsRef, (snapshot) => {
      if (snapshot.exists()) {
        promotions = Object.keys(snapshot.val());
        const unread = promotions.filter(id => !readPromotions.includes(id)).length;
        setPromotionsCount(unread);
      }
    });

    const unsubReadPromotions = onValue(readPromotionsRef, (snapshot) => {
      if (snapshot.exists()) {
        readPromotions = Object.keys(snapshot.val());
        const unread = promotions.filter(id => !readPromotions.includes(id)).length;
        setPromotionsCount(unread);
      }
    });

    // Listen to news
    const newsRef = ref(database, 'news');
    const readNewsRef = ref(database, `userNewsRead/${user.uid}`);
    
    let news: string[] = [];
    let readNews: string[] = [];

    const unsubNews = onValue(newsRef, (snapshot) => {
      if (snapshot.exists()) {
        news = Object.keys(snapshot.val());
        const unread = news.filter(id => !readNews.includes(id)).length;
        setNewsCount(unread);
      }
    });

    const unsubReadNews = onValue(readNewsRef, (snapshot) => {
      if (snapshot.exists()) {
        readNews = Object.keys(snapshot.val());
        const unread = news.filter(id => !readNews.includes(id)).length;
        setNewsCount(unread);
      }
    });

    // Listen to unread admin messages
    const sessionsRef = ref(database, `supportSessions/${user.uid}`);
    const unsubSessions = onValue(sessionsRef, (snapshot) => {
      if (snapshot.exists()) {
        const sessions = snapshot.val();
        let totalUnread = 0;

        Object.keys(sessions).forEach((sessionId) => {
          // Listen to messages in each session
          const messagesRef = ref(database, `supportMessages/${user.uid}/${sessionId}`);
          onValue(messagesRef, (msgSnapshot) => {
            if (msgSnapshot.exists()) {
              const messages = msgSnapshot.val();
              const unreadCount = Object.values(messages).filter(
                (msg: any) => msg.sender === 'admin' && !msg.readByUser
              ).length;
              totalUnread = unreadCount;
              setUnreadMessages(totalUnread);
            }
          });
        });
      }
    });

    return () => {
      unsubPromotions();
      unsubReadPromotions();
      unsubNews();
      unsubReadNews();
      unsubSessions();
    };
  }, [user]);

  const getBadgeCount = (path: string) => {
    if (path === '/promocoes') return promotionsCount;
    if (path === '/novidades') return newsCount;
    if (path === '/suporte') return unreadMessages;
    return 0;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border safe-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          const badgeCount = getBadgeCount(item.path);
          const showBadge = badgeCount > 0;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-all duration-200",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 -m-2 rounded-xl bg-primary/10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <Icon className="w-5 h-5 relative z-10" />
                {showBadge && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center z-20">
                    {badgeCount > 9 ? '9+' : badgeCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
