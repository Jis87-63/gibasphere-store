import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { database } from '@/lib/firebase';
import { ref, onValue, set, remove, push } from 'firebase/database';
import { ArrowLeft, Plus, Edit2, Trash2, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface TermPolicy {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

const AdminTermsPolicies: React.FC = () => {
  const navigate = useNavigate();
  const [terms, setTerms] = useState<TermPolicy[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTerm, setEditingTerm] = useState<TermPolicy | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ title: '', content: '' });

  useEffect(() => {
    if (!localStorage.getItem('adminAuth')) {
      navigate('/admin-login');
      return;
    }

    onValue(ref(database, 'termsPolicies'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setTerms(Object.entries(data).map(([id, value]: [string, any]) => ({ id, ...value })));
      } else {
        setTerms([]);
      }
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.content) {
      toast.error('Preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      const termData = {
        title: formData.title,
        content: formData.content,
        createdAt: editingTerm?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (editingTerm) {
        await set(ref(database, `termsPolicies/${editingTerm.id}`), termData);
        toast.success('Termo atualizado!');
      } else {
        const newRef = push(ref(database, 'termsPolicies'));
        await set(newRef, termData);
        toast.success('Termo adicionado!');
      }

      resetForm();
    } catch (error) {
      toast.error('Erro ao salvar');
    }
    setLoading(false);
  };

  const handleEdit = (term: TermPolicy) => {
    setEditingTerm(term);
    setFormData({ title: term.title, content: term.content });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este termo?')) return;
    try {
      await remove(ref(database, `termsPolicies/${id}`));
      toast.success('Termo excluído!');
    } catch (error) {
      toast.error('Erro ao excluir');
    }
  };

  const resetForm = () => {
    setFormData({ title: '', content: '' });
    setEditingTerm(null);
    setShowModal(false);
  };

  return (
    <div className="min-h-screen bg-background p-4 safe-top">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/admin')} className="p-2 text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Termos & Políticas</h1>
      </div>

      <Button onClick={() => setShowModal(true)} className="w-full mb-4">
        <Plus className="w-4 h-4 mr-2" /> Adicionar Termo
      </Button>

      <div className="space-y-3">
        {terms.map((term) => (
          <motion.div
            key={term.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-xl p-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-foreground">{term.title}</h3>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {term.content}
                </p>
              </div>
              <div className="flex gap-2 ml-2">
                <button onClick={() => handleEdit(term)} className="p-1.5 text-primary">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(term.id)} className="p-1.5 text-destructive">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {terms.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Nenhum termo cadastrado
        </div>
      )}

      {/* Modal */}
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
                  {editingTerm ? 'Editar Termo' : 'Novo Termo'}
                </h2>
                <button onClick={resetForm} className="p-2 text-muted-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Título</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Título do termo"
                  />
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Conteúdo</label>
                  <Textarea
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Conteúdo do termo..."
                    rows={10}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : editingTerm ? 'Salvar' : 'Adicionar'}
                </Button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminTermsPolicies;
