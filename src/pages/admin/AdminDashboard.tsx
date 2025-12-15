import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { database } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { Package, Users, MessageCircle, ShoppingCart, Coins, Settings, Image, Tag, Sparkles, RotateCcw, LogOut, Newspaper, Bell, Gift, FileText, Ticket } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ products: 0, users: 0, chats: 0, sales: 0 });
  const [unreadChats, setUnreadChats] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem('adminAuth')) {
      navigate('/admin-login');
      return;
    }
    onValue(ref(database, 'products'), (s) => setStats(p => ({ ...p, products: s.exists() ? Object.keys(s.val()).length : 0 })));
    onValue(ref(database, 'users'), (s) => setStats(p => ({ ...p, users: s.exists() ? Object.keys(s.val()).length : 0 })));
    
    // Listen to support sessions for unread messages from users
    onValue(ref(database, 'supportSessions'), (snapshot) => {
      if (!snapshot.exists()) return;
      
      const sessions = snapshot.val();
      let unreadCount = 0;
      
      // Count active sessions with unread user messages
      Object.entries(sessions).forEach(([userId, userSessions]: [string, any]) => {
        Object.entries(userSessions).forEach(([sessionId, session]: [string, any]) => {
          if (session.status === 'active') {
            // Check for unread messages
            onValue(ref(database, `supportMessages/${userId}/${sessionId}`), (msgSnap) => {
              if (msgSnap.exists()) {
                const messages = Object.values(msgSnap.val()) as any[];
                const unread = messages.filter(m => m.sender === 'user' && m.status !== 'seen').length;
                if (unread > 0) unreadCount++;
              }
              setUnreadChats(unreadCount);
            }, { onlyOnce: true });
          }
        });
      });
    });
  }, [navigate]);

  const menuItems = [
    { icon: Package, label: 'Produtos', path: '/admin/produtos', color: 'text-blue-400' },
    { icon: Tag, label: 'Categorias', path: '/admin/categorias', color: 'text-green-400' },
    { icon: Sparkles, label: 'Promoções', path: '/admin/promocoes', color: 'text-yellow-400' },
    { icon: Ticket, label: 'Cupons', path: '/admin/cupons', color: 'text-amber-400' },
    { icon: Newspaper, label: 'Novidades', path: '/admin/novidades', color: 'text-teal-400' },
    { icon: RotateCcw, label: 'Roleta', path: '/admin/roleta', color: 'text-purple-400' },
    { icon: Gift, label: 'Resgates', path: '/admin/resgates', color: 'text-emerald-400' },
    { icon: Users, label: 'Usuários', path: '/admin/usuarios', color: 'text-pink-400' },
    { icon: MessageCircle, label: 'Suporte', path: '/admin/chat', color: 'text-cyan-400', badge: unreadChats },
    { icon: Bell, label: 'Broadcasts', path: '/admin/broadcasts', color: 'text-red-400' },
    { icon: Image, label: 'Carrossel', path: '/admin/carrossel', color: 'text-orange-400' },
    { icon: FileText, label: 'Termos', path: '/admin/termos', color: 'text-indigo-400' },
    { icon: Settings, label: 'Configurações', path: '/admin/config', color: 'text-gray-400' },
  ];

  const handleLogout = () => { localStorage.removeItem('adminAuth'); navigate('/'); };

  return (
    <div className="min-h-screen bg-background p-4 safe-top">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Painel Admin</h1>
        <button onClick={handleLogout} className="p-2 text-muted-foreground"><LogOut className="w-5 h-5" /></button>
      </div>
      
      <div className="grid grid-cols-2 gap-3 mb-6">
        {[{ label: 'Produtos', value: stats.products, icon: Package }, { label: 'Usuários', value: stats.users, icon: Users }].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-card p-4 rounded-xl">
            <s.icon className="w-6 h-6 text-primary mb-2" />
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {menuItems.map((item, i) => (
          <motion.button key={item.path} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.05 }}
            onClick={() => navigate(item.path)} className="bg-card p-4 rounded-xl text-left hover:bg-secondary/50 transition-colors relative">
            <item.icon className={`w-6 h-6 ${item.color} mb-2`} />
            <p className="font-medium text-foreground">{item.label}</p>
            {item.badge && item.badge > 0 && (
              <span className="absolute top-2 right-2 w-5 h-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center">
                {item.badge > 9 ? '9+' : item.badge}
              </span>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
