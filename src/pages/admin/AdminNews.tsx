import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { database, storage } from '@/lib/firebase';
import { ref, onValue, set, remove, push } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ArrowLeft, Plus, Edit2, Trash2, X, Upload, Loader2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface NewsItem {
  id: string;
  title: string;
  description: string;
  image: string;
  releaseDate: string;
  createdAt: string;
}

const AdminNews: React.FC = () => {
  const navigate = useNavigate();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingNews, setEditingNews] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image: '',
    releaseDate: '',
  });

  useEffect(() => {
    if (!localStorage.getItem('adminAuth')) {
      navigate('/admin-login');
      return;
    }

    onValue(ref(database, 'news'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.entries(data).map(([id, value]: [string, any]) => ({ id, ...value }));
        setNews(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      } else {
        setNews([]);
      }
    });
  }, [navigate]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileRef = storageRef(storage, `news/${Date.now()}_${file.name}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      setFormData(prev => ({ ...prev, image: url }));
      toast.success('Imagem carregada!');
    } catch (error) {
      toast.error('Erro ao carregar imagem');
    }
    setUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);
    try {
      const newsData = {
        title: formData.title,
        description: formData.description,
        image: formData.image,
        releaseDate: formData.releaseDate,
      };

      if (editingNews) {
        await set(ref(database, `news/${editingNews.id}`), {
          ...newsData,
          createdAt: editingNews.createdAt,
        });
        toast.success('Novidade atualizada!');
      } else {
        const newRef = push(ref(database, 'news'));
        await set(newRef, {
          ...newsData,
          createdAt: new Date().toISOString(),
        });
        toast.success('Novidade adicionada!');
      }

      resetForm();
    } catch (error) {
      toast.error('Erro ao salvar');
    }
    setLoading(false);
  };

  const handleEdit = (item: NewsItem) => {
    setEditingNews(item);
    setFormData({
      title: item.title,
      description: item.description,
      image: item.image,
      releaseDate: item.releaseDate || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta novidade?')) return;
    try {
      await remove(ref(database, `news/${id}`));
      toast.success('Novidade excluída!');
    } catch (error) {
      toast.error('Erro ao excluir');
    }
  };

  const resetForm = () => {
    setFormData({ title: '', description: '', image: '', releaseDate: '' });
    setEditingNews(null);
    setShowModal(false);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('pt-MZ');
  };

  return (
    <div className="min-h-screen bg-background p-4 safe-top">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/admin')} className="p-2 text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Novidades</h1>
      </div>

      <Button onClick={() => setShowModal(true)} className="w-full mb-4">
        <Plus className="w-4 h-4 mr-2" /> Adicionar Novidade
      </Button>

      <div className="space-y-3">
        {news.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-xl overflow-hidden"
          >
            {item.image && (
              <img src={item.image} alt={item.title} className="w-full h-32 object-cover" />
            )}
            <div className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground">{item.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                  {item.releaseDate && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-primary">
                      <Calendar className="w-3 h-3" />
                      Lançamento: {formatDate(item.releaseDate)}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 ml-2">
                  <button onClick={() => handleEdit(item)} className="p-2 text-primary">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="p-2 text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}

        {news.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Nenhuma novidade cadastrada
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
                <h2 className="text-lg font-semibold text-foreground">
                  {editingNews ? 'Editar Novidade' : 'Nova Novidade'}
                </h2>
                <button onClick={resetForm} className="p-2 text-muted-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Título *</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Nome do produto/novidade"
                  />
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Descrição *</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descrição da novidade..."
                    className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground resize-none h-24"
                  />
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Imagem</label>
                  <div className="flex gap-2">
                    <Input
                      value={formData.image}
                      onChange={(e) => setFormData(prev => ({ ...prev, image: e.target.value }))}
                      placeholder="URL da imagem"
                      className="flex-1"
                    />
                    <label className="flex items-center justify-center w-12 h-10 bg-primary text-primary-foreground rounded-md cursor-pointer">
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                  </div>
                  {formData.image && <img src={formData.image} alt="Preview" className="mt-2 w-full h-32 object-cover rounded-lg" />}
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Data de Lançamento</label>
                  <Input
                    type="date"
                    value={formData.releaseDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, releaseDate: e.target.value }))}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : editingNews ? 'Salvar' : 'Adicionar'}
                </Button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminNews;
