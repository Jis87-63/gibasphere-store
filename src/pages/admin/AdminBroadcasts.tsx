import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { database, storage } from '@/lib/firebase';
import { ref, onValue, set, remove, push } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ArrowLeft, Plus, Trash2, X, Loader2, Bell, Send, Upload, Image, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface Broadcast {
  id: string;
  title: string;
  message: string;
  imageUrl?: string;
  audioUrl?: string;
  createdAt: string;
}

const AdminBroadcasts: React.FC = () => {
  const navigate = useNavigate();
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    imageUrl: '',
    audioUrl: '',
  });

  useEffect(() => {
    if (!localStorage.getItem('adminAuth')) {
      navigate('/admin-login');
      return;
    }

    onValue(ref(database, 'broadcasts'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.entries(data).map(([id, value]: [string, any]) => ({ id, ...value }));
        setBroadcasts(list.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ));
      } else {
        setBroadcasts([]);
      }
    });
  }, [navigate]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const fileRef = storageRef(storage, `broadcasts/${Date.now()}_${file.name}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      setFormData(prev => ({ ...prev, imageUrl: url }));
      toast.success('Imagem carregada!');
    } catch (error) {
      toast.error('Erro ao carregar imagem');
    }
    setUploadingImage(false);
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAudio(true);
    try {
      const fileRef = storageRef(storage, `broadcasts/${Date.now()}_${file.name}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      setFormData(prev => ({ ...prev, audioUrl: url }));
      toast.success('Áudio carregado!');
    } catch (error) {
      toast.error('Erro ao carregar áudio');
    }
    setUploadingAudio(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.message) {
      toast.error('Preencha título e mensagem');
      return;
    }

    setLoading(true);
    try {
      const broadcastRef = push(ref(database, 'broadcasts'));
      await set(broadcastRef, {
        title: formData.title,
        message: formData.message,
        imageUrl: formData.imageUrl || null,
        audioUrl: formData.audioUrl || null,
        createdAt: new Date().toISOString(),
      });
      toast.success('Mensagem enviada para todos!');
      setFormData({ title: '', message: '', imageUrl: '', audioUrl: '' });
      setShowModal(false);
    } catch (error) {
      toast.error('Erro ao enviar mensagem');
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta mensagem?')) return;
    try {
      await remove(ref(database, `broadcasts/${id}`));
      toast.success('Mensagem excluída!');
    } catch (error) {
      toast.error('Erro ao excluir');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-MZ');
  };

  return (
    <div className="min-h-screen bg-background p-4 safe-top">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/admin')} className="p-2 text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Mensagens Broadcast</h1>
      </div>

      <Button onClick={() => setShowModal(true)} className="w-full mb-4">
        <Plus className="w-4 h-4 mr-2" /> Nova Mensagem
      </Button>

      <div className="space-y-3">
        {broadcasts.map((broadcast) => (
          <motion.div
            key={broadcast.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-xl overflow-hidden"
          >
            {broadcast.imageUrl && (
              <img src={broadcast.imageUrl} alt="Broadcast" className="w-full h-32 object-cover" />
            )}
            <div className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground">{broadcast.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{broadcast.message}</p>
                  {broadcast.audioUrl && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-primary">
                      <Volume2 className="w-3 h-3" />
                      Contém áudio
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">{formatDate(broadcast.createdAt)}</p>
                </div>
                <button onClick={() => handleDelete(broadcast.id)} className="p-2 text-destructive">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}

        {broadcasts.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p>Nenhuma mensagem enviada</p>
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
              className="bg-card w-full max-h-[90vh] rounded-t-3xl p-6 overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-foreground">Nova Mensagem</h2>
                <button onClick={() => setShowModal(false)} className="p-2 text-muted-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Título *</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Título da mensagem"
                  />
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Mensagem *</label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Mensagem..."
                    className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground resize-none h-24"
                  />
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Imagem (opcional)</label>
                  <div className="flex gap-2">
                    <Input
                      value={formData.imageUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
                      placeholder="URL da imagem"
                      className="flex-1"
                    />
                    <label className="flex items-center justify-center w-12 h-10 bg-primary text-primary-foreground rounded-md cursor-pointer">
                      {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4" />}
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                  </div>
                  {formData.imageUrl && <img src={formData.imageUrl} alt="Preview" className="mt-2 w-full h-32 object-cover rounded-lg" />}
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Áudio (opcional)</label>
                  <div className="flex gap-2">
                    <Input
                      value={formData.audioUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, audioUrl: e.target.value }))}
                      placeholder="URL do áudio"
                      className="flex-1"
                    />
                    <label className="flex items-center justify-center w-12 h-10 bg-primary text-primary-foreground rounded-md cursor-pointer">
                      {uploadingAudio ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
                      <input type="file" accept="audio/*" onChange={handleAudioUpload} className="hidden" />
                    </label>
                  </div>
                  {formData.audioUrl && (
                    <audio controls className="mt-2 w-full">
                      <source src={formData.audioUrl} type="audio/mpeg" />
                    </audio>
                  )}
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

export default AdminBroadcasts;
