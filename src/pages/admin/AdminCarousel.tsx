import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { database, storage } from '@/lib/firebase';
import { ref, onValue, set, remove, push } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ArrowLeft, Plus, Edit2, Trash2, X, Upload, Loader2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface Banner {
  id: string;
  image: string;
  title?: string;
  link?: string;
  order: number;
}

const AdminCarousel: React.FC = () => {
  const navigate = useNavigate();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({ image: '', title: '', link: '', order: 0 });

  useEffect(() => {
    if (!localStorage.getItem('adminAuth')) {
      navigate('/admin-login');
      return;
    }

    onValue(ref(database, 'banners'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.entries(data).map(([id, value]: [string, any]) => ({ id, ...value }));
        setBanners(list.sort((a, b) => (a.order || 0) - (b.order || 0)));
      } else {
        setBanners([]);
      }
    });
  }, [navigate]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileRef = storageRef(storage, `banners/${Date.now()}_${file.name}`);
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
    if (!formData.image) {
      toast.error('Adicione uma imagem');
      return;
    }

    setLoading(true);
    try {
      const bannerData = {
        image: formData.image,
        title: formData.title,
        link: formData.link,
        order: formData.order,
      };

      if (editingBanner) {
        await set(ref(database, `banners/${editingBanner.id}`), bannerData);
        toast.success('Banner atualizado!');
      } else {
        const newRef = push(ref(database, 'banners'));
        await set(newRef, bannerData);
        toast.success('Banner adicionado!');
      }

      resetForm();
    } catch (error) {
      toast.error('Erro ao salvar banner');
    }
    setLoading(false);
  };

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setFormData({ image: banner.image, title: banner.title || '', link: banner.link || '', order: banner.order || 0 });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este banner?')) return;
    try {
      await remove(ref(database, `banners/${id}`));
      toast.success('Banner excluído!');
    } catch (error) {
      toast.error('Erro ao excluir');
    }
  };

  const resetForm = () => {
    setFormData({ image: '', title: '', link: '', order: 0 });
    setEditingBanner(null);
    setShowModal(false);
  };

  return (
    <div className="min-h-screen bg-background p-4 safe-top">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/admin')} className="p-2 text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Carrossel</h1>
      </div>

      <Button onClick={() => setShowModal(true)} className="w-full mb-4">
        <Plus className="w-4 h-4 mr-2" /> Adicionar Banner
      </Button>

      <div className="space-y-3">
        {banners.map((banner) => (
          <motion.div
            key={banner.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-xl overflow-hidden"
          >
            <img src={banner.image} alt={banner.title} className="w-full h-32 object-cover" />
            <div className="p-3 flex items-center gap-3">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
              <span className="flex-1 text-sm text-foreground">{banner.title || 'Sem título'}</span>
              <button onClick={() => handleEdit(banner)} className="p-2 text-primary">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={() => handleDelete(banner.id)} className="p-2 text-destructive">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}

        {banners.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Nenhum banner cadastrado
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
                <h2 className="text-lg font-semibold text-foreground">
                  {editingBanner ? 'Editar Banner' : 'Novo Banner'}
                </h2>
                <button onClick={resetForm} className="p-2 text-muted-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Imagem *</label>
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
                  <label className="text-sm text-muted-foreground mb-1 block">Título</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Título do banner"
                  />
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Link (opcional)</label>
                  <Input
                    value={formData.link}
                    onChange={(e) => setFormData(prev => ({ ...prev, link: e.target.value }))}
                    placeholder="/promocoes"
                  />
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Ordem</label>
                  <Input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : editingBanner ? 'Salvar' : 'Adicionar'}
                </Button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminCarousel;
