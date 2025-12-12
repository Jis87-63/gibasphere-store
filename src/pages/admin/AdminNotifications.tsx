import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { database } from '@/lib/firebase';
import { ref, onValue, remove } from 'firebase/database';
import { ArrowLeft, Plus, Trash2, X, Loader2, Bell, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { createNotification, Notification } from '@/lib/notifications';

const AdminNotifications: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'system' as Notification['type'],
  });

  useEffect(() => {
    if (!localStorage.getItem('adminAuth')) {
      navigate('/admin-login');
      return;
    }

    onValue(ref(database, 'notifications'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.entries(data).map(([id, value]: [string, any]) => ({ id, ...value }));
        setNotifications(list.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ));
      } else {
        setNotifications([]);
      }
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.message) {
      toast.error('Preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      await createNotification(formData.title, formData.message, formData.type);
      toast.success('Notificação enviada!');
      setFormData({ title: '', message: '', type: 'system' });
      setShowModal(false);
    } catch (error) {
      toast.error('Erro ao enviar notificação');
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta notificação?')) return;
    try {
      await remove(ref(database, `notifications/${id}`));
      toast.success('Notificação excluída!');
    } catch (error) {
      toast.error('Erro ao excluir');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getTypeLabel = (type: Notification['type']) => {
    switch (type) {
      case 'promotion': return 'Promoção';
      case 'news': return 'Novidade';
      case 'credits': return 'Créditos';
      default: return 'Sistema';
    }
  };

  const getTypeColor = (type: Notification['type']) => {
    switch (type) {
      case 'promotion': return 'bg-yellow-500/20 text-yellow-500';
      case 'news': return 'bg-blue-500/20 text-blue-500';
      case 'credits': return 'bg-green-500/20 text-green-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 safe-top">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/admin')} className="p-2 text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Notificações</h1>
      </div>

      <Button onClick={() => setShowModal(true)} className="w-full mb-4">
        <Plus className="w-4 h-4 mr-2" /> Nova Notificação
      </Button>

      <div className="space-y-3">
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-xl p-4"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded ${getTypeColor(notification.type)}`}>
                    {getTypeLabel(notification.type)}
                  </span>
                </div>
                <h3 className="font-medium text-foreground">{notification.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                <p className="text-xs text-muted-foreground mt-2">{formatDate(notification.createdAt)}</p>
              </div>
              <button onClick={() => handleDelete(notification.id)} className="p-2 text-destructive">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}

        {notifications.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p>Nenhuma notificação enviada</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-end justify-center"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-card w-full rounded-t-3xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-foreground">Nova Notificação</h2>
                <button onClick={() => setShowModal(false)} className="p-2 text-muted-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Tipo</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as Notification['type'] }))}
                    className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground"
                  >
                    <option value="system">Sistema</option>
                    <option value="promotion">Promoção</option>
                    <option value="news">Novidade</option>
                    <option value="credits">Créditos</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Título</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Título da notificação"
                  />
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Mensagem</label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Mensagem..."
                    className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground resize-none h-24"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                  Enviar para Todos
                </Button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminNotifications;
