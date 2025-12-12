import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { PageContainer } from '@/components/layout/PageContainer';
import { BottomNav } from '@/components/layout/BottomNav';
import { database } from '@/lib/firebase';
import { ref, onValue, set } from 'firebase/database';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, Image, Volume2, FileText } from 'lucide-react';

interface Broadcast {
  id: string;
  title: string;
  message: string;
  type: 'system' | 'promotion' | 'news' | 'credits';
  imageUrl?: string;
  audioUrl?: string;
  createdAt: string;
}

const Broadcasts: React.FC = () => {
  const { user } = useAuth();
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [readBroadcasts, setReadBroadcasts] = useState<string[]>([]);

  useEffect(() => {
    // Load broadcasts
    const broadcastsRef = ref(database, 'broadcasts');
    onValue(broadcastsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.entries(data).map(([id, value]: [string, any]) => ({ id, ...value }));
        setBroadcasts(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      } else {
        setBroadcasts([]);
      }
    });

    // Load read status for user
    if (user) {
      const readRef = ref(database, `userBroadcastsRead/${user.uid}`);
      onValue(readRef, (snapshot) => {
        if (snapshot.exists()) {
          setReadBroadcasts(Object.keys(snapshot.val()));
        }
      });
    }
  }, [user]);

  const markAsRead = async (broadcastId: string) => {
    if (!user) return;
    await set(ref(database, `userBroadcastsRead/${user.uid}/${broadcastId}`), true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-MZ', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const Header = (
    <div className="px-4 py-3 flex items-center gap-3">
      <Bell className="w-5 h-5 text-primary" />
      <h1 className="text-xl font-semibold text-foreground">Mensagens</h1>
    </div>
  );

  return (
    <>
      <PageContainer header={Header}>
        {broadcasts.length > 0 ? (
          <div className="space-y-3">
            {broadcasts.map((broadcast, index) => {
              const isUnread = !readBroadcasts.includes(broadcast.id);
              return (
                <motion.div
                  key={broadcast.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => markAsRead(broadcast.id)}
                  className={`bg-card rounded-xl overflow-hidden ${isUnread ? 'ring-2 ring-primary' : ''}`}
                >
                  {broadcast.imageUrl && (
                    <img
                      src={broadcast.imageUrl}
                      alt={broadcast.title}
                      className="w-full h-40 object-cover"
                    />
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-foreground">{broadcast.title}</h3>
                      {isUnread && (
                        <span className="flex-shrink-0 w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">{broadcast.message}</p>
                    
                    {broadcast.audioUrl && (
                      <div className="mt-3">
                        <audio controls className="w-full h-10">
                          <source src={broadcast.audioUrl} type="audio/mpeg" />
                        </audio>
                      </div>
                    )}
                    
                    <p className="text-xs text-muted-foreground mt-3">{formatDate(broadcast.createdAt)}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-20" />
            <p className="text-muted-foreground">Nenhuma mensagem</p>
          </div>
        )}
      </PageContainer>
      <BottomNav />
    </>
  );
};

export default Broadcasts;
