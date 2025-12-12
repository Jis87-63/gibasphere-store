import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { database } from '@/lib/firebase';
import { ref, onValue, set, remove, push } from 'firebase/database';
import { ArrowLeft, Plus, Edit2, Trash2, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  realPrice: number;
  image: string;
}

interface Promotion {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  originalPrice: number;
  discount: number;
  endDate: string;
  endTime: string;
  active: boolean;
}

const AdminPromotions: React.FC = () => {
  const navigate = useNavigate();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    productId: '',
    discount: '',
    endDate: '',
    active: true,
  });

  useEffect(() => {
    if (!localStorage.getItem('adminAuth')) {
      navigate('/admin-login');
      return;
    }

    onValue(ref(database, 'promotions'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setPromotions(Object.entries(data).map(([id, value]: [string, any]) => ({ id, ...value })));
      } else {
        setPromotions([]);
      }
    });

    onValue(ref(database, 'products'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setProducts(Object.entries(data).map(([id, value]: [string, any]) => ({ id, ...value })));
      }
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productId || !formData.discount || !formData.endDate) {
      toast.error('Preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      const selectedProduct = products.find(p => p.id === formData.productId);
      const promoData = {
        productId: formData.productId,
        productName: selectedProduct?.name || '',
        productImage: selectedProduct?.image || '',
        originalPrice: selectedProduct?.realPrice || 0,
        discount: parseFloat(formData.discount),
        endDate: formData.endDate,
        endTime: formData.endDate,
        active: formData.active,
      };

      if (editingPromo) {
        await set(ref(database, `promotions/${editingPromo.id}`), promoData);
        toast.success('Promoção atualizada!');
      } else {
        const newRef = push(ref(database, 'promotions'));
        await set(newRef, promoData);
        toast.success('Promoção criada!');
      }

      // Update product promotion status
      await set(ref(database, `products/${formData.productId}/promotion`), true);

      resetForm();
    } catch (error) {
      toast.error('Erro ao salvar promoção');
    }
    setLoading(false);
  };

  const handleEdit = (promo: Promotion) => {
    setEditingPromo(promo);
    setFormData({
      productId: promo.productId,
      discount: promo.discount.toString(),
      endDate: promo.endDate,
      active: promo.active,
    });
    setShowModal(true);
  };

  const handleDelete = async (promo: Promotion) => {
    if (!confirm('Excluir esta promoção?')) return;
    try {
      await remove(ref(database, `promotions/${promo.id}`));
      await set(ref(database, `products/${promo.productId}/promotion`), false);
      toast.success('Promoção excluída!');
    } catch (error) {
      toast.error('Erro ao excluir');
    }
  };

  const resetForm = () => {
    setFormData({ productId: '', discount: '', endDate: '', active: true });
    setEditingPromo(null);
    setShowModal(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const isExpired = (dateString: string) => {
    return new Date(dateString) < new Date();
  };

  return (
    <div className="min-h-screen bg-background p-4 safe-top">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/admin')} className="p-2 text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Promoções</h1>
      </div>

      <Button onClick={() => setShowModal(true)} className="w-full mb-4">
        <Plus className="w-4 h-4 mr-2" /> Nova Promoção
      </Button>

      <div className="space-y-3">
        {promotions.map((promo) => (
          <motion.div
            key={promo.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-card rounded-xl p-4 ${isExpired(promo.endDate) ? 'opacity-50' : ''}`}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium text-foreground">{promo.productName}</h3>
                <p className="text-sm text-primary font-medium">{promo.discount}% de desconto</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Até {formatDate(promo.endDate)}
                  {isExpired(promo.endDate) && <span className="text-destructive ml-2">(Expirada)</span>}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(promo)} className="p-2 text-primary">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(promo)} className="p-2 text-destructive">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}

        {promotions.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Nenhuma promoção ativa
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
                  {editingPromo ? 'Editar Promoção' : 'Nova Promoção'}
                </h2>
                <button onClick={resetForm} className="p-2 text-muted-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Produto</label>
                  <select
                    value={formData.productId}
                    onChange={(e) => setFormData(prev => ({ ...prev, productId: e.target.value }))}
                    className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground"
                  >
                    <option value="">Selecione...</option>
                    {products.map(product => (
                      <option key={product.id} value={product.id}>{product.name} - {product.realPrice} MT</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Desconto (%)</label>
                  <Input
                    type="number"
                    value={formData.discount}
                    onChange={(e) => setFormData(prev => ({ ...prev, discount: e.target.value }))}
                    placeholder="10"
                    min="1"
                    max="99"
                  />
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Data de término</label>
                  <Input
                    type="datetime-local"
                    value={formData.endDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>

                <label className="flex items-center gap-2 text-foreground">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                    className="w-4 h-4 rounded border-input"
                  />
                  Promoção ativa
                </label>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : editingPromo ? 'Salvar' : 'Criar Promoção'}
                </Button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminPromotions;
