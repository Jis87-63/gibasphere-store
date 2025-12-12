import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { database } from '@/lib/firebase';
import { ref, onValue, set, remove, push } from 'firebase/database';
import { ArrowLeft, Plus, Edit2, Trash2, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface Category {
  id: string;
  name: string;
  icon: string;
  order: number;
}

const EMOJI_OPTIONS = ['🎬', '🎵', '📚', '🎮', '💻', '📱', '🏠', '🍔', '👗', '⚽', '✈️', '💄', '🎓', '💼', '🔧', '🎨'];

const AdminCategories: React.FC = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', icon: '🎬', order: 0 });

  useEffect(() => {
    if (!localStorage.getItem('adminAuth')) {
      navigate('/admin-login');
      return;
    }

    onValue(ref(database, 'categories'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.entries(data).map(([id, value]: [string, any]) => ({ id, ...value }));
        setCategories(list.sort((a, b) => (a.order || 0) - (b.order || 0)));
      } else {
        setCategories([]);
      }
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('Digite o nome da categoria');
      return;
    }

    setLoading(true);
    try {
      const categoryData = {
        name: formData.name,
        icon: formData.icon,
        order: formData.order,
      };

      if (editingCategory) {
        await set(ref(database, `categories/${editingCategory.id}`), categoryData);
        toast.success('Categoria atualizada!');
      } else {
        const newRef = push(ref(database, 'categories'));
        await set(newRef, categoryData);
        toast.success('Categoria adicionada!');
      }

      resetForm();
    } catch (error) {
      toast.error('Erro ao salvar categoria');
    }
    setLoading(false);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({ name: category.name, icon: category.icon, order: category.order || 0 });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta categoria?')) return;
    try {
      await remove(ref(database, `categories/${id}`));
      toast.success('Categoria excluída!');
    } catch (error) {
      toast.error('Erro ao excluir categoria');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', icon: '🎬', order: 0 });
    setEditingCategory(null);
    setShowModal(false);
  };

  return (
    <div className="min-h-screen bg-background p-4 safe-top">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/admin')} className="p-2 text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Categorias</h1>
      </div>

      <Button onClick={() => setShowModal(true)} className="w-full mb-4">
        <Plus className="w-4 h-4 mr-2" /> Adicionar Categoria
      </Button>

      <div className="space-y-3">
        {categories.map((category) => (
          <motion.div
            key={category.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-xl p-4 flex items-center gap-3"
          >
            <span className="text-3xl">{category.icon}</span>
            <span className="flex-1 font-medium text-foreground">{category.name}</span>
            <button onClick={() => handleEdit(category)} className="p-2 text-primary hover:bg-primary/10 rounded-lg">
              <Edit2 className="w-4 h-4" />
            </button>
            <button onClick={() => handleDelete(category.id)} className="p-2 text-destructive hover:bg-destructive/10 rounded-lg">
              <Trash2 className="w-4 h-4" />
            </button>
          </motion.div>
        ))}

        {categories.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Nenhuma categoria cadastrada
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
                  {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
                </h2>
                <button onClick={resetForm} className="p-2 text-muted-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Nome</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nome da categoria"
                  />
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Ícone</label>
                  <div className="grid grid-cols-8 gap-2">
                    {EMOJI_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, icon: emoji }))}
                        className={`text-2xl p-2 rounded-lg ${formData.icon === emoji ? 'bg-primary/20 ring-2 ring-primary' : 'bg-background'}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Ordem</label>
                  <Input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
                    placeholder="0"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : editingCategory ? 'Salvar' : 'Adicionar'}
                </Button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminCategories;
