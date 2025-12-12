import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { database, storage } from '@/lib/firebase';
import { ref, onValue, set, remove, push } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ArrowLeft, Plus, Edit2, Trash2, X, Upload, Loader2, Settings, History, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface Prize {
  id: string;
  name: string;
  image: string;
  probability: number;
}

interface SpinHistory {
  id: string;
  userName: string;
  result: string;
  won: boolean;
  date: string;
}

const AdminRoulette: React.FC = () => {
  const navigate = useNavigate();
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [spinHistory, setSpinHistory] = useState<SpinHistory[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [editingPrize, setEditingPrize] = useState<Prize | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [spinCost, setSpinCost] = useState(10);
  const [formData, setFormData] = useState({ name: '', image: '', probability: '' });

  useEffect(() => {
    if (!localStorage.getItem('adminAuth')) {
      navigate('/admin-login');
      return;
    }

    onValue(ref(database, 'roulettePrizes'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setPrizes(Object.entries(data).map(([id, value]: [string, any]) => ({ id, ...value })));
      } else {
        setPrizes([]);
      }
    });

    onValue(ref(database, 'rouletteHistory'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.entries(data).map(([id, value]: [string, any]) => ({ id, ...value }));
        setSpinHistory(list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 50));
      }
    });

    onValue(ref(database, 'settings/rouletteSpinCost'), (snapshot) => {
      if (snapshot.exists()) {
        setSpinCost(snapshot.val());
      }
    });
  }, [navigate]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileRef = storageRef(storage, `roulette/${Date.now()}_${file.name}`);
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
    if (!formData.name || !formData.image || !formData.probability) {
      toast.error('Preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      const prizeData = {
        name: formData.name,
        image: formData.image,
        probability: parseFloat(formData.probability),
      };

      if (editingPrize) {
        await set(ref(database, `roulettePrizes/${editingPrize.id}`), prizeData);
        toast.success('Prêmio atualizado!');
      } else {
        const newRef = push(ref(database, 'roulettePrizes'));
        await set(newRef, prizeData);
        toast.success('Prêmio adicionado!');
      }

      resetForm();
    } catch (error) {
      toast.error('Erro ao salvar prêmio');
    }
    setLoading(false);
  };

  const handleSaveSettings = async () => {
    try {
      await set(ref(database, 'settings/rouletteSpinCost'), spinCost);
      toast.success('Configurações salvas!');
      setShowSettings(false);
    } catch (error) {
      toast.error('Erro ao salvar');
    }
  };

  const handleEdit = (prize: Prize) => {
    setEditingPrize(prize);
    setFormData({ name: prize.name, image: prize.image, probability: prize.probability.toString() });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este prêmio?')) return;
    try {
      await remove(ref(database, `roulettePrizes/${id}`));
      toast.success('Prêmio excluído!');
    } catch (error) {
      toast.error('Erro ao excluir');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', image: '', probability: '' });
    setEditingPrize(null);
    setShowModal(false);
  };

  return (
    <div className="min-h-screen bg-background p-4 safe-top">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/admin')} className="p-2 text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Roleta</h1>
        <div className="ml-auto flex gap-2">
          <button onClick={() => navigate('/admin/premios')} className="p-2 text-muted-foreground" title="Prêmios Ganhos">
            <Gift className="w-5 h-5" />
          </button>
          <button onClick={() => setShowHistory(true)} className="p-2 text-muted-foreground">
            <History className="w-5 h-5" />
          </button>
          <button onClick={() => setShowSettings(true)} className="p-2 text-muted-foreground">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      <Button onClick={() => setShowModal(true)} className="w-full mb-4">
        <Plus className="w-4 h-4 mr-2" /> Adicionar Prêmio
      </Button>

      <div className="grid grid-cols-2 gap-3">
        {prizes.map((prize) => (
          <motion.div
            key={prize.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-xl overflow-hidden"
          >
            <img src={prize.image} alt={prize.name} className="w-full h-24 object-cover" />
            <div className="p-3">
              <h3 className="font-medium text-foreground text-sm truncate">{prize.name}</h3>
              <p className="text-xs text-muted-foreground">{prize.probability}% chance</p>
              <div className="flex gap-2 mt-2">
                <button onClick={() => handleEdit(prize)} className="p-1.5 text-primary">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(prize.id)} className="p-1.5 text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {prizes.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Nenhum prêmio cadastrado
        </div>
      )}

      {/* Prize Modal */}
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
                  {editingPrize ? 'Editar Prêmio' : 'Novo Prêmio'}
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
                    placeholder="Nome do prêmio"
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
                  {formData.image && <img src={formData.image} alt="Preview" className="mt-2 w-full h-24 object-cover rounded-lg" />}
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Probabilidade (%)</label>
                  <Input
                    type="number"
                    value={formData.probability}
                    onChange={(e) => setFormData(prev => ({ ...prev, probability: e.target.value }))}
                    placeholder="10"
                    min="1"
                    max="100"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : editingPrize ? 'Salvar' : 'Adicionar'}
                </Button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
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
                <h2 className="text-lg font-semibold text-foreground">Configurações</h2>
                <button onClick={() => setShowSettings(false)} className="p-2 text-muted-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Custo por giro (créditos)</label>
                  <Input
                    type="number"
                    value={spinCost}
                    onChange={(e) => setSpinCost(parseInt(e.target.value) || 0)}
                    min="1"
                  />
                </div>

                <Button onClick={handleSaveSettings} className="w-full">
                  Salvar Configurações
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History Modal */}
      <AnimatePresence>
        {showHistory && (
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
              className="bg-card w-full max-h-[80vh] rounded-t-3xl p-6 overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-foreground">Histórico de Giros</h2>
                <button onClick={() => setShowHistory(false)} className="p-2 text-muted-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {spinHistory.length > 0 ? (
                <div className="space-y-3">
                  {spinHistory.map((spin) => (
                    <div key={spin.id} className="bg-background/50 rounded-xl p-3">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-foreground">{spin.userName}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${spin.won ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                          {spin.won ? 'Ganhou' : 'Perdeu'}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{spin.result}</p>
                      <p className="text-xs text-muted-foreground">{new Date(spin.date).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum giro registrado
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminRoulette;
